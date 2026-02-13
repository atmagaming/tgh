import { docToMarkdown } from "services/google-api/doc-to-markdown";
import { google } from "services/google-api";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const readGoogleDocTool = defineTool(
  "ReadGoogleDoc",
  "Read a Google Doc and return its content as markdown with [idx:N] character index annotations per paragraph. Use these indices with EditGoogleDoc.",
  z.object({
    documentId: z.string().describe("Google Doc ID"),
  }),
  async ({ documentId }) => {
    const doc = await google.docs.getDocument(documentId);
    const title = doc.title ?? "Untitled";
    const markdown = docToMarkdown(doc);
    return `# ${title}\n\n${markdown}`;
  },
);
