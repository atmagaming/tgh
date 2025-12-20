import { Agent } from "@openai/agents";
import { searchDriveFilesTool } from "agents/drive-agent/tools/search-drive-files";
import { models } from "models";
import { webSearchTool } from "tools/common/web-search";
import { z } from "zod";
import { addMemoryTool, getGDDPageTool, searchGDDTool, searchMemoriesTool, updateMemoryTool } from "./tools";

const InformationOutputSchema = z.object({
  entities: z.object({
    characters: z.array(z.string()),
    styles: z.array(z.string()),
    objects: z.array(z.string()),
  }),
  references: z.object({
    GDD_pages: z.array(z.string()),
    memories: z.array(z.string()),
    Drive_files: z.array(z.string()),
    chat_messages: z.array(z.string()),
  }),
  assumptions: z.array(z.string()),
  uncertainties: z.array(z.string()),
});

const INFORMATION_AGENT_PROMPT = `You are a Context Agent that gathers structured information for downstream agents.

RESPONSIBILITIES:
- Resolve entities (characters, styles, objects) mentioned in the user request
- Retrieve relevant GDD/Notion pages, project memories, Google Drive files, chat messages
- Always prioritize GDD > Memory > Drive > Web
- Analyze previous messages in the conversation if the current message is a reply
- Avoid redundant searches

Always cite the sources with URLs, and do not perform generation. Return concise, structured, actionable context.`;

export const informationAgent = new Agent({
  name: "context_agent",
  model: models.thinking,
  instructions: INFORMATION_AGENT_PROMPT,
  tools: [
    searchGDDTool,
    getGDDPageTool,
    searchMemoriesTool,
    addMemoryTool,
    updateMemoryTool,
    webSearchTool,
    searchDriveFilesTool,
  ],
  outputType: InformationOutputSchema,
});
