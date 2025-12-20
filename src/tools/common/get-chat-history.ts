import { logger } from "logger";
import { gramjsClient } from "services/telegram";
import { Tool } from "tools/tool";
import { z } from "zod/v4";

export const getChatHistoryTool = new Tool(
  "get_chat_history",
  "Get recent chat history from the current Telegram chat. Returns messages in reverse chronological order (newest first). Use when user asks to see recent messages or conversation history.",
  {
    limit: z.number().min(1).max(100).optional().describe("Number of messages to retrieve (default: 10, max: 100)"),
    offset: z
      .number()
      .min(0)
      .optional()
      .describe("Offset from the most recent message (default: 0). Use this to paginate through older messages."),
  },
  async ({ limit, offset }) => {
    const messageLimit = limit ?? 10;
    const messageOffset = offset ?? 0;

    logger.info({ limit: messageLimit, offset: messageOffset }, "Chat history request received");

    const results = await gramjsClient.getMessageHistory({ limit: messageLimit, offset: messageOffset });

    if (results.length === 0)
      logger.info({ limit: messageLimit, offset: messageOffset }, "No messages found in chat history");

    logger.info({ limit: messageLimit, offset: messageOffset, count: results.length }, "Chat history retrieved");
    return {
      limit: messageLimit,
      offset: messageOffset,
      results: results.map((msg) => ({
        id: msg.id,
        text: msg.text,
        date: msg.date.toISOString(),
      })),
    };
  },
);
