import { env } from "env";
import { google as googleapis } from "googleapis";
import type { EmailProvider } from "./email-provider";
import { GmailProvider } from "./gmail-provider";
import { ImapProvider } from "./imap-provider";

interface AccountInfo {
  name: string;
  address: string;
  type: string;
}

class EmailAccountRegistry {
  private providers = new Map<string, EmailProvider>();
  private initialized = false;

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    this.registerGmail();
    this.registerImapAccounts();
  }

  private registerGmail() {
    try {
      const auth = new googleapis.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
      auth.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });

      const address = process.env.GMAIL_ADDRESS ?? "me";
      const provider = new GmailProvider("gmail", address, auth);
      this.providers.set("gmail", provider);
    } catch {
      // Gmail not configured, skip
    }
  }

  private registerImapAccounts() {
    const accountNames = new Set<string>();

    for (const key of Object.keys(process.env)) {
      const match = key.match(/^EMAIL_([A-Z0-9_]+)_TYPE$/);
      if (match?.[1]) accountNames.add(match[1]);
    }

    for (const name of accountNames) {
      const prefix = `EMAIL_${name}`;
      const type = process.env[`${prefix}_TYPE`];
      if (type !== "imap") continue;

      const address = process.env[`${prefix}_ADDRESS`];
      const host = process.env[`${prefix}_IMAP_HOST`];
      const port = Number(process.env[`${prefix}_IMAP_PORT`] ?? "993");
      const user = process.env[`${prefix}_USER`];
      const pass = process.env[`${prefix}_PASS`];
      const smtpHost = process.env[`${prefix}_SMTP_HOST`];
      const smtpPort = Number(process.env[`${prefix}_SMTP_PORT`] ?? "587");

      if (!address || !host || !user || !pass || !smtpHost) continue;

      const provider = new ImapProvider(name.toLowerCase(), address, { host, port, user, pass, smtpHost, smtpPort });
      this.providers.set(name.toLowerCase(), provider);
    }
  }

  getProvider(name: string): EmailProvider | undefined {
    this.init();
    return this.providers.get(name.toLowerCase());
  }

  listAccounts(): AccountInfo[] {
    this.init();
    return [...this.providers.values()].map((p) => ({
      name: p.name,
      address: p.address,
      type: p instanceof GmailProvider ? "gmail" : "imap",
    }));
  }

  getDefault(): EmailProvider | undefined {
    this.init();
    return this.providers.values().next().value;
  }
}

export const emailAccounts = new EmailAccountRegistry();
