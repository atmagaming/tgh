import type { Tool } from "agents/agent";
import { logger } from "logger";
import { getFilePath, getFolderPathById } from "services/google-drive/drive-folder-cache";
import { type DriveFile, formatDriveFile, getDriveClient } from "services/google-drive/google-drive";

export const listDriveFilesTool: Tool = {
  definition: {
    name: "list_drive_files",
    description:
      "List files and folders in Google Drive. Returns detailed information about each file including ID, name, type, size, and timestamps. Use this to explore shared Drive folders or find files.",
    input_schema: {
      type: "object",
      properties: {
        folder_id: {
          type: "string",
          description:
            "The ID of the folder to list files from. If not provided, lists all top-level shared folders. You can get folder IDs from previous list_drive_files or search_drive_files calls.",
        },
        page_size: {
          type: "number",
          description: "Maximum number of files to return. Defaults to 100. Maximum is 1000.",
        },
      },
    },
  },
  execute: async (toolInput) => {
    const folderId = toolInput.folder_id as string | undefined;
    const pageSize = Math.min((toolInput.page_size as number) || 100, 1000);

    // Validate folder ID length - Google Drive IDs are typically 28-33 characters
    if (folderId && folderId.length < 20) {
      return {
        error: `Invalid folder ID "${folderId}" - appears truncated (${folderId.length} chars). Google Drive IDs are 28-33 characters. Use get_folder_id with the folder name instead.`,
      };
    }

    const query = folderId ? `'${folderId}' in parents and trashed = false` : "sharedWithMe = true and trashed = false";

    logger.info({ folderId, pageSize, query }, "Listing Drive files");

    const drive = getDriveClient();
    const response = await drive.files
      .list({
        q: query,
        pageSize,
        fields: "files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, iconLink)",
        orderBy: "folder,name",
      })
      .catch((error: unknown) => {
        const gaxiosError = error as { code?: number; message?: string };
        if (gaxiosError.code === 404) {
          throw new Error(
            `Google Drive API: Folder "${folderId}" not found or not accessible. Verify the ID is complete and correct.`,
          );
        }
        throw new Error(`Google Drive API error: ${gaxiosError.message ?? "Unknown error"}`);
      });

    // Get parent folder path for constructing file paths
    const parentPath = folderId ? await getFolderPathById(folderId) : null;

    // Add full paths to files
    const files: DriveFile[] = await Promise.all(
      (response.data.files || []).map(async (file) => {
        const path = parentPath ? `/${parentPath}/${file.name}` : await getFilePath(file.parents?.[0], file.name || "");
        return formatDriveFile(file, path);
      }),
    );

    logger.info({ folderId, fileCount: files.length }, "Drive files listed");

    return {
      folder_id: folderId || "shared",
      total_files: files.length,
      files,
    };
  },
};
