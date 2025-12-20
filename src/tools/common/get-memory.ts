import { logger } from "logger";
import { getMemory } from "services/memory/memory-store";
import { Tool } from "tools/tool";
import { z } from "zod/v4";

export const getMemoryTool = new Tool(
  "get_memory",
  "Retrieve a specific memory by its ID. Use when you have a memory ID from search results and need the full content.",
  {
    memoryId: z.string().describe("The ID of the memory to retrieve"),
  },
  async ({ memoryId }) => {
    logger.info({ memoryId }, "Get memory request");

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
);
