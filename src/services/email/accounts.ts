import { EmailClient } from "./email-client";

class EmailAccountRegistry {
  private providers = new Map<string, EmailClient>();
  private initialized = false;

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    for (const key of Object.keys(process.env)) {
      const match = key.match(/^EMAIL_([A-Z0-9_]+)_TYPE$/);
      if (!match?.[1]) continue;

      const name = match[1];
      const prefix = `EMAIL_${name}`;
      if (process.env[`${prefix}_TYPE`] !== "imap") continue;

      const address = process.env[`${prefix}_ADDRESS`];
      const host = process.env[`${prefix}_IMAP_HOST`];
      const port = Number(process.env[`${prefix}_IMAP_PORT`] ?? "993");
      const user = process.env[`${prefix}_USER`];
      const pass = process.env[`${prefix}_PASS`];
      const smtpHost = process.env[`${prefix}_SMTP_HOST`];
      const smtpPort = Number(process.env[`${prefix}_SMTP_PORT`] ?? "587");

      if (!address || !host || !user || !pass || !smtpHost) continue;

      this.providers.set(
        name.toLowerCase(),
        new EmailClient(name.toLowerCase(), address, { host, port, user, pass, smtpHost, smtpPort }),
      );
    }
  }

  getProvider(name: string): EmailClient | undefined {
    this.init();
    return this.providers.get(name.toLowerCase());
  }

  listAccounts() {
    this.init();
    return [...this.providers.values()].map((p) => ({ name: p.name, address: p.address }));
  }

  getDefault(): EmailClient | undefined {
    this.init();
    return this.providers.values().next().value;
  }
}

export const emailAccounts = new EmailAccountRegistry();
