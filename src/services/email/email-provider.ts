import type { EmailDraft, EmailMessage, EmailSearchQuery, ListEmailsOptions } from "./types";

export abstract class EmailProvider {
  abstract readonly name: string;
  abstract readonly address: string;

  abstract listEmails(options?: Partial<ListEmailsOptions>): Promise<EmailMessage[]>;
  abstract searchEmails(query: EmailSearchQuery, maxResults?: number): Promise<EmailMessage[]>;
  abstract getEmail(messageId: string): Promise<EmailMessage>;
  abstract sendEmail(draft: EmailDraft): Promise<{ messageId: string }>;
}
