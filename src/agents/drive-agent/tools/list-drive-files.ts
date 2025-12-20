import { logger } from "logger";
import { buildTree, loadChildren } from "services/google-drive/drive-tree";
import { createTool } from "tools/sdk-tool";
import { z } from "zod";

export const listDriveFilesTool = createTool({
  name: "list_drive_files",
  description:
    "List files and folders in Google Drive. Returns detailed info including IDs, names, types, sizes. Use this to explore Drive folders or find files by browsing.",
  parameters: z.object({
    folder_id: z.string().optional().describe("Folder ID to list contents of. Omit to list shared root folders."),
    page_size: z.number().optional().describe("Maximum files to return (default: 100, max: 1000)"),
    include_paths: z
      .boolean()
      .optional()
      .describe("Include full paths (requires extra API calls). Default: false for listing."),
  }),
  execute: async ({ folder_id, page_size, include_paths }, _context) => {
    const pageSize = Math.min(page_size ?? 100, 1000);
    const includePaths = include_paths ?? false;

    // Validate folder ID length - Google Drive IDs are typically 28-33 characters
    if (folder_id && folder_id.length < 20) {
      return {
        error: `Invalid folder ID "${folder_id}" - appears truncated (${folder_id.length} chars). Google Drive IDs are 28-33 characters. Use get_folder_id with the folder name instead.`,
      };
    }

    logger.info({ folderId: folder_id, pageSize }, "Listing Drive files");

    let parentPath: string | undefined;
    if (includePaths && folder_id) {
      // Build tree to get path info
      const tree = await buildTree(undefined, { maxDepth: 4, includeFiles: false });
      parentPath = tree.pathMap.get(folder_id);
    }

    const children = await loadChildren(folder_id ?? null, { includeFiles: true }).catch((error: unknown) => {
      const gaxiosError = error as { code?: number; message?: string };
      if (gaxiosError.code === 404) {
        throw new Error(
          `Google Drive API: Folder "${folder_id}" not found or not accessible. Verify the ID is complete and correct.`,
        );
      }
      throw new Error(`Google Drive API error: ${gaxiosError.message ?? "Unknown error"}`);
    });

    const files = children.slice(0, pageSize).map((node) => ({
      id: node.id,
      name: node.name,
      path: parentPath ? `/${parentPath}/${node.name}` : `/${node.name}`,
      mimeType: node.mimeType,
      size: node.size,
      modifiedTime: node.modifiedTime,
      isFolder: node.isFolder,
    }));

    logger.info({ folderId: folder_id, fileCount: files.length }, "Drive files listed");

    return {
      folder_id: folder_id ?? "shared_root",
      total_files: files.length,
      files,
    };
  },
});
