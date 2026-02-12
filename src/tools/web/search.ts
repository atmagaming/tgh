import { env } from "env";
import { defineTool } from "streaming-agent";
import { z } from "zod";

interface PerplexityResponse {
  choices: { message: { content: string } }[];
  citations?: string[];
}

export const webSearchTool = defineTool(
  "WebSearch",
  "Search the web and get a summarized answer with citations. Use for current events, facts, documentation, pricing, or anything requiring up-to-date information.",
  z.object({
    query: z.string().describe("The search query in natural language"),
    recency: z
      .enum(["hour", "day", "week", "month", "year"])
      .nullable()
      .describe("Filter results by recency. Use when the user needs recent information."),
  }),
  async ({ query, recency }) => {
    const body: Record<string, unknown> = {
      model: "sonar",
      messages: [{ role: "user", content: query }],
      web_search_options: { search_context_size: "medium" },
    };

    if (recency) body.search_recency_filter = recency;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as PerplexityResponse;
    const answer = data.choices[0]?.message?.content ?? "No answer found.";
    const citations = data.citations;

    if (!citations?.length) return answer;
    return `${answer}\n\nSources:\n${citations.map((url, i) => `${i + 1}. ${url}`).join("\n")}`;
  },
);
