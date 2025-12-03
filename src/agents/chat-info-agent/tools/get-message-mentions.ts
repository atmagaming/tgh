import { logger } from "logger";
import { gramjsClient } from "services/telegram";
import type { Tool } from "shared/types";

export const getMessageMentionsTool: Tool = {
  definition: {
    name: "get_message_mentions",
    description:
      "Get message mentions - replies to a specific message and the message it replied to (if any). Use when user asks about message relationships, threads, or reply chains.",
    input_schema: {
      type: "object",
      properties: {
        message_id: {
          type: "number",
          description: "The ID of the message to get mentions for",
        },
      },
      required: ["message_id"],
    },
  },
  execute: async (toolInput) => {
    const messageId = toolInput.message_id as number;

    logger.info({ messageId }, "Message mentions request received");

    try {
      const mentions = await gramjsClient.getMessageMentions(messageId);

      logger.info(
        { messageId, repliedTo: mentions.repliedTo, repliesCount: mentions.replies.length },
        "Message mentions retrieved",
      );
      return {
        success: true,
        message_id: messageId,
        replied_to: mentions.repliedTo,
        replies: mentions.replies,
      };
    } catch (error) {
      logger.error(
        { messageId, error: error instanceof Error ? error.message : error },
        "Failed to get message mentions",
      );
      return {
        success: false,
        message_id: messageId,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
