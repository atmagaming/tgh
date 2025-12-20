import { logger } from "logger";
import { notionClient } from "services/notion/notion-client";
import { createTool } from "tools/sdk-tool";
import { z } from "zod";

export const searchGDDTool = createTool({
  name: "search_gdd",
  description:
    "Search the Game Design Document (GDD) in Notion for specific topics, features, or design decisions. Use when user asks about game design, mechanics, systems, or anything defined in the GDD. Returns matching pages with titles and URLs.",
  parameters: z.object({
    query: z.string().describe("Search query for GDD content (e.g., 'player movement', 'enemy AI', 'skill system')"),
    limit: z.number().min(1).max(20).optional().describe("Maximum number of results (default: 5, max: 20)"),
  }),
  execute: async ({ query, limit }) => {
    const maxLimit = limit ?? 5;

    logger.info({ query, limit: maxLimit }, "GDD search request");

    const pages = await notionClient.searchPages(query, maxLimit);

    return {
      query,
      results: pages.map((page) => ({
        id: page.id,
        title: page.title,
        url: page.url,
        lastEdited: page.lastEditedTime,
      })),
    };
  },
});
