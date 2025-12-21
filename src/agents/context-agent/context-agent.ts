import { Agent, webSearchTool } from "@openai/agents";
import { driveAgent } from "agents/drive-agent/drive-agent";
import { memoryAgent } from "agents/memory-agent/memory-agent";
import { models } from "models";
import { z } from "zod";
import { getGDDPageTool, searchGDDTool } from "./tools";
import { getChatInfoTool } from "./tools/get-chat-info";
import { getMessageInfoTool } from "./tools/get-message-info";

/**
 * Unified Context Agent - combines Intention and Information agents
 *
 * Responsibilities:
 * - Resolve user intent from Telegram messages
 * - Resolve Telegram-specific references (message IDs, chat context)
 * - Retrieve external context (GDD, memories, Drive, web)
 * - Extract entities and provide structured context
 */

const CONTEXT_AGENT_PROMPT = `You are the Context Agent that enriches user requests with all necessary context.

## PRIMARY RESPONSIBILITIES

### 1. INTENTION RESOLUTION (from Telegram)
- Determine what the user wants to do from their message
- Resolve message references: "this message" (replied-to), "that conversation"
- Resolve voice messages (use transcribe_voice: true when needed)
- Clarify ambiguous requests by searching relevant context

Resolution Patterns:
- "this/that message" → use get_message_info with the message ID
- Conversation references → use get_chat_info for chat history
- Voice content → set transcribe_voice: true in get_message_info
- Always gather context before asking for clarification

### 2. INFORMATION GATHERING (from project sources)
- Resolve entities (characters, styles, objects, concepts) mentioned in the request
- Retrieve relevant GDD/Notion pages, project memories, Drive files
- Use web search as fallback when information isn't found in project sources
- Always prioritize: GDD > Memory > Drive > Web

## TOOL DELEGATION

**Telegram Context:**
- get_message_info: Get message content, media, sender, voice transcription
- get_chat_info: Get chat history and conversation context

**Project Context:**
- search_gdd / get_gdd_page: Search and retrieve GDD/Notion documentation
- memory_agent: Search, add, or update persistent project memories
- drive_agent: Search, list, download, upload, or manage Google Drive files
- web_search: Fallback for information not in project sources

## OUTPUT REQUIREMENTS

Return comprehensive context including:
- Clarified user intent (what they actually want to do)
- Referenced Telegram messages with IDs and links
- Resolved entities (characters, styles, objects)
- Relevant references from GDD, memories, Drive, chat messages
- Confidence level and any uncertainties
- Whether user clarification is needed

## BEST PRACTICES

- Avoid redundant searches (check memory/GDD before web)
- Always cite sources with URLs/links
- Be concise but thorough
- Do not perform generation - only gather and structure context
- Return actionable, structured information for downstream agents`;

/**
 * Unified output schema combining Intention and Information outputs
 */
const ContextOutputSchema = z.object({
  // Intent resolution (from Intention Agent)
  clarified_intent: z.string().describe("Clear statement of what the user wants to do"),
  confidence: z.enum(["high", "medium", "low"]).describe("Confidence in understanding user intent"),
  needs_user_clarification: z.boolean().describe("Whether user input is needed to proceed"),

  // Telegram references (from Intention Agent)
  referenced_messages: z
    .array(
      z.object({
        id: z.number(),
        link: z.string(),
        snippet: z.string(),
      }),
    )
    .describe("Telegram messages referenced in the request"),

  // Entity resolution (from Information Agent)
  entities: z
    .object({
      characters: z.array(z.string()),
      styles: z.array(z.string()),
      objects: z.array(z.string()),
    })
    .describe("Entities (characters, styles, objects) mentioned in the request"),

  // External references (from Information Agent)
  references: z
    .object({
      GDD_pages: z.array(z.string()).describe("Relevant GDD/Notion page URLs"),
      memories: z.array(z.string()).describe("Relevant memory IDs or descriptions"),
      Drive_files: z.array(z.string()).describe("Relevant Google Drive file names/IDs"),
      chat_messages: z.array(z.string()).describe("Relevant chat message references"),
    })
    .describe("External references from project sources"),

  // Context analysis (from Information Agent)
  assumptions: z.array(z.string()).describe("Assumptions made during context gathering"),
  uncertainties: z.array(z.string()).describe("Things that are unclear or need verification"),
});

/**
 * Context Agent - unified agent for all context enrichment
 *
 * Combines the responsibilities of:
 * - Intention Agent: Telegram-specific intent resolution
 * - Information Agent: External context retrieval
 */
export const contextAgent = new Agent({
  name: "context_agent",
  model: models.thinking, // Use thinking model for complex multi-source reasoning
  instructions: CONTEXT_AGENT_PROMPT,
  tools: [
    // Telegram context tools (from Intention Agent)
    getMessageInfoTool,
    getChatInfoTool,

    // Project documentation tools (from Information Agent)
    searchGDDTool,
    getGDDPageTool,

    // Delegated sub-agents (from Information Agent)
    memoryAgent.asTool({
      toolName: "memory_agent",
      toolDescription:
        "Search, add, or update project memories. Use this to store and retrieve persistent information about the project, characters, decisions, and context.",
    }),
    driveAgent.asTool({
      toolName: "drive_agent",
      toolDescription:
        "Search, list, download, upload, or manage Google Drive files. Use this to access project assets, documents, and files stored in Drive.",
    }),

    // Web search fallback
    webSearchTool(),
  ],
  outputType: ContextOutputSchema,
});
