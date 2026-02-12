import { models } from "models";
import { StreamingAgent } from "streaming-agent";
import { webFetchTool } from "./fetch";
import { webSearchTool } from "./search";

export const webAgent = new StreamingAgent({
  name: "WebAgent",
  model: models.thinking,
  modelSettings: { reasoning: { effort: "medium" } },
  instructions: `
You provide information using web search and page fetching.

Guidelines:
- Run multiple searches in parallel when the request covers different topics
- After searching, fetch specific pages to get detailed information when snippets aren't enough
- Synthesize findings into a concise, well-structured answer with source URLs
- If initial results are insufficient, refine the query and search again
`.trim(),
  tools: [webSearchTool, webFetchTool],
});
