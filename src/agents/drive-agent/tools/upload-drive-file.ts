import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Readable } from "node:stream";
import type { Tool } from "agents/agent";
import { env } from "env";
import { logger } from "logger";
import { getDriveClient } from "services/google-drive/google-drive";
import { detectMimeType } from "utils/temp-files";

export const uploadDriveFileTool: Tool = {
  definition: {
    name: "upload_drive_file",
    description:
      "Upload a file to Google Drive. Accepts multiple input types: Telegram message_id, local file path, URL, or base64 data. IMPORTANT: You must specify a folder_id - service accounts cannot upload to root.",
    input_schema: {
      type: "object",
      properties: {
        // Option 1: Telegram message
        message_id: {
          type: "number",
          description: "Telegram message ID containing the file to upload.",
        },
        // Option 2: Local file path
        file_path: {
          type: "string",
          description: "Local file path (e.g., from download_drive_file or generate_image temp files).",
        },
        // Option 3: URL
        url: {
          type: "string",
          description: "URL to download and upload to Drive.",
        },
        // Option 4: Base64 data
        base64_data: {
          type: "string",
          description: "Base64-encoded file data (use with mime_type).",
        },
        mime_type: {
          type: "string",
          description: "MIME type for base64 data (e.g., 'image/png'). Required when using base64_data.",
        },
        // Common parameters
        folder_id: {
          type: "string",
          description: "Destination folder ID. REQUIRED. Get from list_drive_files or create with create_drive_folder.",
        },
        file_name: {
          type: "string",
          description: "Custom filename for Drive. If not provided, inferred from source.",
        },
      },
      required: ["folder_id"],
    },
  },
  execute: async (toolInput, context) => {
    const folderId = toolInput.folder_id as string;
    const customFileName = toolInput.file_name as string | undefined;

    let buffer: Buffer;
    let inferredFileName: string;
    let mimeType: string;

    // Option 1: Telegram message
    if (toolInput.message_id && context?.telegramCtx) {
      const result = await getFileFromTelegram(toolInput.message_id as number, context.telegramCtx);
      buffer = result.buffer;
      inferredFileName = result.fileName;
      mimeType = result.mimeType;
    }
    // Option 2: Local file path
    else if (toolInput.file_path) {
      const filePath = toolInput.file_path as string;
      buffer = await fs.readFile(filePath);
      inferredFileName = path.basename(filePath);
      mimeType = detectMimeType(filePath);
    }
    // Option 3: URL
    else if (toolInput.url) {
      const url = toolInput.url as string;
      const result = await getFileFromUrl(url);
      buffer = result.buffer;
      inferredFileName = result.fileName;
      mimeType = result.mimeType;
    }
    // Option 4: Base64 data
    else if (toolInput.base64_data) {
      buffer = Buffer.from(toolInput.base64_data as string, "base64");
      inferredFileName = "upload";
      mimeType = (toolInput.mime_type as string) ?? "application/octet-stream";
    } else {
      throw new Error("No file source provided. Use message_id, file_path, url, or base64_data.");
    }

    const finalFileName = customFileName ?? inferredFileName;

    logger.info({ folderId, fileName: finalFileName, size: buffer.length, mimeType }, "Uploading to Drive");

    const drive = getDriveClient();
    const response = await drive.files.create({
      requestBody: {
        name: finalFileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: "id, name, webViewLink",
    });

    const uploadedFile = response.data;

    logger.info({ fileId: uploadedFile.id, fileName: uploadedFile.name }, "File uploaded to Drive");

    return {
      success: true,
      file_id: uploadedFile.id,
      file_name: uploadedFile.name,
      web_view_link: uploadedFile.webViewLink,
      message: `File "${finalFileName}" uploaded successfully`,
    };
  },
};

async function getFileFromTelegram(
  messageId: number,
  ctx: import("grammy").Context,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  const chatId = ctx.chat?.id;
  if (!chatId) throw new Error("No chat context");

  // Forward message to get file info
  const message = await ctx.api.forwardMessage(chatId, chatId, messageId);

  let fileId: string | undefined;
  let fileName: string;
  let mimeType: string;

  if (message.document) {
    fileId = message.document.file_id;
    fileName = message.document.file_name ?? "document";
    mimeType = message.document.mime_type ?? "application/octet-stream";
  } else if (message.photo) {
    fileId = message.photo.at(-1)?.file_id;
    fileName = "photo.jpg";
    mimeType = "image/jpeg";
  } else if (message.video) {
    fileId = message.video.file_id;
    fileName = message.video.file_name ?? "video.mp4";
    mimeType = message.video.mime_type ?? "video/mp4";
  } else {
    throw new Error("No file found in message");
  }

  if (!fileId) throw new Error("File ID not found");

  const file = await ctx.api.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error(`Failed to download from Telegram: ${response.statusText}`);

  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), fileName, mimeType };
}

async function getFileFromUrl(url: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch URL: ${response.statusText}`);

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Try to extract filename from URL
  const urlPath = new URL(url).pathname;
  const fileName = path.basename(urlPath) || "download";

  // Get mimeType from response or infer from filename
  let mimeType = response.headers.get("content-type") ?? "application/octet-stream";
  if (mimeType === "application/octet-stream") mimeType = detectMimeType(fileName);

  return { buffer, fileName, mimeType };
}
