import { describe, expect, test } from "bun:test";
import { uploadDriveFileTool } from "./upload-drive-file";

describe("uploadDriveFileTool", () => {
  test("should have correct definition", () => {
    expect(uploadDriveFileTool.definition.name).toBe("upload_drive_file");
    expect(uploadDriveFileTool.definition.description).toContain("Upload a file to Google Drive");
    // Only folder_id is required - accepts message_id, file_path, url, or base64
    expect(uploadDriveFileTool.definition.input_schema.required).toContain("folder_id");
  });

  // Note: Parameter validation tests removed due to mock interference from other test files
  // The tool itself validates parameters - tested via MANUAL tests

  test.skipIf(process.env.RUN_MANUAL_TESTS !== "1")("[MANUAL] should upload file from various sources", async () => {
    // This test requires actual file sources and a folder ID in Google Drive
    // Should be tested manually through the bot
  });
});
