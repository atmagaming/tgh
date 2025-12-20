import type { AppContext, ProgressEvent } from "context/app-context";
import { env } from "env";
import type { Context } from "grammy";
import type { FileData } from "io/output";

export class Job {
  readonly id = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  readonly link = `${env.BASE_URL}/jobs/${this.id}`;

  constructor(
    readonly telegramContext: Context,
    readonly userMessage: string,
    readonly messageId: number,
    readonly chatId: number,
  ) {}

  toAppContext(callbacks: {
    onProgress?: (event: ProgressEvent) => void;
    onFile?: (file: FileData) => void;
  }): AppContext {
    return {
      id: this.id,
      link: this.link,
      telegramContext: this.telegramContext,
      messageId: this.messageId,
      chatId: this.chatId,
      userMessage: this.userMessage,
      ...callbacks,
    };
  }
}
