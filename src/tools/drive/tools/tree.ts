import { google } from "services/google-api";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const treeTool = defineTool(
  "Tree",
  "Display Google Drive folder hierarchy as a tree. Returns structured data with nested folders and files.",
  z.object({
    folderId: z.string().nullable().describe("Root folder ID, or null to show all shared folders."),
    depth: z.number().nullable().describe("How many levels deep (default: 3, max: 10)"),
    showFiles: z.boolean().nullable().describe("Include files, not just folders (default: true)"),
  }),
  async ({ folderId, depth, showFiles }) => {
    const tree = await google.drive.tree(folderId ?? undefined, Math.min(depth ?? 3, 10), showFiles ?? true);
    return tree.map((n) => n.toXML()).join("\n");
  },
);
