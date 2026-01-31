import { tool } from "@openai/agents";
import { logger } from "logger";
import { gramjsClient } from "services/telegram";
import { z } from "zod";

export const searchMessagesTool = tool({
  name: "search_messages",
  description:
    "Search for messages in the current Telegram chat. Use when user asks to find, search, or look up past messages. Telegram search looks for messages containing ALL the words in the query (AND logic), not ANY of them (OR logic). If searching for alternative terms, make separate search requests.",
  parameters: z.object({
    query: z
      .string()
      .describe(
        "Search query - a word or phrase to find in messages. Telegram will match messages containing all words in this query. Do NOT use space-separated alternatives like 'generate create make' - these won't work. Instead, use a single specific term or call this tool multiple times with different queries.",
      ),
    limit: z.number().min(1).max(50).optional().describe("Maximum number of results to return (default: 10, max: 50)"),
  }),
  async execute({ query, limit }) {
    const maxLimit = limit ?? 10;

    logger.info({ query, limit: maxLimit }, "Message search request received");

    const results = await gramjsClient.searchMessages({ query, limit: maxLimit });

    if (results.length === 0) logger.info({ query }, "No messages found");

    logger.info({ query, count: results.length }, "Message search completed");
    return {
      query,
      results: results.map((msg) => ({
        id: msg.id,
        text: msg.text,
        date: msg.date.toISOString(),
      })),
    };
  },
});
