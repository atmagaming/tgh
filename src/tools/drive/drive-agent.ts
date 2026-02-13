import { models } from "models";
import { StreamingAgent } from "streaming-agent";
import { copyFile } from "./tools/copy";
import { createFolderTool } from "./tools/create-folder";
import { deleteFileTool } from "./tools/delete";
import { docToPDFTool } from "./tools/doc-to-pdf";
import { downloadFileTool } from "./tools/download";
import { listFolderTool } from "./tools/list-folder";
import { renameTool } from "./tools/rename";
import { editGoogleDocTool } from "./tools/edit-google-doc";
import { readGoogleDocTool } from "./tools/read-google-doc";
import { searchTool } from "./tools/search";
import { treeTool } from "./tools/tree";
import { uploadFileTool } from "./tools/upload";

const DRIVE_AGENT_PROMPT = `You work with files on Google Drive, including Google Docs.

You accept natural language requests for file operations.

Notes:
- Explore structure first (tree/search) before operations
- Use parallel operations when handling multiple files
- Output results in a concise, human-readable format.
- When presenting results, use markdown links, and never print ids, unless explicitly asked for.
- When request refers to id:root, you should understand that it is not the id of the root folder, but rather a special instruction to work with shared root folders. For tools you most likely should provide id: null.
- To edit a Google Doc, first read it with ReadGoogleDoc to get content with character indices, then use EditGoogleDoc with those indices.
`;

export const driveAgent = new StreamingAgent({
  name: "DriveAgent",
  model: models.thinking,
  modelSettings: { reasoning: { effort: "low" } },
  instructions: DRIVE_AGENT_PROMPT,
  tools: [
    treeTool,
    searchTool,
    listFolderTool,
    downloadFileTool,
    uploadFileTool,
    createFolderTool,
    renameTool,
    deleteFileTool,
    copyFile,
    readGoogleDocTool,
    editGoogleDocTool,
    docToPDFTool,
  ],
});
