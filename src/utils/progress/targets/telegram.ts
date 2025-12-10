import type { Context } from "grammy";
import { safeEditMessageTextFromContext } from "services/telegram";
import type { ExtractedError, ProgressTarget, Status } from "../index";

/**
 * Telegram target - edits a message to show progress
 */
export class TelegramTarget implements ProgressTarget {
  private lines: string[] = [];
  private lastText?: string;
  private updatePending = false;
  private updateTimeout?: Timer;

  constructor(
    private readonly ctx: Context,
    private readonly messageId: number,
    private readonly debounceMs = 500,
  ) {}

  agent(name: string, status: Status, message?: string): void {
    const icon = status === "start" ? "🤖" : status === "complete" ? "✅" : "❌";
    const statusText = status === "start" ? "working" : status === "complete" ? "done" : "failed";
    const msg = message ? ` - ${message}` : "";

    if (status === "start") {
      this.lines.push(`${icon} **${name}** ${statusText}${msg}`);
    } else {
      // Update the last line for this agent
      const agentLineIndex = this.lines.findLastIndex((l) => l.includes(`**${name}**`));
      if (agentLineIndex !== -1) {
        this.lines[agentLineIndex] = `${icon} **${name}** ${statusText}${msg}`;
      }
    }

    this.scheduleUpdate();
  }

  tool(name: string, status: Status, result?: string): void {
    if (status === "start") return; // Don't show tool start in Telegram

    const icon = status === "complete" ? "→" : "✗";
    const resultText = result ? this.truncate(result, 50) : "";
    this.lines.push(`  ${icon} ${name}${resultText ? `: ${resultText}` : ""}`);

    this.scheduleUpdate();
  }

  message(text: string): void {
    this.lines.push(`  ${text}`);
    this.scheduleUpdate();
  }

  error(error: ExtractedError): void {
    this.lines.push(`❌ Error: ${error.message}`);
    this.scheduleUpdate();
  }

  dispose(): void {
    if (this.updateTimeout) clearTimeout(this.updateTimeout);
  }

  private scheduleUpdate(): void {
    if (this.updatePending) return;

    this.updatePending = true;
    this.updateTimeout = setTimeout(() => this.flushUpdate(), this.debounceMs);
  }

  private async flushUpdate(): Promise<void> {
    this.updatePending = false;

    const text = this.lines.join("\n");
    if (text === this.lastText) return;

    this.lastText = await safeEditMessageTextFromContext(this.ctx, this.messageId, text, this.lastText);
  }

  private truncate(text: string, maxLength: number): string {
    const singleLine = text.replace(/\n/g, " ").trim();
    return singleLine.length > maxLength ? `${singleLine.substring(0, maxLength)}...` : singleLine;
  }
}
