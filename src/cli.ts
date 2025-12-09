import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { MasterAgent } from "agents/master-agent/master-agent";
import { logger } from "logger";
import { formatError } from "utils";

const masterAgent = new MasterAgent();
const historyFile = path.join(process.cwd(), ".cli_history");

const loadHistory = (): string[] => {
  try {
    if (fs.existsSync(historyFile)) {
      const content = fs.readFileSync(historyFile, "utf-8");
      return content.split("\n").filter((line) => line.trim());
    }
  } catch (error) {
    logger.warn({ error: formatError(error) }, "Failed to load history");
  }
  return [];
};

const saveHistory = (rl: readline.Interface) => {
  try {
    const history = (rl as unknown as { history: string[] }).history;
    fs.writeFileSync(historyFile, history.join("\n"), "utf-8");
  } catch (error) {
    logger.warn({ error: formatError(error) }, "Failed to save history");
  }
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  history: loadHistory(),
});

console.log("CLI Bot Started. Type your message and press Enter. Ctrl+C to quit.");
console.log("Use ↑/↓ arrows to navigate history.\n");

const run = async () => {
  while (true) {
    const message = (await rl.question("> ")).trim();

    if (!message) continue;

    if (message.toLowerCase() === "exit") {
      console.log("\nGoodbye!");
      saveHistory(rl);
      rl.close();
      process.exit(0);
    }

    try {
      console.log("\nProcessing...\n");

      const result = await masterAgent.processTask(message);

      if (!result.success) {
        console.error(`Error: ${result.error ?? "Unknown error"}\n`);
      } else if (result.result) {
        console.log(`Bot: ${result.result}\n`);
      }
    } catch (error) {
      logger.error({ error: formatError(error) }, "Error processing message");
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    }

    saveHistory(rl);
  }
};

process.on("SIGINT", () => {
  console.log("\n\nGoodbye!");
  saveHistory(rl);
  rl.close();
  process.exit(0);
});

run();
