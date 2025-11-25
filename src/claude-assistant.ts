import Anthropic from "@anthropic-ai/sdk";

export class ClaudeAssistant {
  private readonly client = new Anthropic({ apiKey: this.apiKey });
  private readonly tools = [
    {
      name: "get_weather",
      description: "Get the current weather for a location",
      input_schema: {
        type: "object",
        properties: {
          location: { type: "string", description: "City name or location" },
        },
        required: ["location"],
      },
    },
    {
      name: "set_reminder",
      description: "Set a reminder for the user",
      input_schema: {
        type: "object",
        properties: {
          message: { type: "string", description: "Reminder message" },
          time: { type: "string", description: "When to remind (e.g., '2 hours', 'tomorrow at 9am')" },
        },
        required: ["message", "time"],
      },
    },
  ] as const;

  constructor(private readonly apiKey: string) {}

  async processMessage(userMessage: string): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      tools: this.tools,
      messages: [{ role: "user", content: userMessage }],
    });

    const content = response.content[0];

    if (content.type === "tool_use") {
      const toolResult = this.executeToolCall(content);
      return `Executed: ${content.name}\nResult: ${toolResult}`;
    }

    return content.type === "text" ? content.text : "I couldn't process that request.";
  }

  private executeToolCall(toolUse: Anthropic.Messages.ToolUseBlock): string {
    switch (toolUse.name) {
      case "get_weather": {
        const { location } = toolUse.input as { location: string };
        return `Weather in ${location}: Sunny, 22°C (This is a mock response)`;
      }
      case "set_reminder": {
        const { message, time } = toolUse.input as { message: string; time: string };
        return `Reminder set: "${message}" for ${time} (This is a mock response)`;
      }
      default:
        return "Unknown tool";
    }
  }
}
