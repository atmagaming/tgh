import { google } from "services/google-api";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const replaceDocTextTool = defineTool(
  "ReplaceDocText",
  "Replace text placeholders in a Google Doc. All occurrences are replaced in a single batch update",
  z.object({
    documentId: z.string().describe("The ID of the document to update"),
    replacements: z
      .array(
        z.object({
          placeholder: z.string().describe("Text to find, e.g. [NAME]"),
          value: z.string().describe("Replacement value, e.g. John Doe"),
        }),
      )
      .describe("List of placeholder→value replacements to apply in a single batch."),
  }),
  ({ documentId, replacements }) => google.docs.replaceText(documentId, replacements),
);
