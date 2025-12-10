import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { logger } from "logger";
import { getDriveClient } from "./google-drive";

const CACHE_FILE = "./cache/drive-folders.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedFolder {
  id: string;
  name: string;
  path: string;
  parentId?: string;
}

interface FolderCache {
  folders: CachedFolder[];
  lastUpdated: string;
}

let memoryCache: FolderCache | null = null;

/**
 * Load cache from file
 */
function loadCache(): FolderCache | null {
  if (memoryCache) {
    const age = Date.now() - new Date(memoryCache.lastUpdated).getTime();
    if (age < CACHE_TTL_MS) return memoryCache;
  }

  try {
    if (!existsSync(CACHE_FILE)) return null;

    const data = readFileSync(CACHE_FILE, "utf-8");
    const cache: FolderCache = JSON.parse(data);

    const age = Date.now() - new Date(cache.lastUpdated).getTime();
    if (age >= CACHE_TTL_MS) return null;

    memoryCache = cache;
    return cache;
  } catch {
    return null;
  }
}

/**
 * Save cache to file
 */
function saveCache(cache: FolderCache): void {
  try {
    mkdirSync(dirname(CACHE_FILE), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    memoryCache = cache;
  } catch (error) {
    logger.warn({ error }, "Failed to save drive folder cache");
  }
}

/**
 * Recursively discover folder structure from Drive
 */
async function discoverFolders(rootFolderId?: string): Promise<CachedFolder[]> {
  const drive = getDriveClient();
  const folders: CachedFolder[] = [];

  async function listFoldersInParent(parentId: string | null, parentPath: string): Promise<void> {
    const query = parentId
      ? `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
      : "sharedWithMe = true and mimeType = 'application/vnd.google-apps.folder' and trashed = false";

    const response = await drive.files.list({
      q: query,
      fields: "files(id, name, parents)",
      pageSize: 1000,
    });

    const folderFiles = response.data.files ?? [];

    for (const file of folderFiles) {
      if (!file.id || !file.name) continue;

      const path = parentPath ? `${parentPath}/${file.name}` : file.name;
      folders.push({
        id: file.id,
        name: file.name,
        path,
        parentId: parentId ?? undefined,
      });

      // Recursively discover subfolders
      await listFoldersInParent(file.id, path);
    }
  }

  await listFoldersInParent(rootFolderId ?? null, "");
  return folders;
}

/**
 * Ensure cache is fresh, refresh if needed
 */
async function ensureFreshCache(): Promise<FolderCache> {
  const cache = loadCache();
  if (cache) return cache;

  logger.info("Discovering Drive folder structure...");
  const folders = await discoverFolders();

  const newCache: FolderCache = {
    folders,
    lastUpdated: new Date().toISOString(),
  };

  saveCache(newCache);
  logger.info({ folderCount: folders.length }, "Drive folder cache updated");

  return newCache;
}

/**
 * Get folder by exact name (case-insensitive)
 */
export async function getFolderByName(name: string): Promise<CachedFolder | null> {
  const cache = await ensureFreshCache();
  const lowerName = name.toLowerCase();
  return cache.folders.find((f) => f.name.toLowerCase() === lowerName) ?? null;
}

/**
 * Get folder by path (e.g., "Assets/2D Characters")
 */
export async function getFolderByPath(path: string): Promise<CachedFolder | null> {
  const cache = await ensureFreshCache();
  const lowerPath = path.toLowerCase();
  return cache.folders.find((f) => f.path.toLowerCase() === lowerPath) ?? null;
}

/**
 * Search folders by name (fuzzy, case-insensitive)
 */
export async function searchFolders(query: string): Promise<CachedFolder[]> {
  const cache = await ensureFreshCache();
  const lowerQuery = query.toLowerCase();
  return cache.folders.filter(
    (f) => f.name.toLowerCase().includes(lowerQuery) || f.path.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Get all cached folders
 */
export async function getAllFolders(): Promise<CachedFolder[]> {
  const cache = await ensureFreshCache();
  return cache.folders;
}

/**
 * Invalidate cache (force refresh on next access)
 */
export function invalidateFolderCache(): void {
  memoryCache = null;
  try {
    if (existsSync(CACHE_FILE)) {
      const fs = require("node:fs");
      fs.unlinkSync(CACHE_FILE);
    }
  } catch {
    // Ignore
  }
}

/**
 * Get folder path by ID
 */
export async function getFolderPathById(folderId: string): Promise<string | null> {
  const cache = await ensureFreshCache();
  const folder = cache.folders.find((f) => f.id === folderId);
  return folder?.path ?? null;
}

/**
 * Get full file path given its parent folder ID and filename
 */
export async function getFilePath(parentId: string | undefined, fileName: string): Promise<string> {
  if (!parentId) return `/${fileName}`;
  const parentPath = await getFolderPathById(parentId);
  return parentPath ? `/${parentPath}/${fileName}` : `/${fileName}`;
}

/**
 * Add a new folder to cache (call after creating folder)
 */
export async function addFolderToCache(folder: { id: string; name: string; parentId?: string }): Promise<void> {
  const cache = await ensureFreshCache();

  let parentPath = "";
  if (folder.parentId) {
    const parent = cache.folders.find((f) => f.id === folder.parentId);
    if (parent) parentPath = parent.path;
  }

  const path = parentPath ? `${parentPath}/${folder.name}` : folder.name;

  cache.folders.push({
    id: folder.id,
    name: folder.name,
    path,
    parentId: folder.parentId,
  });

  saveCache(cache);
}
