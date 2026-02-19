import { escapeXML, notion } from "services/notion";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const findPagesTool = defineTool(
  "FindPages",
  "Search Notion for pages and databases by keyword",
  z.object({
    query: z.string().nullable().describe("Search query. Returns pages that have this string in their title"),
    filter: z
      .enum(["page", "database"])
      .nullable()
      .describe("Optionally restrict results to be only pages or only databases. Pass null if you want both."),
  }),
  async ({ query: search, filter }) => {
    const results = await notion.searchPages(search, filter);
    if (!results.length) return "No results found.";
    return results.map((r) => `${escapeXML(r.title)} (${r.id})${filter === null ? ` - ${r.object}` : ""}`).join("\n");
  },
);
