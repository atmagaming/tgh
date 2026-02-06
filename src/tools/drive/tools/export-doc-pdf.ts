import { google } from "services/google-api";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const exportDocPdfTool = defineTool(
  "ExportDocPdf",
  "Export a Google Doc as a PDF file. Returns a path to the downloaded file",
  z.object({
    documentId: z.string().describe("ID of the document to export"),
    filename: z.string().nullable().describe("Filename, or null (defaults to document name)"),
  }),
  async ({ documentId, filename }) => {
    const buffer = await google.docs.exportPdf(documentId);

    return {
      files: [
        {
          buffer,
          mimeType: "application/pdf",
          filename: filename ?? "document.pdf",
        },
      ],
    };
  },
);
