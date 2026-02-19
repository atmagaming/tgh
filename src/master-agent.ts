import { coreTools } from "@tools/core";
import { cancelSignTool, sendForSignTool } from "@tools/signing";
import { skillTools } from "@tools/skills";
import { webSearchTool } from "@tools/web";
import { models } from "models";
import { memories } from "services/memories";
import { skills } from "services/skills";
import { systemPrompt } from "services/system-prompt";
import { StreamingAgent } from "streaming-agent";
import { calendarAgent } from "tools/calendar";
import { updateMemoriesTool } from "tools/core/update-memories";
import { driveAgent } from "tools/drive";
import { emailAgent } from "tools/email";
import { imageAgent } from "tools/image/image-agent";
import { notionAgent } from "tools/notion";
import { projectManagementAgent } from "tools/project-management";
import { wiseAgent } from "tools/wise";

export const masterAgent = new StreamingAgent({
  name: "MasterAgent",
  model: models.thinking,
  modelSettings: { reasoning: { effort: "medium" } },
  instructions: ({ chatType, chatName, botUsername, botName }) =>
    systemPrompt.get().format({
      botName,
      botUsername,
      chatType,
      chatName,
      chatTypeDescription:
        chatType === "group"
          ? "This is the main group chat. You can also access private chat history using the tools."
          : "This is a private chat. You can also access group chat history using the tools.",
      memories: memories.get() ?? "(no memories yet)",
      updateMemoriesToolName: updateMemoriesTool.name,
      skillsSection: skills.getPromptSection(),
    }),
  tools: [
    ...coreTools,
    {
      agent: projectManagementAgent,
      description:
        "Manage project tasks: create, edit, delete, query tasks, assign people. Use for anything related to project management, task tracking, or work assignments.",
    },
    {
      agent: notionAgent,
      description:
        "Manage Notion pages, databases, and people profiles. Use for general Notion operations (not task management).",
    },
    {
      agent: driveAgent,
      description:
        "Manage Google Drive and Google Docs. Accepts a general instruction in a natural language with required ids/links/names.",
    },
    {
      agent: calendarAgent,
      description: "Manage Google Calendar: list events, create/update/delete events, check availability.",
      isSensitive: true,
    },
    {
      agent: wiseAgent,
      description: "Manage Wise account: check balances, view transfers, get exchange rates, download statements.",
      isSensitive: true,
    },
    {
      agent: emailAgent,
      description: "Manage email: check inbox, search, read, compose, reply, send emails across multiple accounts.",
    },
    sendForSignTool,
    cancelSignTool,
    ...skillTools,
    // {
    //   agent: onboardingAgent,
    //   description:
    //     "Coordinate team member onboarding - create Notion entries, generate NDAs, send for signature, add to Telegram",
    // },
    webSearchTool,
    // getAPIBalancesTool,
    { agent: imageAgent, description: "Generate, edit, analyze images, or create 3D models from images" },
  ],
});
