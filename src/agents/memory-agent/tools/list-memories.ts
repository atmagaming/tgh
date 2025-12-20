import { tool } from "@openai/agents";
import { getAllMemories } from "services/memory/memory-store";
import { z } from "zod";

export const listMemoriesTool = tool({
  name: "list_memories",
  description: "List all stored memories with their IDs, content, and timestamps",
  parameters: z.object({}),
  execute: () => {
    const memories = getAllMemories();

    return {
      success: true,
      count: memories.length,
      memories: memories.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    };
  },
});
