import { Agent } from "agents/agent";
import { models } from "models";
import { createDriveFolderTool } from "./tools/create-drive-folder";
import { deleteDriveFileTool } from "./tools/delete-drive-file";
import { downloadDriveFileTool } from "./tools/download-drive-file";
import { getFolderIdTool } from "./tools/get-folder-id";
import { listDriveFilesTool } from "./tools/list-drive-files";
import { renameDriveFileTool } from "./tools/rename-drive-file";
import { searchDriveFilesTool } from "./tools/search-drive-files";
import { uploadDriveFileTool } from "./tools/upload-drive-file";

const DRIVE_AGENT_PROMPT = `You manage Google Drive files.

ACTION RULES:
- Known folder name: use get_folder_id first, then list_drive_files with the ID
- Unknown location: search without mime_type filter first (to find both files AND folders), then filter results
- Multiple items needed: fetch ALL in ONE iteration (parallel)
- Empty folders: don't re-check them
- When searching for something specific: if exact query returns 0 results, try broader search (e.g., search "Iris" instead of "Iris concept art")
- Use file paths to understand context: /3D Models/Helios/textures/iris.png is a texture for Helios, NOT concept art for Iris character
- download_drive_file returns a temp file path - use this for further processing (analyze, upload, reference)
- upload_drive_file accepts: message_id (Telegram), file_path (temp files), url, or base64_data
- Stop when you have a definitive answer

Response: File names, paths, IDs, webViewLinks. Be concise.`;

export class DriveAgent extends Agent {
  readonly definition = {
    name: "drive_agent",
    description:
      "Google Drive management agent. Use for listing, searching, uploading, downloading, renaming, and deleting files/folders on Google Drive.",
    input_schema: {
      type: "object" as const,
      properties: {
        task: {
          type: "string" as const,
          description: "The Google Drive operation to perform",
        },
      },
      required: ["task"],
    },
  };

  constructor() {
    super(
      "drive_agent",
      models.fast,
      DRIVE_AGENT_PROMPT,
      [
        getFolderIdTool,
        listDriveFilesTool,
        createDriveFolderTool,
        searchDriveFilesTool,
        downloadDriveFileTool,
        uploadDriveFileTool,
        renameDriveFileTool,
        deleteDriveFileTool,
      ],
      2048,
    );
  }
}
