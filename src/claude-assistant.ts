import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import { executeTool, tools } from "./tools";

export class ClaudeAssistant {
  private client: Anthropic;
  private botUsername?: string;

  constructor() {
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  setBotUsername(username: string) {
    this.botUsername = username;
  }

  async processMessage(userMessage: string): Promise<string> {
    const systemPrompt = `You are @${this.botUsername || "bot"}, a Telegram bot assistant.

Response style:
- Short, concise, minimal
- Professional tone
- No extra information
- Direct answers only
- No pleasantries or filler`;

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: userMessage,
      },
    ];

    try {
      let response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages,
      });

      while (response.stop_reason === "tool_use") {
        const toolUse = response.content.find((block) => block.type === "tool_use");
        if (!toolUse || toolUse.type !== "tool_use") break;

        const toolResult = executeTool(toolUse.name, toolUse.input as Record<string, unknown>);

        messages.push({
          role: "assistant",
          content: response.content,
        });

        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: toolResult,
            },
          ],
        });

        response = await this.client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          tools,
          messages,
        });
      }

      const content = response.content.find((block) => block.type === "text");
      if (content && content.type === "text") {
        return content.text;
      }

      throw new Error("Unexpected response type from Claude");
    } catch (error) {
      console.error("Claude API error:", error);
      throw new Error("Failed to process message with Claude API");
    }
  }
}
