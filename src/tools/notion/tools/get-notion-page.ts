import { notion } from "services/notion";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const getNotionPageTool = defineTool(
  "GetNotionPage",
  "Get a Notion page by ID with its properties. Set content=true to also fetch page body.",
  z.object({
    id: z.string().describe("Notion page ID"),
    content: z.boolean().describe("Whether to fetch page body content"),
  }),
  async ({ id, content }) => (await notion.getPage(id)).toXML(content),
);
