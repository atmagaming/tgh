import { Agent } from "agents/agent";
import { searchDriveFilesTool } from "agents/drive-agent/tools/search-drive-files";
import { models } from "models";
import { getChatHistoryTool } from "tools/get-chat-history";
import { searchMessagesTool } from "tools/search-messages";
import { webSearchTool } from "tools/web-search";
import { addMemoryTool } from "./tools/add-memory";
import { getGDDPageTool } from "./tools/get-gdd-page";
import { getMemoryTool } from "./tools/get-memory";
import { searchGDDTool } from "./tools/search-gdd";
import { searchMemoriesTool } from "./tools/search-memories";
import { updateMemoryTool } from "./tools/update-memory";

const INFORMATION_AGENT_PROMPT = `You retrieve information from various sources.

SOURCES (priority): GDD (Notion) > Memory > Web

ACTION RULES:
- Lists: search_gdd once with relevant term, get page with items
- Details: ONE search_gdd + get_gdd_page. Stop when you have the answer.
- Multiple items needed: fetch ALL in ONE iteration (parallel)
- Web search: ONLY when GDD lacks the info
- Stop searching once you have the answer - don't over-verify

Response: Concise, cite sources with URLs.`;

export class InformationAgent extends Agent {
  readonly definition = {
    name: "information_agent",
    description:
      "Answers ANY query by searching the web, GDD in Notion, Google Drive, Telegram chat messages history. Use for complex questions, not just for web search.",
    input_schema: {
      type: "object" as const,
      properties: {
        task: {
          type: "string" as const,
          description: "Question to be answered",
        },
      },
      required: ["task"],
    },
  };

  constructor() {
    super(
      "information_agent",
      models.thinking,
      INFORMATION_AGENT_PROMPT,
      [
        searchGDDTool,
        getGDDPageTool,
        searchMemoriesTool,
        addMemoryTool,
        updateMemoryTool,
        getMemoryTool,
        webSearchTool,
        searchDriveFilesTool,
        searchMessagesTool,
        getChatHistoryTool,
      ],
      4096,
      2048,
    );
  }
}
