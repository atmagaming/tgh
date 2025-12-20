import { tool } from "@openai/agents";
import Perplexity from "@perplexity-ai/perplexity_ai";
import { env } from "env";
import { z } from "zod";

const perplexityClient = new Perplexity({
  apiKey: env.PERPLEXITY_API_KEY,
});

export const researchTool = tool({
  name: "research",
  description:
    "Use this tool to perform complex research tasks that require gathering information from multiple sources, synthesizing data, and providing comprehensive answers. Ideal for in-depth questions needing detailed exploration.",
  parameters: z.object({
    query: z.string().describe("The research question or topic to investigate"),
  }),
  execute: async ({ query }) => {
    const response = await perplexityClient.chat.completions.create({
      model: "sonar-pro",
      messages: [{ role: "user", content: query }],
      stream: true,
      web_search_options: {
        search_type: "pro",
      },
    });

    let result = "";

    for await (const chunk of response) {
      const delta = chunk.choices[0]?.delta;
      if (!delta?.content) continue;

      const content = typeof delta.content === "string" ? delta.content : delta.content;
      result += content;
    }

    // Access citations from the final response object
    const citations = "citations" in response ? (response.citations as string[] | undefined) : undefined;
    if (citations?.length) {
      result += "\n\nSources:\n";
      for (const citation of citations) result += `• ${citation}\n`;
    }

    return result;
  },
});
