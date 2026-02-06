import { google } from "services/google-api";
import { defineTool } from "streaming-agent";
import { saveTempFile } from "utils/files";
import { z } from "zod";

export const downloadFileTool = defineTool(
  "DownloadFile",
  "Download a file from Google Drive and store it temporarily. Returns a path to the downloaded file",
  z.object({
    fileId: z.string().describe("ID of the file to download"),
    filename: z.string().nullable().describe("Filename, or null (defaults to document name)"),
  }),
  async ({ fileId, filename }) => {
    const file = await google.drive.get(fileId);
    const fileName = filename ?? file?.name ?? "download";
    const mimeType = file?.mimeType ?? "application/octet-stream";

    const fileBuffer = await google.drive.download(fileId);
    const extension = getExtension(fileName, mimeType);
    const tempPath = await saveTempFile(fileBuffer, extension);

    return tempPath;
  },
);

function getExtension(fileName: string, mimeType: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex !== -1) return fileName.slice(dotIndex + 1);
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/gif") return "gif";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "text/plain") return "txt";
  if (mimeType === "application/json") return "json";
  return "bin";
}
