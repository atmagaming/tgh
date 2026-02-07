import { useJob } from "@providers/JobProvider";
import { InputFile } from "grammy";
import type { FileAttachment } from "jobs/job";
import { logger } from "logger";
import { useEffect } from "react";

export function FileAttachments() {
  const job = useJob();

  useEffect(() => {
    const handler = async (file: FileAttachment) => {
      const ctx = job.telegramContext;
      const chatId = ctx.chat?.id;
      if (!chatId) return;

      const threadId = ctx.message?.message_thread_id;
      const inputFile = new InputFile(file.buffer, file.filename);

      try {
        if (file.type === "preview")
          await ctx.api.sendPhoto(chatId, inputFile, {
            message_thread_id: threadId,
            reply_parameters: { message_id: job.messageId },
          });
        else
          await ctx.api.sendDocument(chatId, inputFile, {
            message_thread_id: threadId,
            reply_parameters: { message_id: job.messageId },
          });
      } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : error }, "Failed to send file");
      }
    };

    job.fileAdded.subscribe(handler);
    return () => job.fileAdded.unsubscribe(handler);
  }, [job]);

  return null;
}
