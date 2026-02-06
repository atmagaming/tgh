import { StreamingAgent } from "@agentic/streaming-agent";
import { driveAgent } from "tools/drive";
import { notionAgent } from "tools/notion";
import { onboardingAgent } from "tools/onboarding";
import "@elumixor/extensions";
import { memories } from "services/memories";
import { getChatInfoTool } from "tools/core/get-chat-info";
import { getMessagesTool } from "tools/core/get-messages";
import { updateMemoriesTool } from "tools/core/update-memories";

export const masterAgent = new StreamingAgent({
  name: "master_agent",
  model: "gpt-5.1",
  instructions: ({ chatType, chatName, botInfo }) =>
    `
You are ${botInfo.firstName} (@${botInfo.username}), a Telegram bot assistant.

## Current Chat

You are currently in a ${chatType} chat: "${chatName}".
${chatType === "group" ? "This is the main group chat. You can also access private chat history using the tools." : "This is a private chat. You can also access group chat history using the tools."}

## Behavior

- Understand user requests from the chat context provided
- Use tools and sub-agents to accomplish tasks when needed
- Be concise and direct in responses

## Sub-Agents

- **notionAgent**: Manage Notion databases (People, Roles, Sensitive Data, Tasks, Hypocrisy) - query, create, update pages
- **driveAgent**: Manage Google Drive files, folders, and Google Docs - search, upload, download, generate contracts from templates
- **onboardingAgent**: Coordinate full team member onboarding - create Notion entries, generate NDAs, send for signature, add to Telegram

## Memories

${memories.get() ?? "(no memories yet)"}

Use update_memories tool when:
- User explicitly asks you to remember something
- User provides feedback about preferences
- Important context should be persisted

The tool accepts an instruction (e.g., "add preference for concise responses", "remove the item about X").

## Message History

The chat content shows the last 10 messages (oldest first) in the XML format:`.trim(),
  tools: [
    getChatInfoTool,
    getMessagesTool,
    updateMemoriesTool,
    {
      agent: notionAgent,
      description: "Manage Notion databases (People, Roles, Sensitive Data, Tasks, Hypocrisy) - query, create, update pages",
    },
    {
      agent: driveAgent,
      description: "Manage Google Drive files and Google Docs - search, upload, download, generate contracts from templates",
    },
    {
      agent: onboardingAgent,
      description: "Coordinate team member onboarding - create Notion entries, generate NDAs, send for signature, add to Telegram",
    },
    // getAPIBalancesTool,
    // webSearchTool(),
    // { agent: imageAgent, description: "Generate, analyze images, or create 3D models from images" },
    // {
    //   agent: contextAgent,
    //   description: "Enrich requests with full context: resolve user intent from Telegram messages, retrieve relevant information from GDD/Notion, Drive files, and web.",
    // },
  ],
});
