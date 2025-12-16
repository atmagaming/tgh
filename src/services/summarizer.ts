import { GoogleGenAI } from "@google/genai";
import { env } from "env";

export interface SummarizeToolOptions {
  toolName: string;
  input: unknown;
  output: unknown;
}

export interface SummarizeAgentOptions {
  agentName: string;
  task: string;
  result?: string;
}

// Simplified, direct prompts
const TOOL_PROMPT = `Describe this tool's result in 5-10 words. No questions. No tool name.
Input: {{input}}
Output: {{output}}
Example: "Found 3 character files" or "Listed 5 items in folder"`;

const AGENT_PROMPT = `Describe what was done in 5-10 words. No questions. No agent name.
Task: {{task}}
Result: {{result}}
Example: "Found 2D Characters folder" or "Searched drive for assets"`;

class Summarizer {
  private readonly client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  private readonly model = "gemini-2.0-flash"; // Upgraded from flash-lite
  private readonly cache = new Map<string, string>();

  async summarizeTool(options: SummarizeToolOptions): Promise<string> {
    const { toolName, input, output } = options;
    const inputStr = input ? JSON.stringify(input) : "none";
    const outputStr = output ? JSON.stringify(output) : "none";

    const prompt = TOOL_PROMPT.replace("{{input}}", inputStr).replace("{{output}}", outputStr);

    const raw = await this.generate(prompt, `tool:${toolName}:${inputStr.slice(0, 50)}`);
    return this.cleanSummary(raw, toolName);
  }

  async summarizeAgent(options: SummarizeAgentOptions): Promise<string> {
    const { agentName, task, result } = options;

    const prompt = AGENT_PROMPT.replace("{{task}}", task).replace("{{result}}", result ?? "pending");

    const raw = await this.generate(prompt, `agent:${agentName}:${task.slice(0, 50)}`);
    return this.cleanSummary(raw, agentName);
  }

  /** @deprecated Use summarizeTool or summarizeAgent instead */
  async summarize(input: string): Promise<string> {
    return this.generate(`Summarize in 5-10 words: ${input}`, input.slice(0, 100));
  }

  private cleanSummary(summary: string, name: string): string {
    let cleaned = summary;

    // Remove tool/agent name if accidentally included (case-insensitive)
    const nameLower = name.toLowerCase().replace(/_/g, "");
    const patterns = [
      new RegExp(`^${name}:?\\s*`, "i"),
      new RegExp(`^${nameLower}:?\\s*`, "i"),
      new RegExp(`^${name.replace(/_/g, "")}:?\\s*`, "i"),
    ];
    for (const pattern of patterns) cleaned = cleaned.replace(pattern, "");

    // Remove quotes around the whole summary
    cleaned = cleaned.replace(/^["'](.*)["']$/, "$1");

    // Remove question marks and everything after
    if (cleaned.includes("?")) cleaned = cleaned.split("?")[0]?.trim() ?? cleaned;

    // Remove common question starters
    const questionStarters = /^(do you want|would you like|shall I|want me to|should I|can I|may I)\s+/i;
    cleaned = cleaned.replace(questionStarters, "");

    // Remove trailing punctuation except period
    cleaned = cleaned.replace(/[?!]+$/, "").trim();

    // Capitalize first letter
    if (cleaned.length > 0) cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    return cleaned || "Completed";
  }

  private async generate(prompt: string, cacheKey: string): Promise<string> {
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [{ text: prompt }],
      });

      const summary = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (summary) this.cache.set(cacheKey, summary);
      return summary || "Processing...";
    } catch {
      return "Processing...";
    }
  }
}

export const summarizer = new Summarizer();
