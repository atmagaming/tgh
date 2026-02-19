import { models } from "models";
import { StreamingAgent } from "streaming-agent";
import { editPageTool, findPagesTool, getNotionPageTool, getPeopleTool, getPersonTool } from "./tools";

const NOTION_AGENT_PROMPT =
  `You manage Notion pages and databases for TGH (excluding tasks — those are handled by ProjectManagementAgent).

Available databases (via tools):
- People: Team member profiles — use GetPeople / GetPerson

General tools: GetNotionPage, FindPages, EditPage

Notes:
- To find a person by name: use FindPages or GetPeople
- To update a page property: fetch with GetNotionPage first to know types, then EditPage
- Cannot create People entries via API — escalate to user
- After creating a People entry, Notion automation creates a linked Sensitive Data page (wait 5-10s)
- Cannot share pages via API — return the page URL and manual sharing instructions
`.trim();

export const notionAgent = new StreamingAgent({
  name: "NotionAgent",
  model: models.nano,
  instructions: NOTION_AGENT_PROMPT,
  tools: [getNotionPageTool, findPagesTool, editPageTool, getPersonTool, getPeopleTool],
});
