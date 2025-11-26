import Anthropic from "@anthropic-ai/sdk";

export const tools: Anthropic.Tool[] = [
  {
    name: "get_current_time",
    description: "Get the current time in a specific timezone. Use this when users ask about the current time.",
    input_schema: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: "The timezone name (e.g., 'Europe/Prague', 'America/New_York')",
        },
      },
      required: ["timezone"],
    },
  },
];

export function executeTool(toolName: string, toolInput: Record<string, unknown>): string {
  switch (toolName) {
    case "get_current_time": {
      const timezone = toolInput.timezone as string;
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        dateStyle: "full",
        timeStyle: "long",
      });
      return formatter.format(now);
    }
    default:
      return "Unknown tool";
  }
}
