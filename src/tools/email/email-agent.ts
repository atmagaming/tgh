import { models } from "models";
import { StreamingAgent } from "streaming-agent";
import {
  listAccountsTool,
  listEmailsTool,
  readEmailTool,
  replyDraftTool,
  searchEmailsTool,
  sendEmailTool,
} from "./tools";

const EMAIL_AGENT_PROMPT = `You manage email across multiple accounts.

Workflow for sending:
1. Draft the email text yourself and present it to the user for confirmation
2. Only call SendEmail after explicit user approval
3. For replies, use ReplyDraft to set up threading, then confirm with user before sending

Notes:
- List accounts first if unsure which to use
- Default account is used when account parameter is null
- Use parallel tool calls when checking multiple accounts
- For email lists, show date, sender, subject, and unread status
`;

export const emailAgent = new StreamingAgent({
  name: "EmailAgent",
  model: models.mini,
  instructions: EMAIL_AGENT_PROMPT,
  tools: [listAccountsTool, listEmailsTool, searchEmailsTool, readEmailTool, replyDraftTool, sendEmailTool],
});
