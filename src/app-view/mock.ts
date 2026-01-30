import { StreamingAgent, type ToolDefinition } from "@agents";
import { z } from "zod";

export const addNumbersTool: ToolDefinition = {
  name: "add_numbers",
  description: "Adds two numbers together",
  parameters: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
  execute: ({ a, b }) => ({ sum: a + b }),
};

export const mathAgent = new StreamingAgent({
  name: "MathAgent",
  model: "gpt-5-nano",
  instructions: "You are a math helper. Use the add_numbers tool to perform calculations.",
  tools: [addNumbersTool],
  modelSettings: {
    reasoning: { effort: "low", summary: "auto" },
  },
});

export const masterAgent = new StreamingAgent({
  name: "MasterAgent",
  model: "gpt-5-nano",
  instructions: "You are a helpful assistant. Delegate math tasks to MathAgent.",
  tools: [mathAgent],
  modelSettings: {
    reasoning: { effort: "low", summary: "auto" },
  },
});
