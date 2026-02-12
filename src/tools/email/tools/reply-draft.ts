import { emailAccounts } from "services/email";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const replyDraftTool = defineTool(
  "ReplyDraft",
  "Create a reply draft to an existing email (does NOT send). Returns draft JSON for user review before sending.",
  z.object({
    account: z.string().nullable().describe("Account name (e.g. 'gmail'). Null for default account."),
    messageId: z.string().describe("The email message ID to reply to"),
    body: z.string().describe("Reply body text"),
    replyAll: z.boolean().nullable().describe("Reply to all recipients (default: false)"),
  }),
  async ({ account, messageId, body, replyAll }) => {
    const provider = account ? emailAccounts.getProvider(account) : emailAccounts.getDefault();
    if (!provider) return `No email account found: ${account ?? "default"}`;

    const original = await provider.getEmail(messageId);
    const to = original.from ? [original.from] : [];

    let cc: { name: string | null; address: string }[] = [];
    if (replyAll) {
      cc = [...original.to, ...original.cc].filter((a) => a.address !== provider.address);
    }

    const subject = original.subject?.startsWith("Re:") ? original.subject : `Re: ${original.subject ?? ""}`;

    const draft = { to, cc, subject, body, inReplyTo: original.id };

    const toStr = to.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
    const ccStr = cc.length > 0 ? cc.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ") : null;

    const preview = [
      `**To:** ${toStr}`,
      ...(ccStr ? [`**Cc:** ${ccStr}`] : []),
      `**Subject:** ${subject}`,
      "",
      body,
    ].join("\n");

    return { draft, preview };
  },
);
