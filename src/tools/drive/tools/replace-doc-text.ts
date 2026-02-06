import { defineTool } from "@agentic/streaming-agent";
import { replaceTextInDocument } from "services/google-drive/google-docs";
import { z } from "zod";

export const replaceDocTextTool = defineTool(
    "ReplaceDocText",
    "Replace text placeholders in a Google Doc. All replacements are done in a single batch update. Use this to personalize documents with user data.",
    z.object({
        document_id: z.string().describe("The ID of the document to update"),
        replacements: z
            .record(z.string(), z.string())
            .describe(
                'Mapping of placeholder text to replacement values. Example: {"[NAME]": "John Doe", "[DATE]": "Jan 1, 2025"}',
            ),
    }),
    async ({ document_id, replacements }, _context) => {
        await replaceTextInDocument(document_id, replacements as Record<string, string>);
        return {
            document_id,
            replacements_made: Object.keys(replacements).length,
        };
    },
);
