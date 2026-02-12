export interface EmailAddress {
  name: string | null;
  address: string;
}

export interface EmailMessage {
  id: string;
  threadId: string | null;
  from: EmailAddress | null;
  to: EmailAddress[];
  cc: EmailAddress[];
  subject: string | null;
  snippet: string | null;
  body: string | null;
  date: Date | null;
  isUnread: boolean;
  hasAttachments: boolean;
  labels: string[];
}

export interface EmailDraft {
  to: EmailAddress[];
  cc: EmailAddress[];
  subject: string;
  body: string;
  inReplyTo: string | null;
}

export interface EmailSearchQuery {
  from: string | null;
  to: string | null;
  subject: string | null;
  after: string | null;
  before: string | null;
  unreadOnly: boolean;
  query: string | null;
}

export interface ListEmailsOptions {
  maxResults: number;
  unreadOnly: boolean;
}
