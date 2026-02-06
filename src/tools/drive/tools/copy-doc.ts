import { defineTool } from "@agentic/streaming-agent";
import { copyDocument } from "services/google-drive/google-docs";
import { z } from "zod";

export const copyDocTool = defineTool(
    "CopyDoc",
    "Copy a Google Doc to a new location with a new name. Use this to create personalized documents from templates.",
    z.object({
        template_id: z.string().describe("The ID of the template document to copy"),
        title: z.string().describe("The name for the new document"),
        parent_folder_id: z.string().optional().describe("Optional folder ID to place the copy in"),
    }),
    async ({ template_id, title, parent_folder_id }) => {
        const result = await copyDocument(template_id, title, parent_folder_id);
        return {
            id: result.id,
            name: result.name,
            edit_link: result.webViewLink,
        };
    },
);
