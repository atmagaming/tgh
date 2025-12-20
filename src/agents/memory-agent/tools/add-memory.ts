import { addMemory } from "services/memory/memory-store";
import { createTool } from "tools/sdk-tool";
import { z } from "zod";

export const addMemoryTool = createTool({
  name: "add_memory",
  description: "Store a new memory for future reference. Memories are searchable by semantic similarity.",
  parameters: z.object({
    content: z.string().describe("The content to remember (fact, decision, instruction, etc.)"),
  }),
  execute: async ({ content }) => {
    if (!content || content.trim().length === 0) {
      return { success: false, error: "Content cannot be empty" };
    }

    const memoryId = await addMemory(content.trim());

    return {
      success: true,
      memoryId,
      message: "Memory stored successfully",
    };
  },
});
