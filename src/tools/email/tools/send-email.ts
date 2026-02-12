import { emailAccounts } from "services/email";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const sendEmailTool = defineTool(
  "SendEmail",
  "Send an email from a draft. Only use after the user has confirmed the draft content.",
  z.object({
    account: z.string().nullable().describe("Account name (e.g. 'gmail'). Null for default account."),
    to: z.array(z.object({ name: z.string().nullable(), address: z.string() })).describe("Recipients"),
    cc: z
      .array(z.object({ name: z.string().nullable(), address: z.string() }))
      .nullable()
      .describe("CC recipients"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body text"),
    inReplyTo: z.string().nullable().describe("Message ID this is a reply to"),
  }),
  async ({ account, to, cc, subject, body, inReplyTo }) => {
    const provider = account ? emailAccounts.getProvider(account) : emailAccounts.getDefault();
    if (!provider) return `No email account found: ${account ?? "default"}`;

    const result = await provider.sendEmail({ to, cc: cc ?? [], subject, body, inReplyTo: inReplyTo ?? null });
    return `Email sent successfully. Message ID: ${result.messageId}`;
  },
  { isSensitive: true },
);
