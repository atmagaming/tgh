import { random } from "@elumixor/frontils";
import type { Context } from "grammy";
import { getBotInfo } from "services/bot-info";
import { summarizer } from "services/summarizer";

export type ChatType = "private" | "group";

export class Job {
  readonly id = random.string(32).toLowerCase();
  readonly summarizedName = summarizer.summarizeWorkflow(this.userMessage);
  readonly botInfo = getBotInfo();
  done = false;

  constructor(
    readonly telegramContext: Context,
    readonly userMessage: string,
    readonly messageId: number,
    readonly chatType: ChatType,
    readonly chatName: string,
    /** GramJS chat ID for private chat (bot's ID) */
    readonly privateChatId: number,
    /** GramJS chat ID for group chat */
    readonly groupChatId: number,
  ) {}

  /** Returns the appropriate chat ID for GramJS based on chatType */
  get chatId() {
    return this.chatType === "private" ? this.privateChatId : this.groupChatId;
  }
}
