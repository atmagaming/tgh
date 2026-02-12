import { emailAccounts } from "services/email";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const listAccountsTool = defineTool(
  "ListEmailAccounts",
  "List all configured email accounts with their names, addresses, and types",
  z.object({}),
  () => {
    const accounts = emailAccounts.listAccounts();
    if (accounts.length === 0) return "No email accounts configured.";
    return accounts.map((a) => `- **${a.name}**: ${a.address}`).join("\n");
  },
  { isSensitive: true },
);
