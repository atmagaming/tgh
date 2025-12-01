#!/usr/bin/env bun

const versionFile = Bun.file("./version.json");
const versionData = (await versionFile.json()) as { version: string };

const [major, minor, patch] = versionData.version.split(".").map(Number);
const newVersion = `${major}.${minor}.${(patch || 0) + 1}`;

await Bun.write("./version.json", JSON.stringify({ version: newVersion }, null, 2));

console.log(`Version bumped: ${versionData.version} → ${newVersion}`);
