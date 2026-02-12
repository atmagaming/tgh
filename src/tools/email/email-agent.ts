import { models } from "models";
import { StreamingAgent } from "streaming-agent";
import {
  composeDraftTool,
  listAccountsTool,
  listEmailsTool,
  readEmailTool,
  replyDraftTool,
  searchEmailsTool,
  sendEmailTool,
} from "./tools";

const EMAIL_AGENT_PROMPT = `You manage email across multiple accounts (Gmail, IMAP).

Workflow for sending:
1. Compose or reply using ComposeDraft/ReplyDraft (returns draft preview)
2. Present the draft to the user for confirmation
3. Only call SendEmail after explicit user approval

Notes:
- List accounts first if unsure which to use
- Default account is used when account parameter is null
- Use parallel tool calls when checking multiple accounts
- Output results in concise, readable format
- For email lists, show date, sender, subject, and unread status
`;

export const emailAgent = new StreamingAgent({
  name: "EmailAgent",
  model: models.mini,
  instructions: EMAIL_AGENT_PROMPT,
  tools: [
    listAccountsTool,
    listEmailsTool,
    searchEmailsTool,
    readEmailTool,
    composeDraftTool,
    replyDraftTool,
    sendEmailTool,
  ],
});
