import { emailAccounts } from "services/email";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const listEmailsTool = defineTool(
  "ListEmails",
  "List recent emails from an account's inbox. Returns subject, sender, date, and read status.",
  z.object({
    account: z.string().nullable().describe("Account name (e.g. 'gmail'). Null for default account."),
    maxResults: z.number().nullable().describe("Max emails to return (default: 20)"),
    unreadOnly: z.boolean().nullable().describe("Only return unread emails (default: false)"),
  }),
  async ({ account, maxResults, unreadOnly }) => {
    const provider = account ? emailAccounts.getProvider(account) : emailAccounts.getDefault();
    if (!provider) return `No email account found: ${account ?? "default"}`;

    const messages = await provider.listEmails({ maxResults: maxResults ?? 20, unreadOnly: unreadOnly ?? false });
    if (messages.length === 0) return "No emails found.";

    return messages
      .map((m) => {
        const date = m.date ? m.date.toISOString().slice(0, 16) : "unknown";
        const unread = m.isUnread ? " [UNREAD]" : "";
        const from = m.from ? `${m.from.name ?? m.from.address}` : "unknown";
        return `[${m.id}] ${date}${unread} From: ${from} — ${m.subject ?? "(no subject)"}`;
      })
      .join("\n");
  },
  { isSensitive: true },
);
