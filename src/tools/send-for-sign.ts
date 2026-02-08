import { sendForSign } from "services/signer";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const sendForSignTool = defineTool(
  "SendForSign",
  "Send PDF for electronic sign. Returns signing links for each signer",
  z.object({
    filePath: z.string().describe("Path to the PDF file"),
    signers: z
      .object({
        name: z.string().describe("Signer's full name"),
        email: z.email().describe("Signer's email"),
      })
      .array()
      .describe("List of signers"),
    subject: z.string().nullable().describe("Optional email subject"),
    message: z.string().nullable().describe("Optional email message body"),
  }),
  ({ filePath, signers, subject, message }, _context) =>
    sendForSign(filePath, signers, {
      subject: subject ?? undefined,
      message: message ?? undefined,
    }),
);
