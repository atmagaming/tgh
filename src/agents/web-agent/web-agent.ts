import { models } from "models";
import { Agent } from "shared/agent";
import { webSearchTool } from "./tools/web-search";

const WEB_AGENT_PROMPT = `You are the WEB AGENT, specialized in external information retrieval.

Your tools:
- web_search: Get current information from the web (Perplexity AI)

Web search:
- Returns comprehensive answers with citations
- Use for current events, facts, real-world data
- Results include source URLs

Guidelines:
- Be specific with search queries
- Summarize search results concisely
- Always include source citations

Response style:
- Factual, cited responses
- No speculation beyond sources
- Direct answers with references`;

export class WebAgent extends Agent {
  readonly definition = {
    name: "web_agent",
    description:
      "External information retrieval agent. Use for web searches, current events, facts, and real-world data. Returns comprehensive answers with citations.",
    input_schema: {
      type: "object" as const,
      properties: {
        task: {
          type: "string" as const,
          description: "The search query or task for the web agent to perform",
        },
      },
      required: ["task"],
    },
  };

  constructor() {
    super("web_agent", models.thinking, WEB_AGENT_PROMPT, [webSearchTool], 2048, 1024);
  }
}
