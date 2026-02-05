import { StreamingAgent } from "@agents/streaming-agent";
import "@elumixor/extensions";
import { memories } from "services/memories";
import { getChatInfoTool } from "./tools/get-chat-info";
import { getMessagesTool } from "./tools/get-messages";
import { updateMemoriesTool } from "./tools/update-memories";

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
- Use tools to accomplish tasks when needed
- Be concise and direct in responses

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
    // getAPIBalancesTool,
    // webSearchTool(),
    // { agent: imageAgent, description: "Generate, analyze images, or create 3D models from images" },
    // {
    //   agent: contextAgent,
    //   description: "Enrich requests with full context: resolve user intent from Telegram messages, retrieve relevant information from GDD/Notion, Drive files, and web.",
    // },
    // {
    //   agent: driveAgent,
    //   description: "Manage Google Drive files and folders (search, upload, download, organize)",
    // },
  ],
});
