import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Context } from "grammy";
import { InputFile } from "grammy";
import { logger } from "logger";
import { detectMimeType } from "utils/temp-files";
import type { FileOutput, OutputTarget } from "../index";

/**
 * Telegram target - sends files as photos/documents to Telegram chat
 */
export class TelegramOutputTarget implements OutputTarget {
  constructor(
    private readonly ctx: Context,
    private readonly replyToMessageId?: number,
    private readonly progressMessageId?: number,
  ) {}

  async sendFiles(files: FileOutput[]): Promise<void> {
    if (files.length === 0) return;

    const chatId = this.ctx.chat?.id;
    const threadId = this.ctx.message?.message_thread_id;
    if (!chatId) return;

    // Delete progress message on first file
    if (this.progressMessageId) {
      try {
        await this.ctx.api.deleteMessage(chatId, this.progressMessageId);
      } catch (error) {
        logger.debug({ error: error instanceof Error ? error.message : error }, "Failed to delete progress message");
      }
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      const buffer = await fs.readFile(file.path);
      const filename = file.filename ?? path.basename(file.path);
      const mimeType = file.mimeType ?? detectMimeType(file.path);
      const isImage = mimeType.startsWith("image/");

      // Reply to original message only for first file
      const replyParams = i === 0 && this.replyToMessageId ? { message_id: this.replyToMessageId } : undefined;

      if (isImage) {
        // Send as photo first (compressed preview)
        await this.ctx.api.sendChatAction(chatId, "upload_photo", { message_thread_id: threadId });

        const photoMessage = await this.ctx.api.sendPhoto(chatId, new InputFile(buffer, "photo.png"), {
          caption: file.caption,
          message_thread_id: threadId,
          reply_parameters: replyParams,
        });

        // Then send as document (full quality)
        await this.ctx.api.sendChatAction(chatId, "upload_document", { message_thread_id: threadId });

        await this.ctx.api.sendDocument(chatId, new InputFile(buffer, filename), {
          caption: "Full quality",
          reply_parameters: { message_id: photoMessage.message_id },
          message_thread_id: threadId,
        });
      } else {
        // Send as document only
        await this.ctx.api.sendChatAction(chatId, "upload_document", { message_thread_id: threadId });

        await this.ctx.api.sendDocument(chatId, new InputFile(buffer, filename), {
          caption: file.caption,
          message_thread_id: threadId,
          reply_parameters: replyParams,
        });
      }
    }
  }
}
