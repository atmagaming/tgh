import { emailAccounts } from "services/email";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const readEmailTool = defineTool(
  "ReadEmail",
  "Read the full content of an email by its ID. Returns headers, body text, and metadata.",
  z.object({
    account: z.string().nullable().describe("Account name (e.g. 'gmail'). Null for default account."),
    messageId: z.string().describe("The email message ID to read"),
  }),
  async ({ account, messageId }) => {
    const provider = account ? emailAccounts.getProvider(account) : emailAccounts.getDefault();
    if (!provider) return `No email account found: ${account ?? "default"}`;

    const msg = await provider.getEmail(messageId);

    const from = msg.from ? `${msg.from.name ?? ""} <${msg.from.address}>`.trim() : "unknown";
    const to = msg.to.map((a) => `${a.name ?? ""} <${a.address}>`.trim()).join(", ") || "unknown";
    const cc = msg.cc.length > 0 ? msg.cc.map((a) => `${a.name ?? ""} <${a.address}>`.trim()).join(", ") : null;
    const date = msg.date ? msg.date.toISOString() : "unknown";

    const parts = [
      `**From:** ${from}`,
      `**To:** ${to}`,
      ...(cc ? [`**Cc:** ${cc}`] : []),
      `**Date:** ${date}`,
      `**Subject:** ${msg.subject ?? "(no subject)"}`,
      msg.hasAttachments ? "**Attachments:** Yes" : null,
      `**Status:** ${msg.isUnread ? "Unread" : "Read"}`,
      "",
      msg.body ?? "(no body)",
    ];

    return parts.filter((p) => p !== null).join("\n");
  },
);
