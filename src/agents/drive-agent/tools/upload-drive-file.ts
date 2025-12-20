import { tool } from "@openai/agents";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Readable } from "node:stream";
import { logger } from "logger";
import { getDriveClient } from "services/google-drive/google-drive";
import { detectMimeType } from "utils/files";
import { z } from "zod";

export const uploadDriveFileTool = tool({
  name: "upload_drive_file",
  description:
    "Upload a file to Google Drive. Accepts multiple input types: Telegram message_id, local file path, URL, or base64 data. IMPORTANT: You must specify a folder_id - service accounts cannot upload to root.",
  parameters: z.object({
    // Option 1: Telegram message
    message_id: z.number().optional().describe("Telegram message ID containing the file to upload."),
    // Option 2: Local file path
    file_path: z
      .string()
      .optional()
      .describe("Local file path (e.g., from download_drive_file or generate_image temp files)."),
    // Option 3: URL
    url: z.string().optional().describe("URL to download and upload to Drive."),
    // Option 4: Base64 data
    base64_data: z.string().optional().describe("Base64-encoded file data (use with mime_type)."),
    mime_type: z
      .string()
      .optional()
      .describe("MIME type for base64 data (e.g., 'image/png'). Required when using base64_data."),
    // Common parameters
    folder_id: z
      .string()
      .describe("Destination folder ID. REQUIRED. Get from list_drive_files or create with create_drive_folder."),
    file_name: z.string().optional().describe("Custom filename for Drive. If not provided, inferred from source."),
  }),
  execute: async ({ message_id, file_path, url, base64_data, mime_type, folder_id, file_name }) => {
    let buffer: Buffer;
    let inferredFileName: string;
    let mimeType: string;

    // Option 1: Telegram message
    if (message_id) {
      // const result = await getFileFromTelegram(message_id, context.telegramContext);
      // buffer = result.buffer;
      // inferredFileName = result.fileName;
      // mimeType = result.mimeType;
      throw new Error("Uploading from Telegram message_id is temporarily disabled (no context)");
    }
    // Option 2: Local file path
    else if (file_path) {
      buffer = await fs.readFile(file_path);
      inferredFileName = path.basename(file_path);
      mimeType = detectMimeType(file_path);
    }
    // Option 3: URL
    else if (url) {
      const result = await getFileFromUrl(url);
      buffer = result.buffer;
      inferredFileName = result.fileName;
      mimeType = result.mimeType;
    }
    // Option 4: Base64 data
    else if (base64_data) {
      buffer = Buffer.from(base64_data, "base64");
      inferredFileName = "upload";
      mimeType = mime_type ?? "application/octet-stream";
    } else {
      throw new Error("No file source provided. Use message_id, file_path, url, or base64_data.");
    }

    const finalFileName = file_name ?? inferredFileName;

    logger.info({ folderId: folder_id, fileName: finalFileName, size: buffer.length, mimeType }, "Uploading to Drive");

    const drive = getDriveClient();
    const response = await drive.files.create({
      requestBody: {
        name: finalFileName,
        parents: [folder_id],
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
});

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
