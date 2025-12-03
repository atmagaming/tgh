import { describe, expect, test } from "bun:test";
import type { DriveFile } from "../services/google-drive";
import { listDriveFilesTool } from "./list-drive-files";

interface ListDriveFilesResult {
  folder_id: string;
  total_files: number;
  files: DriveFile[];
}

describe("Google Drive Integration", () => {
  test("list shared folders", async () => {
    const result = (await listDriveFilesTool.execute({})) as ListDriveFilesResult;
    console.log("Shared folders:", result);
    expect(result.folder_id).toBe("shared");
    expect(result.total_files).toBeGreaterThan(0);
    expect(result.files).toBeInstanceOf(Array);
    expect(result.files[0]).toHaveProperty("id");
    expect(result.files[0]).toHaveProperty("name");
  });

  test("list files in Hypocrisy folder", async () => {
    const result = (await listDriveFilesTool.execute({
      folder_id: "1WtB8aX6aH5s0_fS6xoQPc_0QOC9Hg5ok",
    })) as ListDriveFilesResult;
    console.log("Files in Hypocrisy:", result);
    expect(result.folder_id).toBe("1WtB8aX6aH5s0_fS6xoQPc_0QOC9Hg5ok");
    expect(result.total_files).toBeGreaterThan(0);
    expect(result.files).toBeInstanceOf(Array);
  });
});
