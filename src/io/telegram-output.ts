import type { Context } from "grammy";
import { InputFile } from "grammy";
import { logger } from "logger";
import { summarizer } from "services/summarizer";
import { splitMessage } from "services/telegram/telegram-message-splitter";
import { markdownToTelegramHtml } from "utils";
import type { Output } from "./output";
import type { Block, BlockContent, BlockHandle, BlockState, FileData, MessageContent, MessageHandle } from "./types";

type Operation =
  | { type: "append"; text: string }
  | { type: "replaceWith"; text: string }
  | { type: "addPhoto"; file: FileData }
  | { type: "addFile"; file: FileData }
  | { type: "clear" };

// Convert snake_case to CamelCase
function toCamelCase(name: string): string {
  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

// Format name: "drive_agent" -> "Drive", "search_drive_files" -> "SearchDriveFiles"
function formatName(name: string, type: "agent" | "tool"): string {
  const camelName = toCamelCase(name);
  if (type === "agent") return camelName.replace(/Agent$/i, "");
  return camelName;
}

// Get status indicator based on state
function getStatusIndicator(state: BlockState): string {
  if (state === "completed") return "✓";
  if (state === "error") return "✖";
  return "...";
}

// Compute effective state: parent is in_progress if any child is in_progress
function getEffectiveState(block: Block): BlockState {
  if (block.state === "error") return "error";
  const hasInProgressChild = block.children.some((c) => getEffectiveState(c) === "in_progress");
  if (hasInProgressChild) return "in_progress";
  return block.state;
}

function formatBlock(block: Block, verbose: boolean, depth = 0): string {
  // Skip MasterAgent blocks - format only their children
  if (block.content.type === "agent" && block.content.name.toLowerCase().includes("master")) {
    return block.children.map((child) => formatBlock(child, verbose, depth)).join("\n");
  }

  const indent = "  ".repeat(depth);
  const content = block.content;
  const effectiveState = getEffectiveState(block);
  const status = getStatusIndicator(effectiveState);

  if (content.type === "agent") {
    const name = formatName(content.name, "agent");
    // Show summary first (cleaned), then fall back to task
    const summary = content.summary ?? content.task;

    // Format: Name: summary [status]
    let line = `${indent}${name}`;
    if (summary) line += `: ${summary}`;
    line += ` ${status}`;

    // Add children
    const childLines = block.children.map((child) => formatBlock(child, verbose, depth + 1)).filter(Boolean);
    if (childLines.length > 0) return `${line}\n${childLines.join("\n")}`;
    return line;
  }

  if (content.type === "tool") {
    const name = formatName(content.name, "tool");
    // Show only summary - no raw JSON
    const summary = content.error ?? content.summary;

    // Format: └ <b>ToolName</b>: summary [status]
    let line = `${indent}└ <b>${name}</b>`;
    if (summary) line += `: ${summary}`;
    line += ` ${status}`;

    return line;
  }

  if (content.type === "text") return `${indent}${content.text}`;
  if (content.type === "file") return `${indent}${content.data.filename ?? "file"}`;
  if (content.type === "error") return `${indent}${content.message}`;

  return "";
}

function formatBlocks(blocks: Block[], verbose: boolean, jobLink?: string): string {
  const blockText = blocks.map((block) => formatBlock(block, verbose)).join("\n");
  if (jobLink) {
    // Check if any block is still in progress
    const isProcessing = blocks.some((b) => getEffectiveState(b) === "in_progress");
    const linkText = isProcessing ? "Processing..." : "Job Details";
    // Use markdown link syntax - will be converted to HTML by markdownToTelegramHtml
    return `[${linkText}](${jobLink})\n${blockText}`;
  }
  return blockText;
}

class TelegramBlockHandle implements BlockHandle {
  private _state: BlockState = "in_progress";
  private _content: BlockContent;

  constructor(
    private readonly block: Block,
    private readonly updateFn: () => void,
    private readonly verbose: boolean,
  ) {
    this._content = block.content;
  }

  get state(): BlockState {
    return this._state;
  }

  set state(value: BlockState) {
    this._state = value;
    this.block.state = value;
    this.updateFn();
  }

  get content(): BlockContent {
    return this._content;
  }

  set content(value: BlockContent) {
    this._content = value;
    this.block.content = value;
    if (!this.verbose) this.triggerSummarization();
    this.updateFn();
  }

  addChild(content: BlockContent): BlockHandle {
    const child: Block = {
      id: Math.random().toString(36).substring(2, 9),
      state: "in_progress",
      content,
      children: [],
    };
    this.block.children.push(child);
    this.updateFn();
    return new TelegramBlockHandle(child, this.updateFn, this.verbose);
  }

  private triggerSummarization(): void {
    const content = this.block.content;

    if (content.type === "tool") {
      summarizer
        .summarizeTool({
          toolName: content.name,
          input: content.input,
          output: content.result,
        })
        .then((summary) => {
          (content as { summary?: string }).summary = summary;
          this.updateFn();
        });
    } else if (content.type === "agent") {
      summarizer
        .summarizeAgent({
          agentName: content.name,
          task: content.task ?? "unknown task",
          result: content.result,
        })
        .then((summary) => {
          (content as { summary?: string }).summary = summary;
          this.updateFn();
        });
    }
  }
}

class TelegramMessageHandle implements MessageHandle {
  private text: string;
  private lastSentText?: string;
  private messageIds: number[] = [];
  private deleted = false;
  private blocks: Block[] = [];

  private queue: Operation[] = [];
  private processing = false;
  private debounceTimeout?: Timer;

  constructor(
    private readonly ctx: Context,
    content: MessageContent,
    private readonly replyToMessageId?: number,
    private readonly debounceMs = 500,
    private readonly verbose = false,
    existingMessageId?: number,
    private readonly jobLink?: string,
  ) {
    this.text = content.text;
    if (existingMessageId) {
      // Use existing message instead of creating new one
      this.messageIds = [existingMessageId];
      this.lastSentText = content.text;
    } else {
      this.sendInitialMessage(content);
    }
  }

  createBlock(content: BlockContent): BlockHandle {
    const block: Block = {
      id: Math.random().toString(36).substring(2, 9),
      state: "in_progress",
      content,
      children: [],
    };
    this.blocks.push(block);
    this.updateBlocksDisplay();
    return new TelegramBlockHandle(block, () => this.updateBlocksDisplay(), this.verbose);
  }

  private updateBlocksDisplay(): void {
    const blockText = formatBlocks(this.blocks, this.verbose, this.jobLink);
    this.replaceWith(blockText);
  }

  append(text: string): void {
    this.enqueue({ type: "append", text });
  }

  addPhoto(file: FileData): void {
    this.enqueue({ type: "addPhoto", file });
  }

  addFile(file: FileData): void {
    this.enqueue({ type: "addFile", file });
  }

  replaceWith(text: string): void {
    this.enqueue({ type: "replaceWith", text });
  }

  clear(): void {
    this.enqueue({ type: "clear" });
  }

  private enqueue(op: Operation): void {
    // For text operations, debounce
    if (op.type === "append" || op.type === "replaceWith") {
      // Apply to local text immediately
      if (op.type === "append") this.text += `\n${op.text}`;
      else this.text = op.text;

      // Clear any pending debounce and set new one
      if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
      this.debounceTimeout = setTimeout(() => {
        this.queue.push({ type: "replaceWith", text: this.text });
        this.processQueue();
      }, this.debounceMs);
    } else {
      this.queue.push(op);
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const op = this.queue.shift();
      if (!op) continue;

      try {
        await this.executeOperation(op);
      } catch (error) {
        logger.error(
          { error: error instanceof Error ? error.message : error, op: op.type },
          "TelegramOutput: op failed",
        );
      }
    }

    this.processing = false;
  }

  private async executeOperation(op: Operation): Promise<void> {
    if (this.deleted && op.type !== "addPhoto" && op.type !== "addFile") return;

    const chatId = this.ctx.chat?.id;
    const threadId = this.ctx.message?.message_thread_id;
    if (!chatId) return;

    switch (op.type) {
      case "replaceWith": {
        if (op.text === this.lastSentText) break;

        const htmlText = markdownToTelegramHtml(op.text);
        const chunks = splitMessage(htmlText);
        const newMessageIds: number[] = [];

        // Edit existing messages and send new ones as needed
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          if (!chunk) continue;

          const existingMsgId = this.messageIds[i];
          if (existingMsgId !== undefined) {
            // Edit existing message
            try {
              await this.ctx.api.editMessageText(chatId, existingMsgId, chunk.text, { parse_mode: "HTML" });
            } catch (error) {
              logger.debug({ error: error instanceof Error ? error.message : error }, "Failed to edit message");
            }
            newMessageIds.push(existingMsgId);
          } else {
            // Send new message, replying to the previous one
            const replyTo = i === 0 ? this.replyToMessageId : newMessageIds[i - 1];
            try {
              const sendOptions: {
                message_thread_id?: number;
                reply_parameters?: { message_id: number };
                parse_mode: "HTML";
              } = { parse_mode: "HTML" };
              if (threadId) sendOptions.message_thread_id = threadId;
              if (replyTo) sendOptions.reply_parameters = { message_id: replyTo };

              const msg = await this.ctx.api.sendMessage(chatId, chunk.text, sendOptions);
              newMessageIds.push(msg.message_id);
            } catch (error) {
              logger.error({ error: error instanceof Error ? error.message : error }, "Failed to send new chunk");
            }
          }
        }

        // Delete extra messages if new text has fewer chunks
        for (const msgId of this.messageIds.slice(chunks.length)) {
          try {
            await this.ctx.api.deleteMessage(chatId, msgId);
          } catch (error) {
            logger.debug({ error: error instanceof Error ? error.message : error }, "Failed to delete extra message");
          }
        }

        this.messageIds = newMessageIds;
        this.lastSentText = op.text;
        break;
      }

      case "addPhoto": {
        await this.ctx.api.sendChatAction(chatId, "upload_photo", { message_thread_id: threadId });
        const replyParams = this.replyToMessageId ? { message_id: this.replyToMessageId } : undefined;
        await this.ctx.api.sendPhoto(chatId, new InputFile(op.file.buffer, op.file.filename ?? "photo.png"), {
          message_thread_id: threadId,
          reply_parameters: replyParams,
        });
        break;
      }

      case "addFile": {
        await this.ctx.api.sendChatAction(chatId, "upload_document", { message_thread_id: threadId });
        const replyParams = this.replyToMessageId ? { message_id: this.replyToMessageId } : undefined;
        await this.ctx.api.sendDocument(chatId, new InputFile(op.file.buffer, op.file.filename ?? "file"), {
          message_thread_id: threadId,
          reply_parameters: replyParams,
        });
        break;
      }

      case "clear": {
        for (const msgId of this.messageIds) {
          try {
            await this.ctx.api.deleteMessage(chatId, msgId);
          } catch (error) {
            logger.debug({ error: error instanceof Error ? error.message : error }, "Failed to delete message");
          }
        }
        this.messageIds = [];
        this.deleted = true;
        break;
      }
    }
  }

  private async sendInitialMessage(content: MessageContent): Promise<void> {
    const chatId = this.ctx.chat?.id;
    const threadId = this.ctx.message?.message_thread_id;
    if (!chatId) return;

    try {
      const htmlText = markdownToTelegramHtml(content.text || "...");
      const chunks = splitMessage(htmlText);

      let previousMessageId = this.replyToMessageId;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk) continue;

        const sendOptions: {
          message_thread_id?: number;
          reply_parameters?: { message_id: number };
          parse_mode: "HTML";
        } = { parse_mode: "HTML" };
        if (threadId) sendOptions.message_thread_id = threadId;
        if (previousMessageId) sendOptions.reply_parameters = { message_id: previousMessageId };

        const msg = await this.ctx.api.sendMessage(chatId, chunk.text, sendOptions);
        this.messageIds.push(msg.message_id);
        previousMessageId = msg.message_id;

        if (i < chunks.length - 1) await new Promise((resolve) => setTimeout(resolve, 50));
      }

      this.lastSentText = content.text || "...";

      // Send initial files if any
      if (content.files) {
        for (const file of content.files) {
          const isImage = file.mimeType.startsWith("image/");
          if (isImage) this.addPhoto(file);
          else this.addFile(file);
        }
      }
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : error }, "TelegramOutput: initial send failed");
    }
  }
}

export class TelegramOutput implements Output {
  constructor(
    private readonly ctx: Context,
    private readonly replyToMessageId?: number,
    private readonly debounceMs = 500,
    private readonly verbose = false,
    private readonly existingMessageId?: number,
    private readonly jobLink?: string,
  ) {}

  sendMessage(content: MessageContent): MessageHandle {
    return new TelegramMessageHandle(
      this.ctx,
      content,
      this.replyToMessageId,
      this.debounceMs,
      this.verbose,
      this.existingMessageId,
      this.jobLink,
    );
  }
}
