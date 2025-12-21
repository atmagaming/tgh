import { tool } from "@openai/agents";
import { getContext } from "context-provider";
import { chatHistoryStore } from "services/chat-history/chat-history-store";
import { z } from "zod";

/**
 * Retrieve recent message history from the current chat
 * Useful for understanding conversation context and continuity
 */
export const getChatHistoryTool = tool({
  name: "get_chat_history",
  description:
    "Get the last N messages from the current chat for conversation context. Returns message text, sender info, and timestamps. Use when you need to understand the flow of recent conversation.",
  parameters: z.object({
    limit: z.number().optional().default(10).describe("Maximum number of messages to retrieve (default: 10, max: 10)"),
  }),
  execute: ({ limit }) => {
    const context = getContext();
    const messages = chatHistoryStore.getHistory(context.chatId, Math.min(limit, 10));

    if (messages.length === 0) return { messages: [], summary: "No chat history available" };

    // Format messages for agent consumption
    const formattedMessages = messages.map((msg) => ({
      message_id: msg.message_id,
      from: {
        id: msg.from?.id,
        first_name: msg.from?.first_name,
        username: msg.from?.username,
      },
      date: msg.date,
      text: msg.text ?? msg.caption ?? "[media or unsupported content]",
      reply_to_message_id: msg.reply_to_message?.message_id,
    }));

    return {
      messages: formattedMessages,
      summary: `Retrieved ${messages.length} recent message(s) from chat`,
    };
  },
});
