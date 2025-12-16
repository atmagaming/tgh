import { MasterAgent } from "agents/master-agent/master-agent";
import { env } from "env";
import { Bot } from "grammy";
import { JobStoreOutput, OutputGroup, TelegramOutput } from "io";
import { logger } from "logger";
import { JobQueue } from "services/job-queue";
import { JobStore } from "services/job-store";
import { formatError, isBotMentioned, isImageDocument } from "utils";
import { notifyJobSubscribers } from "web";

export class App {
  readonly bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  readonly jobStore = new JobStore("./data/jobs", { maxJobs: 100 });
  private botUsername = "";
  private masterAgent = new MasterAgent();
  private jobQueue = new JobQueue();

  constructor() {
    this.bot.api.getMe().then((me) => {
      this.botUsername = me.username ?? "";
      logger.info({ username: me.username, userId: me.id }, "Bot initialized");
    });

    // Set up job processor
    this.jobQueue.setHandler(async (job) => {
      // Generate job ID for the job store
      const storeJobId = this.jobStore.generateId();
      let jobStoreOutput: JobStoreOutput | undefined;

      try {
        // Create job link URL for web inspector
        const baseUrl = env.BOT_MODE === "webhook" ? env.WEBHOOK_URL : `http://localhost:${env.PORT}`;
        const jobLink = baseUrl ? `${baseUrl}/jobs/${storeJobId}` : undefined;

        // Create Telegram output using existing status message
        const telegramOutput = new TelegramOutput(
          job.ctx,
          job.messageId,
          500, // debounceMs
          false, // verbose
          job.statusMessageId, // use existing message
          jobLink,
        );

        // Create JobStoreOutput for persistence and web UI
        jobStoreOutput = new JobStoreOutput(
          this.jobStore,
          storeJobId,
          job.userMessage,
          {
            chatId: job.chatId,
            messageId: job.messageId,
            userId: job.ctx.from?.id,
            username: job.ctx.from?.username,
          },
          notifyJobSubscribers,
        );

        // Combine outputs
        const output = new OutputGroup([telegramOutput, jobStoreOutput]);
        const statusMessage = output.sendMessage({ text: "" });

        const result = await this.masterAgent.processTask(job.userMessage, {
          telegramCtx: job.ctx,
          messageId: job.messageId,
          statusMessage,
        });

        if (!result.success) throw new Error(result.error ?? "Master agent task failed");

        logger.info({ jobId: job.id, storeJobId }, "Master agent completed");

        // Mark job as completed
        jobStoreOutput.complete("completed");

        // Append final result to status message (keeping the status visible)
        if (result.result) statusMessage.append(`\n---\n${result.result}`);
      } catch (error) {
        logger.error({ jobId: job.id, storeJobId, error: formatError(error) }, "Error processing job");
        // Mark job as failed
        jobStoreOutput?.complete("error");
        throw error; // Let job queue handle error reporting
      }
    });

    this.bot.on("message", async (ctx) => {
      const isGroupChat = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";

      if (isGroupChat) {
        if (ctx.chat?.id !== env.ALLOWED_CHAT_ID) return;
        if (!isBotMentioned(ctx.message, this.botUsername)) return;
        logger.info({ username: ctx.from?.username, userId: ctx.from?.id }, "Received mention in group");
      } else if (ctx.from?.id !== env.ALLOWED_USER_ID) return;

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
          "Received message",
        );

        const userMessage = ctx.message.text || ctx.message.caption || "";
        if (!userMessage) return;

        // Send initial status message (will be updated via TelegramOutput)
        const statusMsg = await ctx.reply("Processing...", {
          reply_parameters: { message_id: ctx.message.message_id },
        });

        // Queue the job and return immediately
        this.jobQueue.enqueue({
          id: `${ctx.chat.id}-${ctx.message.message_id}`,
          ctx,
          userMessage,
          messageId: ctx.message.message_id,
          statusMessageId: statusMsg.message_id,
          chatId: ctx.chat.id,
          threadId: ctx.message.message_thread_id,
        });
      } catch (error) {
        logger.error({ error: formatError(error) }, "Error queueing message");
        await ctx.reply("Sorry, I encountered an error queueing your request.");
      }
    });
  }
}
