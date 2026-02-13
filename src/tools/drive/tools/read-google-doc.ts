import { defineTool } from "streaming-agent";
import { z } from "zod";

export const readGoogleDocTool = defineTool(
  "ReadGoogleDoc",
  "Read a Google Doc and return its content as markdown",
  z.object({
    documentId: z.string().describe("Google Doc ID"),
  }),
  async ({ documentId }) => {
    const response = await fetch(`https://docs.google.com/document/d/${documentId}/export?format=md`);
    if (!response.ok) throw new Error(`Failed to export Google Doc: ${response.statusText}`);
    return await response.text();
  },
);
