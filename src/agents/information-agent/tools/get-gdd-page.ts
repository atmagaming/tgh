import { tool } from "@openai/agents";
import { logger } from "logger";
import { notionClient } from "services/notion/notion-client";
import { z } from "zod";

export const getGDDPageTool = tool({
  name: "get_gdd_page",
  description:
    "Get the full content of a specific GDD page in Notion. Use after searching to read the actual content. Returns the page content in markdown format with all nested blocks.",
  parameters: z.object({
    pageId: z.string().describe("The Notion page ID from search results"),
  }),
  execute: async ({ pageId }) => {
    logger.info({ pageId }, "GDD page content request");

    const pageContent = await notionClient.getPageContent(pageId);

    return {
      id: pageContent.id,
      title: pageContent.title,
      content: pageContent.content,
      url: pageContent.url,
    };
  },
});
