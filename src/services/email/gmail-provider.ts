import { google } from "googleapis";
import type { OAuth2Client } from "googleapis-common";
import { EmailProvider } from "./email-provider";
import type { EmailAddress, EmailDraft, EmailMessage, EmailSearchQuery, ListEmailsOptions } from "./types";

export class GmailProvider extends EmailProvider {
  readonly name: string;
  readonly address: string;
  private readonly gmail;

  constructor(name: string, address: string, auth: OAuth2Client) {
    super();
    this.name = name;
    this.address = address;
    this.gmail = google.gmail({ version: "v1", auth });
  }

  async listEmails(options?: Partial<ListEmailsOptions>): Promise<EmailMessage[]> {
    const maxResults = options?.maxResults ?? 20;
    const q = options?.unreadOnly ? "is:unread" : undefined;

    const res = await this.gmail.users.messages.list({ userId: "me", maxResults, q });
    const messages = res.data.messages ?? [];
    return Promise.all(messages.filter((m) => m.id).map((m) => this.getEmail(m.id as string)));
  }

  async searchEmails(query: EmailSearchQuery, maxResults = 20): Promise<EmailMessage[]> {
    const q = buildGmailQuery(query);
    const res = await this.gmail.users.messages.list({ userId: "me", maxResults, q: q || undefined });
    const messages = res.data.messages ?? [];
    return Promise.all(messages.filter((m) => m.id).map((m) => this.getEmail(m.id as string)));
  }

  async getEmail(messageId: string): Promise<EmailMessage> {
    const res = await this.gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
    const msg = res.data;
    const headers = msg.payload?.headers ?? [];

    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? null;

    const dateHeader = getHeader("Date");

    return {
      id: msg.id ?? messageId,
      threadId: msg.threadId ?? null,
      from: parseEmailAddress(getHeader("From")),
      to: parseEmailAddressList(getHeader("To")),
      cc: parseEmailAddressList(getHeader("Cc")),
      subject: getHeader("Subject"),
      snippet: msg.snippet ?? null,
      body: extractBody(msg.payload),
      date: dateHeader ? new Date(dateHeader) : null,
      isUnread: msg.labelIds?.includes("UNREAD") ?? false,
      hasAttachments: hasAttachments(msg.payload),
      labels: msg.labelIds ?? [],
    };
  }

  async sendEmail(draft: EmailDraft): Promise<{ messageId: string }> {
    const raw = buildRawMessage(this.address, draft);
    const res = await this.gmail.users.messages.send({
      userId: "me",
      requestBody: { raw, threadId: draft.inReplyTo ?? undefined },
    });
    return { messageId: res.data.id ?? "unknown" };
  }
}

function buildGmailQuery(query: EmailSearchQuery): string {
  const parts: string[] = [];
  if (query.from) parts.push(`from:${query.from}`);
  if (query.to) parts.push(`to:${query.to}`);
  if (query.subject) parts.push(`subject:${query.subject}`);
  if (query.after) parts.push(`after:${query.after}`);
  if (query.before) parts.push(`before:${query.before}`);
  if (query.unreadOnly) parts.push("is:unread");
  if (query.query) parts.push(query.query);
  return parts.join(" ");
}

function parseEmailAddress(raw: string | null): EmailAddress | null {
  if (!raw) return null;
  const match = raw.match(/^(?:"?(.+?)"?\s)?<?([^<>]+@[^<>]+)>?$/);
  if (!match) return { name: null, address: raw.trim() };
  return { name: match[1]?.trim() ?? null, address: match[2]?.trim() ?? raw.trim() };
}

function parseEmailAddressList(raw: string | null): EmailAddress[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => parseEmailAddress(s.trim()))
    .filter((a): a is EmailAddress => a !== null);
}

// biome-ignore lint/suspicious/noExplicitAny: Gmail API payload typing is complex
function extractBody(payload: any): string | null {
  if (!payload) return null;

  if (payload.mimeType === "text/plain" && payload.body?.data)
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");

  if (payload.parts) {
    const textPart = payload.parts.find((p: { mimeType: string }) => p.mimeType === "text/plain");
    if (textPart?.body?.data) return Buffer.from(textPart.body.data, "base64url").toString("utf-8");

    const htmlPart = payload.parts.find((p: { mimeType: string }) => p.mimeType === "text/html");
    if (htmlPart?.body?.data) return Buffer.from(htmlPart.body.data, "base64url").toString("utf-8");

    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  if (payload.body?.data) return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  return null;
}

// biome-ignore lint/suspicious/noExplicitAny: Gmail API payload typing is complex
function hasAttachments(payload: any): boolean {
  if (!payload) return false;
  if (payload.filename && payload.filename.length > 0 && payload.body?.attachmentId) return true;
  if (payload.parts) return payload.parts.some((p: unknown) => hasAttachments(p));
  return false;
}

function buildRawMessage(from: string, draft: EmailDraft): string {
  const to = draft.to.map((a) => (a.name ? `"${a.name}" <${a.address}>` : a.address)).join(", ");
  const cc = draft.cc.map((a) => (a.name ? `"${a.name}" <${a.address}>` : a.address)).join(", ");

  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    `Subject: ${draft.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    draft.body,
  ];

  if (draft.inReplyTo) lines.splice(3, 0, `In-Reply-To: ${draft.inReplyTo}`, `References: ${draft.inReplyTo}`);

  return Buffer.from(lines.join("\r\n")).toString("base64url");
}
