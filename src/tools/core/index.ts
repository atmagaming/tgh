import { downloadAttachmentTool } from "./download-attachment";
import { explainTool } from "./explain";
import { getChatInfoTool } from "./get-group-chat-info";
import { getMessagesTool } from "./get-messages";
import { sendFileTool } from "./send-file";
import { setReactionTool } from "./set-reaction";
import { updateMemoriesTool } from "./update-memories";
import { waitTool } from "./wait";

export {
  downloadAttachmentTool,
  explainTool,
  getChatInfoTool,
  getMessagesTool,
  sendFileTool,
  setReactionTool,
  updateMemoriesTool,
  waitTool,
};

export const coreTools = [
  downloadAttachmentTool,
  explainTool,
  getChatInfoTool,
  getMessagesTool,
  sendFileTool,
  setReactionTool,
  updateMemoriesTool,
  waitTool,
];
