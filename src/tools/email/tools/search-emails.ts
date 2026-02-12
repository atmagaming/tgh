import { emailAccounts } from "services/email";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const searchEmailsTool = defineTool(
  "SearchEmails",
  "Search emails with filters: from, to, subject, date range, unread status, or free-text query.",
  z.object({
    account: z.string().nullable().describe("Account name (e.g. 'gmail'). Null for default account."),
    from: z.string().nullable().describe("Filter by sender email or name"),
    to: z.string().nullable().describe("Filter by recipient email or name"),
    subject: z.string().nullable().describe("Filter by subject keywords"),
    after: z.string().nullable().describe("Emails after this date (YYYY-MM-DD)"),
    before: z.string().nullable().describe("Emails before this date (YYYY-MM-DD)"),
    unreadOnly: z.boolean().nullable().describe("Only return unread emails"),
    query: z.string().nullable().describe("Free-text search query"),
    maxResults: z.number().nullable().describe("Max emails to return (default: 20)"),
  }),
  async ({ account, from, to, subject, after, before, unreadOnly, query, maxResults }) => {
    const provider = account ? emailAccounts.getProvider(account) : emailAccounts.getDefault();
    if (!provider) return `No email account found: ${account ?? "default"}`;

    const messages = await provider.searchEmails(
      {
        from: from ?? null,
        to: to ?? null,
        subject: subject ?? null,
        after: after ?? null,
        before: before ?? null,
        unreadOnly: unreadOnly ?? false,
        query: query ?? null,
      },
      maxResults ?? 20,
    );

    if (messages.length === 0) return "No emails match the search criteria.";

    return messages
      .map((m) => {
        const date = m.date ? m.date.toISOString().slice(0, 16) : "unknown";
        const unread = m.isUnread ? " [UNREAD]" : "";
        const sender = m.from ? `${m.from.name ?? m.from.address}` : "unknown";
        return `[${m.id}] ${date}${unread} From: ${sender} — ${m.subject ?? "(no subject)"}`;
      })
      .join("\n");
  },
  { isSensitive: true },
);
