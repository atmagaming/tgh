import { tool } from "@openai/agents";
import { getMemory } from "services/memory/memory-store";
import { z } from "zod";

export const getMemoryTool = tool({
  name: "get_memory",
  description:
    "Retrieve a specific memory by its ID. Use when you have a memory ID from search results and need the full content.",
  parameters: z.object({
    memoryId: z.string().describe("The ID of the memory to retrieve"),
  }),
  execute: ({ memoryId }) => {
    const memory = getMemory(memoryId);

    if (!memory) throw new Error(`Memory not found: ${memoryId}`);

    return {
      memory: {
        id: memory.id,
        content: memory.content,
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt,
      },
    };
  },
});
