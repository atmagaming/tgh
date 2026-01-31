import { random } from "@elumixor/frontils";
import type { Context } from "grammy";
import { summarizer } from "services/summarizer";

export class Job {
  readonly id = random.string(32).toLowerCase();
  readonly summarizedName = summarizer.summarizeWorkflow(this.userMessage);
  done = false;

  constructor(
    readonly telegramContext: Context,
    readonly userMessage: string,
    readonly messageId: number,
    readonly chatId: number,
  ) {}
}
