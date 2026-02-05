import { JobProvider, Main } from "app-view";
import { env } from "env";
import { Bot } from "grammy";
import { GroupRenderer, TelegramRenderer } from "io/output";
import { Job } from "jobs/job";
import { JobQueue } from "jobs/job-queue";
import { logger } from "logger";
import { getBotInfo, setBotInfo } from "services/bot-info";
import { chatHistoryStore } from "services/chat-history/chat-history-store";
import { isBotMentioned } from "utils";

export class App {
  readonly bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  private jobQueue = new JobQueue(this.processJob.bind(this));

  constructor() {
    this.bot.api.getMe().then((me) => {
      setBotInfo({
        id: me.id,
        username: me.username ?? "",
        firstName: me.first_name,
      });
    });

    this.bot.on("message", (ctx) => {
      // Only allow messages from authorized user or allowed group that mentions the bot
      if (ctx.chat?.type === "group" || ctx.chat?.type === "supergroup") {
        if (ctx.chat?.id !== env.ALLOWED_CHAT_ID) return;
        if (!isBotMentioned(ctx.message, getBotInfo().username)) return;
      } else if (ctx.from?.id !== env.ALLOWED_USER_ID) return;

      const messageId = ctx.message.message_id;
      const userMessage = ctx.message.text ?? ctx.message.caption;
      const repliedToMessage = ctx.message.reply_to_message;

      logger.info(
        {
          messageId,
          userMessage,
          replyToMessage: repliedToMessage,
        },
        "Received message",
      );

      if (!userMessage) return;

      // Record message to chat history
      chatHistoryStore.addMessage(ctx.chat.id, ctx.message);

      const chatType = ctx.chat.type === "private" ? "private" : "group";
      const chatName =
        ctx.chat.type === "private"
          ? `${ctx.chat.first_name ?? ""} ${ctx.chat.last_name ?? ""}`.trim()
          : "title" in ctx.chat
            ? ctx.chat.title
            : "Unknown";

      this.jobQueue.enqueue(
        new Job(
          ctx,
          userMessage,
          ctx.message.message_id,
          chatType,
          chatName,
          getBotInfo().id, // privateChatId (bot's ID for GramJS)
          env.ALLOWED_CHAT_ID, // groupChatId
        ),
      );
    });
  }

  private async processJob(job: Job): Promise<void> {
    const telegramRenderer = new TelegramRenderer(job.telegramContext);
    const renderer = new GroupRenderer(telegramRenderer);

    await renderer.render(
      <JobProvider job={job}>
        <Main />
      </JobProvider>,
    );
  }
}
