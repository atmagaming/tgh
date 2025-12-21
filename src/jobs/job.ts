import { EventEmitter } from "@elumixor/event-emitter";
import { random } from "@elumixor/frontils";
import type { AppContext, FileData, ProgressEvent } from "context";
import type { ExecutionEvent } from "events/event-types";
import type { Context } from "grammy";
import type { Message } from "grammy/types";
import { summarizer } from "services/summarizer";

export class Job {
  readonly id = random.string(32).toLowerCase();
  readonly summarizedName;
  readonly events = new EventEmitter<ExecutionEvent>();
  done = false;

  constructor(
    readonly telegramContext: Context,
    readonly userMessage: string,
    readonly messageId: number,
    readonly chatId: number,
    readonly repliedToMessage?: Message,
  ) {
    console.log(`Created job ${this.id} for message ${userMessage}`);
    // todo: this should be in the field declaration. But there, this.userMessage is undefined. Why? Previously it was working.
    this.summarizedName = summarizer.summarizeWorkflow(this.userMessage);
  }

  /**
   * Convert this Job to an AppContext for tool execution
   */
  toAppContext(options?: {
    onProgress?: (event: ProgressEvent) => void;
    onFile?: (file: FileData) => void;
    onThinking?: (text: string) => void;
  }): AppContext {
    return {
      id: this.id,
      link: `https://braintrust.dev/trace/${this.id}`, // Placeholder, adjust if needed
      telegramContext: this.telegramContext,
      messageId: this.messageId,
      chatId: this.chatId,
      userMessage: this.userMessage,
      repliedToMessage: this.repliedToMessage,
      events: this.events,
      onProgress: options?.onProgress,
      onFile: options?.onFile,
      onThinking: options?.onThinking,
    };
  }
}
