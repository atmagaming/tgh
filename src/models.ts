/**
 * Centralized model definitions for different use cases
 */
export const models = {
  /** GPT-5 Nano: Fastest, cheapest - for summarization and classification tasks */
  nano: "gpt-5-nano",

  /** GPT-5 mini: Fast, cost-efficient - for well-defined tasks and precise prompts */
  mini: "gpt-5-mini",

  /** GPT-5.1: Flagship model - for coding and agentic tasks with configurable reasoning */
  thinking: "gpt-5.1",
} as const;
