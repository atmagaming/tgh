import { describe, it } from "bun:test";
import { buildTree, loadChildren } from "./drive-tree";

describe("buildTree (manual)", () => {
  it("should build tree from shared roots with depth 2", async () => {
    const result = await buildTree(undefined, { maxDepth: 2, includeFiles: true });

    console.log("\n=== Tree Structure ===");
    console.log(JSON.stringify(result.root, null, 2));

    console.log("\n=== Statistics ===");
    console.log(`Total nodes: ${result.stats.totalNodes}`);
    console.log(`Folders: ${result.stats.foldersCount}`);
    console.log(`Files: ${result.stats.filesCount}`);
    console.log(`Depth reached: ${result.stats.maxDepthReached}`);
    console.log(`API calls: ${result.stats.apiCalls}`);
    console.log(`Execution time: ${result.stats.executionTimeMs.toFixed(0)}ms`);
  });

  it("should build tree with only folders (no files)", async () => {
    const result = await buildTree(undefined, { maxDepth: 2, includeFiles: false });

    console.log("\n=== Folders-only Tree ===");
    console.log(JSON.stringify(result.root, null, 2));
    console.log(`\nTotal folders: ${result.stats.foldersCount}`);
  });
});

describe("loadChildren (manual)", () => {
  it("should load root level", async () => {
    const result = await loadChildren(null, { includeFiles: true });

    console.log("\n=== Root Level Children ===");
    console.log(JSON.stringify(result, null, 2));
  });
});
