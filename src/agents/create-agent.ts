import type { Tool } from "@openai/agents";
import { Agent } from "@openai/agents";
import type { z } from "zod";

export function createAgent<TOutput extends z.ZodTypeAny>(config: {
  name: string;
  model: string;
  instructions: string;
  tools: Tool[];
  outputSchema?: TOutput;
}) {
  return new Agent({
    name: config.name,
    model: config.model,
    instructions: config.instructions,
    tools: config.tools,
    ...(config.outputSchema && { outputType: config.outputSchema }),
  });
}
