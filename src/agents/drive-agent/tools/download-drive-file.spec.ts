import { describe, expect, test } from "bun:test";
import { downloadDriveFileTool } from "./download-drive-file";

describe("downloadDriveFileTool", () => {
  test("should have correct definition", () => {
    expect(downloadDriveFileTool.definition.name).toBe("download_drive_file");
    expect(downloadDriveFileTool.definition.description).toContain("Download a file from Google Drive");
    expect(downloadDriveFileTool.definition.input_schema.required).toContain("file_id");
  });

  // Tool no longer requires Telegram context - returns temp file path instead
  test.skipIf(process.env.RUN_MANUAL_TESTS !== "1")("[MANUAL] should download file to temp path", async () => {
    // This test requires a file in Google Drive with proper permissions
    // Should be tested manually through the bot
  });
});
