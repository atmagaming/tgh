import { deleteMemory } from "services/memory/memory-store";
import { createTool } from "tools/sdk-tool";
import { z } from "zod";

export const deleteMemoryTool = createTool({
  name: "delete_memory",
  description: "Delete a memory by its ID. Use search_memories first to find the ID.",
  parameters: z.object({
    memoryId: z.string().describe("The ID of the memory to delete"),
  }),
  execute: async ({ memoryId }) => {
    const deleted = await deleteMemory(memoryId);

    if (!deleted) {
      return { success: false, error: `Memory not found: ${memoryId}` };
    }

    return { success: true, message: `Memory ${memoryId} deleted successfully` };
  },
});
