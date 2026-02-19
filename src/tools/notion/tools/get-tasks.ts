import { env } from "env";
import { notion } from "services/notion";
import { buildTaskFilter } from "services/notion/notion-task-filter";
import { defineTool } from "streaming-agent";
import { z } from "zod";

const DEFAULT_PROPS = ["Status", "Date", "Assignee", "Developer", "Reviewer"];

export const getTasksTool = defineTool(
  "GetTasks",
  "Fetch tasks from the Tasks database with optional filters and subtask expansion.",
  z.object({
    includeProperties: z
      .array(z.string())
      .nullable()
      .describe(
        "Property names to include as attributes; null for defaults (Status, Date, Assignee, Developer, Reviewer)",
      ),
    includeChildren: z.boolean().describe("Whether to fetch and nest subtasks"),
    filter: z.object({
      dateMin: z.string().nullable().describe("ISO date: include tasks on or after this date"),
      dateMax: z.string().nullable().describe("ISO date: include tasks on or before this date"),
      assignee: z.string().nullable().describe("Filter by assignee Notion page ID"),
      developer: z.string().nullable().describe("Filter by developer Notion page ID"),
      reviewer: z.string().nullable().describe("Filter by reviewer Notion page ID"),
      status: z.string().nullable().describe("Filter by status, e.g. 'In Review', 'Done'"),
      title: z.string().nullable().describe("Filter by title text (partial match)"),
    }),
    limit: z.number().nullable().describe("Max tasks to return, default 50"),
  }),
  async ({ includeProperties, includeChildren, filter, limit }) => {
    const notionFilter = buildTaskFilter(filter);
    const pages = await notion.queryDatabase(env.NOTION_TASKS_DB_ID, {
      filter: notionFilter,
      sorts: [{ property: "Date", direction: "ascending" }],
      limit: limit ?? 50,
    });

    const propsToShow = includeProperties ?? DEFAULT_PROPS;
    const taskLines = await Promise.all(pages.map((p) => p.toTaskXML(propsToShow, includeChildren, notion)));
    return `<tasks total="${pages.length}">\n${taskLines.join("\n")}\n</tasks>`;
  },
);
