import { notion } from "services/notion";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const editTaskTool = defineTool(
  "EditTask",
  "Update a task's properties and/or description. Pass only fields you want to change.",
  z.object({
    id: z.string().describe("Task page ID"),
    title: z.string().nullable().describe("New task title"),
    status: z.string().nullable().describe("New status, e.g. 'Done', 'In progress'"),
    date: z.string().nullable().describe("New ISO date"),
    assignee: z.string().nullable().describe("New assignee Notion person page ID"),
    developer: z.string().nullable().describe("New developer Notion person page ID"),
    reviewer: z.string().nullable().describe("New reviewer Notion person page ID"),
    parentTask: z.string().nullable().describe("Parent task page ID"),
    description: z.string().nullable().describe("New description in markdown (replaces existing)"),
  }),
  async ({ id, title, status, date, assignee, developer, reviewer, parentTask, description }) => {
    const updates: string[] = [];
    const properties: Record<string, unknown> = {};

    if (title) {
      properties.Name = { title: [{ text: { content: title } }] };
      updates.push("title");
    }
    if (status) {
      properties.Status = notion.buildPropertyPayload("status", status);
      updates.push("status");
    }
    if (date) {
      properties.Date = notion.buildPropertyPayload("date", date);
      updates.push("date");
    }
    if (assignee) {
      properties.Assignee = notion.buildPropertyPayload("relation", assignee);
      updates.push("assignee");
    }
    if (developer) {
      properties.Developer = notion.buildPropertyPayload("relation", developer);
      updates.push("developer");
    }
    if (reviewer) {
      properties.Reviewer = notion.buildPropertyPayload("relation", reviewer);
      updates.push("reviewer");
    }
    if (parentTask) {
      properties["Parent item"] = notion.buildPropertyPayload("relation", parentTask);
      updates.push("parent task");
    }

    if (Object.keys(properties).length) await notion.updatePage(id, { properties });

    if (description) {
      const blocks = notion.markdownToBlocks(description);
      await notion.replacePageContents(id, blocks);
      updates.push("description");
    }

    return updates.length > 0 ? `Updated: ${updates.join(", ")}` : "No changes made.";
  },
);
