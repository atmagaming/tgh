import { MasterAgent } from "agents/master-agent/master-agent";
import { env } from "env";
import { Bot } from "grammy";
import { logger } from "logger";
import { replyWithLongMessage } from "services/telegram";
import { formatError, isBotMentioned, isImageDocument } from "utils";
import { Output, TelegramOutputTarget } from "utils/output";
import { Progress, TelegramTarget } from "utils/progress";

export class App {
  readonly bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  private botUsername = "";
  private masterAgent = new MasterAgent();

  constructor() {
    this.bot.api.getMe().then((me) => {
      this.botUsername = me.username ?? "";
      logger.info({ username: me.username, userId: me.id }, "Bot initialized");
    });

    this.bot.on("message", async (ctx) => {
      const isGroupChat = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";

      if (isGroupChat) {
        if (ctx.chat?.id !== env.ALLOWED_CHAT_ID) return;
        if (!isBotMentioned(ctx.message, this.botUsername)) return;
        logger.info({ username: ctx.from?.username, userId: ctx.from?.id }, "Received mention in group");
      } else if (ctx.from?.id !== env.ALLOWED_USER_ID) return;

      await ctx.replyWithChatAction("typing");

      try {
        logger.info(
          {
            messageId: ctx.message.message_id,
            text: ctx.message.text || ctx.message.caption,
            hasImage: !!ctx.message.photo || (!!ctx.message.document && isImageDocument(ctx.message.document)),
            replyToMessageId: ctx.message.reply_to_message?.message_id,
            replyToText: ctx.message.reply_to_message?.text || ctx.message.reply_to_message?.caption,
            replyToHasImage:
              !!ctx.message.reply_to_message?.photo ||
              (!!ctx.message.reply_to_message?.document && isImageDocument(ctx.message.reply_to_message.document)),
          },
          "Processing incoming message",
        );

        const userMessage = ctx.message.text || ctx.message.caption || "";

        if (!userMessage) return;

        // Create progress tracker with Telegram target for status updates
        const progress = new Progress();
        const statusMessage = await ctx.reply("Processing...", {
          reply_parameters: { message_id: ctx.message.message_id },
        });
        progress.addTarget(new TelegramTarget(ctx, statusMessage.message_id));

        // Create output handler with Telegram target for file outputs
        const output = new Output({ cleanupAfterSend: false }); // Don't cleanup - files may be needed for further operations
        output.addTarget(new TelegramOutputTarget(ctx, ctx.message.message_id, statusMessage.message_id));

        const result = await this.masterAgent.processTask(userMessage, {
          telegramCtx: ctx,
          messageId: ctx.message.message_id,
          progress,
          output,
        });

        // Clean up progress and status message
        progress.clearTargets();
        await ctx.api.deleteMessage(ctx.chat.id, statusMessage.message_id).catch(() => {});

        if (!result.success) throw new Error(result.error ?? "Master agent task failed");

        logger.info("Master agent completed");

        if (result.result) {
          const replyOptions: { reply_parameters: { message_id: number }; message_thread_id?: number } = {
            reply_parameters: { message_id: ctx.message.message_id },
          };
          if (ctx.message.message_thread_id) replyOptions.message_thread_id = ctx.message.message_thread_id;
          await replyWithLongMessage(ctx, result.result, replyOptions);
        }
      } catch (error) {
        logger.error({ error: formatError(error) }, "Error processing message");
        await ctx.reply("Sorry, I encountered an error processing your request.");
      }
    });
  }
}
