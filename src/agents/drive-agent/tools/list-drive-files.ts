import type { Tool } from "agents/agent";
import { logger } from "logger";
import { buildTree, loadChildren } from "services/google-drive/drive-tree";

export const listDriveFilesTool: Tool = {
  definition: {
    name: "list_drive_files",
    description:
      "List files and folders in Google Drive. Returns detailed info including IDs, names, types, sizes. Use this to explore Drive folders or find files by browsing.",
    input_schema: {
      type: "object",
      properties: {
        folder_id: {
          type: "string",
          description: "Folder ID to list contents of. Omit to list shared root folders.",
        },
        page_size: {
          type: "number",
          description: "Maximum files to return (default: 100, max: 1000)",
        },
        include_paths: {
          type: "boolean",
          description: "Include full paths (requires extra API calls). Default: false for listing.",
        },
      },
    },
  },
  execute: async (toolInput) => {
    const folderId = toolInput.folder_id as string | undefined;
    const pageSize = Math.min((toolInput.page_size as number) ?? 100, 1000);
    const includePaths = (toolInput.include_paths as boolean) ?? false;

    // Validate folder ID length - Google Drive IDs are typically 28-33 characters
    if (folderId && folderId.length < 20) {
      return {
        error: `Invalid folder ID "${folderId}" - appears truncated (${folderId.length} chars). Google Drive IDs are 28-33 characters. Use get_folder_id with the folder name instead.`,
      };
    }

    logger.info({ folderId, pageSize }, "Listing Drive files");

    let parentPath: string | undefined;
    if (includePaths && folderId) {
      // Build tree to get path info
      const tree = await buildTree(undefined, { maxDepth: 4, includeFiles: false });
      parentPath = tree.pathMap.get(folderId);
    }

    const children = await loadChildren(folderId ?? null, { includeFiles: true }).catch((error: unknown) => {
      const gaxiosError = error as { code?: number; message?: string };
      if (gaxiosError.code === 404) {
        throw new Error(
          `Google Drive API: Folder "${folderId}" not found or not accessible. Verify the ID is complete and correct.`,
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

    logger.info({ folderId, fileCount: files.length }, "Drive files listed");

    return {
      folder_id: folderId ?? "shared_root",
      total_files: files.length,
      files,
    };
  },
};
