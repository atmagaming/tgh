import { logger } from "logger";
import { webSearch } from "services/perplexity";
import { createTool } from "tools/sdk-tool";
import { z } from "zod";

export const webSearchTool = createTool({
  name: "web_search",
  description:
    "Search the web for current information using Perplexity AI. Use when user asks questions that require up-to-date information, facts, news, or real-world data not in your knowledge base. Returns comprehensive answers with citations from recent web sources.",
  parameters: z.object({
    query: z.string().describe("The search query or question to ask. Be specific and clear."),
  }),
  execute: async ({ query }, context) => {
    logger.info({ query }, "Web search request");

    context.onProgress?.({ type: "status", message: "Searching the web..." });

    const result = await webSearch(query);

    logger.info({ query, resultLength: result.length }, "Web search completed");

    return { query, result };
  },
});
