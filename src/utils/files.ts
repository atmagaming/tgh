import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const TEMP_PREFIX = "tgh-";

/**
 * Save buffer to a temp file, return the file path
 */
export async function saveTempFile(data: Buffer, extension: string): Promise<string> {
  const filename = `${TEMP_PREFIX}${randomUUID()}.${extension.replace(/^\./, "")}`;
  const filePath = path.join(os.tmpdir(), filename);
  await fs.writeFile(filePath, data);
  return filePath;
}

/**
 * Detect MIME type from file extension
 */
export function detectMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".json": "application/json",
    ".txt": "text/plain",
    ".glb": "model/gltf-binary",
    ".fbx": "application/octet-stream",
  };
  return mimeTypes[ext] ?? "application/octet-stream";
}

/**
 * Read a file (local path or URL) and return buffer with mimeType
 */
export async function readFile(pathOrUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    const response = await fetch(pathOrUrl);
    if (!response.ok) throw new Error(`Failed to fetch file from URL: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let mimeType = response.headers.get("content-type") || "application/octet-stream";

    if (mimeType === "application/octet-stream" || !mimeType.startsWith("image/")) {
      if (pathOrUrl.includes(".png")) mimeType = "image/png";
      else if (pathOrUrl.includes(".webp")) mimeType = "image/webp";
      else if (pathOrUrl.includes(".jpg") || pathOrUrl.includes(".jpeg")) mimeType = "image/jpeg";
      else mimeType = detectMimeType(pathOrUrl);
    }

    return { buffer, mimeType };
  }

  const buffer = await fs.readFile(pathOrUrl);
  const mimeType = detectMimeType(pathOrUrl);
  return { buffer, mimeType };
}
