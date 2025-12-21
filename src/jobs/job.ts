import { random } from "@elumixor/frontils";
import type { AppContext, FileData, ProgressEvent } from "context";
import type { Context } from "grammy";
import { summarizer } from "services/summarizer";

export class Job {
  readonly id = random.string(32).toLowerCase();
  readonly summarizedName;
  done = false;

  constructor(
    readonly telegramContext: Context,
    readonly userMessage: string,
    readonly messageId: number,
    readonly chatId: number,
  ) {
    console.log(`Created job ${this.id} for message ${userMessage}`);
    this.summarizedName = summarizer.summarizeWorkflow(this.userMessage);
  }

  /**
   * Convert this Job to an AppContext for tool execution
   */
  toAppContext(options?: {
    onProgress?: (event: ProgressEvent) => void;
    onFile?: (file: FileData) => void;
  }): AppContext {
    return {
      id: this.id,
      link: `https://braintrust.dev/trace/${this.id}`, // Placeholder, adjust if needed
      telegramContext: this.telegramContext,
      messageId: this.messageId,
      chatId: this.chatId,
      userMessage: this.userMessage,
      onProgress: options?.onProgress,
      onFile: options?.onFile,
    };
  }
}
