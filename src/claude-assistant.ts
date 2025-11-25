import Anthropic from "@anthropic-ai/sdk";

export class ClaudeAssistant {
  private readonly client = new Anthropic({ apiKey: this.apiKey });

  constructor(private readonly apiKey: string) {}

  async processMessage(userMessage: string): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: userMessage }],
    });

    const firstBlock = response.content[0];
    return firstBlock?.type === "text" ? firstBlock.text : "I couldn't process that request.";
  }
}
