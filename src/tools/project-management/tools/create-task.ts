import { env } from "env";
import { notion } from "services/notion";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const createTaskTool = defineTool(
  "CreateTask",
  "Create a new task in the Tasks database",
  z.object({
    title: z.string().describe("Task title"),
    status: z.string().nullable().describe("Task status, e.g. 'Not started', 'In progress'"),
    date: z.string().nullable().describe("ISO date for the task deadline or start date"),
    assignee: z.string().nullable().describe("Assignee Notion person page ID"),
    developer: z.string().nullable().describe("Developer Notion person page ID"),
    reviewer: z.string().nullable().describe("Reviewer Notion person page ID"),
    parentTask: z.string().nullable().describe("Parent task page ID to add this as a subtask"),
    description: z.string().nullable().describe("Task description in markdown"),
  }),
  async ({ title, status, date, assignee, developer, reviewer, parentTask, description }) => {
    const properties: Record<string, unknown> = {
      Name: { title: [{ text: { content: title } }] },
    };

    if (status) properties.Status = notion.buildPropertyPayload("status", status);
    if (date) properties.Date = notion.buildPropertyPayload("date", date);
    if (assignee) properties.Assignee = notion.buildPropertyPayload("relation", assignee);
    if (developer) properties.Developer = notion.buildPropertyPayload("relation", developer);
    if (reviewer) properties.Reviewer = notion.buildPropertyPayload("relation", reviewer);
    if (parentTask) properties["Parent item"] = notion.buildPropertyPayload("relation", parentTask);

    const blocks = description ? notion.markdownToBlocks(description) : undefined;
    const pageId = await notion.createPage(env.NOTION_TASKS_DB_ID, properties, blocks);
    return `Created task "${title}" (${pageId})`;
  },
);
