export interface AgentResponse {
  success: boolean;
  result?: string;
  error?: string;
  toolsUsed: string[];
  thinkingUsed: boolean;
  executionTimeMs: number;
}
