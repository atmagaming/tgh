import { models } from "models";
import { StreamingAgent } from "streaming-agent";
import { getPeopleTool } from "tools/notion/tools/get-people";
import { getTasksTool } from "tools/notion/tools/get-tasks";
import { createTaskTool, deleteTaskTool, editTaskTool } from "./tools";

const PROMPT = `You manage project tasks for TGH.

Tools:
- GetTasks: query tasks with filters (status, assignee, date, etc.)
- CreateTask: create new tasks with properties
- EditTask: update task properties or description
- DeleteTask: archive a task
- GetPeople: look up team members to find their Notion page IDs for assignee/developer/reviewer fields

When creating or editing tasks, always resolve person names to their Notion page IDs first using GetPeople.`;

export const projectManagementAgent = new StreamingAgent({
  name: "ProjectManagementAgent",
  model: models.nano,
  instructions: PROMPT,
  tools: [getTasksTool, createTaskTool, editTaskTool, deleteTaskTool, getPeopleTool],
});
