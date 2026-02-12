import { braveSearch, searchCountries } from "services/search";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const webSearchTool = defineTool(
  "WebSearch",
  "Search the web. Returns titles, URLs, descriptions, and snippets for each result.",
  z.object({
    query: z.string().describe("The search query string. Use keywords for better results."),
    count: z.number().min(1).max(20).default(5).describe("Number of results to return"),
    freshness: z
      .enum(["past_day", "past_week", "past_month", "past_year"])
      .nullable()
      .describe("Filter results by recency. Use when the user needs recent information."),
    country: z
      .enum(searchCountries)
      .nullable()
      .describe("Country to geo-target results. Use 'ALL' for global. Use when the query is location-specific."),
  }),
  async ({ query, count, freshness, country }) => {
    const results = await braveSearch(query, {
      count,
      freshness: freshness ?? undefined,
      country: country ?? undefined,
    });

    if (results.length === 0) return "No results found.";
    return results.map((r) => r.toXml()).join("\n");
  },
);
