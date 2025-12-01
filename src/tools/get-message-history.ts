import { gramjsClient } from "../gramjs-client";
import { logger } from "../logger";
import type { Tool } from "./types";

export const getMessageHistoryTool: Tool = {
  definition: {
    name: "get_message_history",
    description:
      "Get recent message history from the chat. Returns messages in reverse chronological order (newest first). Use when user asks to see recent messages or conversation history.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of messages to retrieve (default: 10, max: 100)",
          minimum: 1,
          maximum: 100,
        },
        offset: {
          type: "number",
          description: "Offset from the most recent message (default: 0). Use this to paginate through older messages.",
          minimum: 0,
        },
      },
    },
  },
  execute: async (toolInput) => {
    const limit = (toolInput.limit as number | undefined) ?? 10;
    const offset = (toolInput.offset as number | undefined) ?? 0;

    logger.info({ limit, offset }, "Message history request received");

    try {
      const results = await gramjsClient.getMessageHistory({ limit, offset });

      if (results.length === 0) {
        logger.info({ limit, offset }, "No messages found in history");
        return { success: true, limit, offset, results: [] };
      }

      logger.info({ limit, offset, count: results.length }, "Message history retrieved");
      return {
        success: true,
        limit,
        offset,
        results: results.map((msg) => ({
          id: msg.id,
          text: msg.text,
          date: msg.date.toISOString(),
        })),
      };
    } catch (error) {
      logger.error(
        { limit, offset, error: error instanceof Error ? error.message : error },
        "Failed to get message history",
      );
      return {
        success: false,
        limit,
        offset,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
