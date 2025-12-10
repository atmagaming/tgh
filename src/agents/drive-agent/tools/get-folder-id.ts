import type { Tool } from "agents/agent";
import { getFolderByName, getFolderByPath, searchFolders } from "services/google-drive/drive-folder-cache";

export const getFolderIdTool: Tool = {
  definition: {
    name: "get_folder_id",
    description:
      "Get folder ID by name or path from cached folder structure. Use this to quickly find folder IDs without searching. Returns folder ID, name, and full path.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Exact folder name to find (case-insensitive)",
        },
        path: {
          type: "string",
          description: "Full folder path like 'Assets/2D Characters'",
        },
        search: {
          type: "string",
          description: "Fuzzy search query to find folders by partial name",
        },
      },
    },
  },

  async execute(input: Record<string, unknown>) {
    const { name, path, search } = input as { name?: string; path?: string; search?: string };

    if (path) {
      const folder = await getFolderByPath(path);
      if (folder) {
        return {
          success: true,
          folder: {
            id: folder.id,
            name: folder.name,
            path: folder.path,
          },
        };
      }
      return { success: false, error: `Folder not found at path: ${path}` };
    }

    if (name) {
      const folder = await getFolderByName(name);
      if (folder) {
        return {
          success: true,
          folder: {
            id: folder.id,
            name: folder.name,
            path: folder.path,
          },
        };
      }
      return { success: false, error: `Folder not found with name: ${name}` };
    }

    if (search) {
      const folders = await searchFolders(search);
      return {
        success: true,
        results: folders.slice(0, 10).map((f) => ({
          id: f.id,
          name: f.name,
          path: f.path,
        })),
      };
    }

    return { success: false, error: "Provide name, path, or search query" };
  },
};
