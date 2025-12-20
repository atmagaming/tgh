import type { AppContext, ProgressEvent } from "context/app-context";
import { createTraceLink } from "context/app-context";
import type { Context } from "grammy";
import type { FileData } from "io/output";

export class Job {
  constructor(
    readonly telegramContext: Context,
    readonly userMessage: string,
    readonly messageId: number,
    readonly chatId: number,
  ) {}

  toAppContext(
    traceId: string | null,
    callbacks: {
      onProgress?: (event: ProgressEvent) => void;
      onFile?: (file: FileData) => void;
    },
  ): AppContext {
    return {
      traceId,
      link: createTraceLink(traceId),
      telegramContext: this.telegramContext,
      messageId: this.messageId,
      chatId: this.chatId,
      userMessage: this.userMessage,
      ...callbacks,
    };
  }
}
