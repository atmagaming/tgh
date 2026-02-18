import * as path from "node:path";
import { defineTool } from "streaming-agent";
import { readFile } from "utils/files";
import { z } from "zod";

export const sendFileTool = defineTool(
  "SendFile",
  "Send a file to the user. Use type 'preview' for images (sent as compressed photo), 'file' for documents (sent as-is).",
  z.object({
    filePath: z.string().describe("Path to the file on disk"),
    fileName: z.string().nullable().describe("Display name for the file, or null to use original"),
    type: z.enum(["file", "preview"]).describe("'preview' for images, 'file' for documents"),
  }),
  async ({ filePath, fileName, type }, job) => {
    const { buffer } = await readFile(filePath);
    const name = fileName ?? path.basename(filePath);
    job.addFile(buffer, name, type);
  },
  { isHidden: true },
);
