#!/usr/bin/env bun

const packageFile = Bun.file("./package.json");
const packageData = (await packageFile.json()) as { config: { version: string } };

const [major, minor, patch] = packageData.config.version.split(".").map(Number);
const newVersion = `${major}.${minor}.${(patch || 0) + 1}`;

packageData.config.version = newVersion;
await Bun.write("./package.json", `${JSON.stringify(packageData, null, 2)}\n`);

console.log(`Version bumped: ${packageData.config.version} → ${newVersion}`);
