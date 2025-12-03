/**
 * Centralized model definitions for different use cases
 */

export const models = {
  /** Fast routing and simple tasks - use for quick decisions and routing */
  fast: "claude-3-5-haiku-20241022",

  /** Complex reasoning and tool use - use for multi-step tasks */
  thinking: "claude-sonnet-4-20250514",

  /** Advanced reasoning (currently unused) */
  reasoning: "claude-opus-4-20250514",
} as const;

export type ModelType = keyof typeof models;

/**
 * Get model name by type
 */
export function getModel(type: ModelType): string {
  return models[type];
}
