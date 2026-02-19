import { notion } from "services/notion";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const deleteTaskTool = defineTool(
  "DeleteTask",
  "Archive (delete) a task by its page ID",
  z.object({
    id: z.string().describe("Task page ID to archive"),
  }),
  async ({ id }) => {
    await notion.updatePage(id, { archived: true });
    return `Archived task ${id}`;
  },
);
