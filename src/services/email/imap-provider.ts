import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { EmailProvider } from "./email-provider";
import type { EmailDraft, EmailMessage, EmailSearchQuery, ListEmailsOptions } from "./types";

interface ImapConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  smtpHost: string;
  smtpPort: number;
}

export class ImapProvider extends EmailProvider {
  readonly name: string;
  readonly address: string;
  private readonly config: ImapConfig;

  constructor(name: string, address: string, config: ImapConfig) {
    super();
    this.name = name;
    this.address = address;
    this.config = config;
  }

  async listEmails(options?: Partial<ListEmailsOptions>): Promise<EmailMessage[]> {
    const maxResults = options?.maxResults ?? 20;
    const client = await this.connect();
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const messages: EmailMessage[] = [];
        const searchCriteria = options?.unreadOnly ? { seen: false } : { all: true };
        const result = await client.search(searchCriteria, { uid: true });
        const uids = Array.isArray(result) ? result : [];
        const selected = uids.slice(-maxResults).reverse();
        if (selected.length === 0) return [];

        for await (const msg of client.fetch(
          selected,
          { envelope: true, bodyStructure: true, flags: true, uid: true },
          { uid: true },
        )) {
          messages.push(envelopeToMessage(msg));
        }
        return messages;
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }

  async searchEmails(query: EmailSearchQuery, maxResults = 20): Promise<EmailMessage[]> {
    const client = await this.connect();
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const criteria = buildImapSearch(query);
        const result = await client.search(criteria, { uid: true });
        const uids = Array.isArray(result) ? result : [];
        const selected = uids.slice(-maxResults).reverse();
        if (selected.length === 0) return [];

        const messages: EmailMessage[] = [];
        for await (const msg of client.fetch(
          selected,
          { envelope: true, bodyStructure: true, flags: true, uid: true },
          { uid: true },
        )) {
          messages.push(envelopeToMessage(msg));
        }
        return messages;
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }

  async getEmail(messageId: string): Promise<EmailMessage> {
    const uid = Number(messageId);
    const client = await this.connect();
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const fetchResult = await client.fetchOne(
          uid,
          { envelope: true, source: true, bodyStructure: true, flags: true, uid: true },
          { uid: true },
        );
        if (!fetchResult) throw new Error(`Email not found: ${messageId}`);
        const base = envelopeToMessage(fetchResult);
        if (fetchResult.source) base.body = fetchResult.source.toString("utf-8");
        return base;
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }

  async sendEmail(draft: EmailDraft): Promise<{ messageId: string }> {
    const transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpPort === 465,
      auth: { user: this.config.user, pass: this.config.pass },
    });

    const to = draft.to.map((a) => (a.name ? `"${a.name}" <${a.address}>` : a.address)).join(", ");
    const cc = draft.cc.map((a) => (a.name ? `"${a.name}" <${a.address}>` : a.address)).join(", ");

    const info = await transporter.sendMail({
      from: this.address,
      to,
      cc: cc || undefined,
      subject: draft.subject,
      text: draft.body,
      inReplyTo: draft.inReplyTo ?? undefined,
      references: draft.inReplyTo ?? undefined,
    });

    return { messageId: info.messageId };
  }

  private async connect(): Promise<ImapFlow> {
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: true,
      auth: { user: this.config.user, pass: this.config.pass },
      logger: false,
    });
    await client.connect();
    return client;
  }
}

// biome-ignore lint/suspicious/noExplicitAny: imapflow types are loosely typed
function envelopeToMessage(msg: any): EmailMessage {
  const env = msg.envelope;
  return {
    id: String(msg.uid),
    threadId: env?.messageId ?? null,
    from: env?.from?.[0]
      ? { name: env.from[0].name ?? null, address: `${env.from[0].mailbox}@${env.from[0].host}` }
      : null,
    to: (env?.to ?? []).map((a: { name?: string; mailbox: string; host: string }) => ({
      name: a.name ?? null,
      address: `${a.mailbox}@${a.host}`,
    })),
    cc: (env?.cc ?? []).map((a: { name?: string; mailbox: string; host: string }) => ({
      name: a.name ?? null,
      address: `${a.mailbox}@${a.host}`,
    })),
    subject: env?.subject ?? null,
    snippet: null,
    body: null,
    date: env?.date ? new Date(env.date) : null,
    isUnread: !msg.flags?.has("\\Seen"),
    hasAttachments:
      msg.bodyStructure?.childNodes?.some((n: { disposition?: string }) => n.disposition === "attachment") ?? false,
    labels: [...(msg.flags ?? [])],
  };
}

function buildImapSearch(query: EmailSearchQuery): Record<string, unknown> {
  const criteria: Record<string, unknown> = {};
  if (query.from) criteria.from = query.from;
  if (query.to) criteria.to = query.to;
  if (query.subject) criteria.subject = query.subject;
  if (query.after) criteria.since = new Date(query.after);
  if (query.before) criteria.before = new Date(query.before);
  if (query.unreadOnly) criteria.seen = false;
  if (query.query) criteria.body = query.query;
  if (Object.keys(criteria).length === 0) criteria.all = true;
  return criteria;
}
