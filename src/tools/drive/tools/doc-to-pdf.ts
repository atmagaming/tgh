import { google } from "services/google-api";
import { defineTool } from "streaming-agent";
import { saveTempFile } from "utils/files";
import { z } from "zod";

export const docToPDFTool = defineTool(
  "DocToPdf",
  "Saves a Google Doc as PDF. Returns a path to the downloaded PDF file",
  z.object({
    documentId: z.string().describe("ID of the document to export"),
    filename: z.string().nullable().describe("Filename, or null (defaults to document name)"),
  }),
  async ({ documentId, filename }) => {
    const [file, buffer] = await Promise.all([google.drive.get(documentId), google.docs.exportPdf(documentId)]);

    const fileName = filename ?? file?.name ?? "download";
    const tempPath = await saveTempFile(buffer, "pdf", fileName);

    return tempPath;
  },
);
