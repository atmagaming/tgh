import { run } from "@openai/agents";
import { masterAgent } from "agents/master-agent/master-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { parseArgs } from "utils/argparser";

const historyFile = path.join(process.cwd(), ".cli_history");

const { args } = parseArgs();

const loadHistory = (): string[] => {
  if (fs.existsSync(historyFile)) {
    const content = fs.readFileSync(historyFile, "utf-8");
    return content.split("\n").filter((line) => line.trim());
  }
  return [];
};

const saveHistory = (rl: readline.Interface) => {
  const history = (rl as unknown as { history: string[] }).history;
  fs.writeFileSync(historyFile, history.join("\n"), "utf-8");
};

const processMessage = async (message: string): Promise<void> => {
  console.log();
  const result = await run(masterAgent, message);
  console.log();
  console.log(result.finalOutput);
};

const runInteractive = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    history: loadHistory(),
  });

  console.log("CLI Bot Started. Type your message and press Enter. Ctrl+C to quit.");
  console.log("Use ↑/↓ arrows to navigate history.\n");

  process.on("SIGINT", () => {
    console.log("\n\nGoodbye!");
    saveHistory(rl);
    rl.close();
    process.exit(0);
  });

  while (true) {
    const message = (await rl.question("> ")).trim();

    if (!message) continue;

    if (message.toLowerCase() === "exit") {
      console.log("\nGoodbye!");
      saveHistory(rl);
      rl.close();
      process.exit(0);
    }

    await processMessage(message);
    saveHistory(rl);
  }
};

const runSingleCommand = async (prompt: string) => {
  await processMessage(prompt);
  process.exit(0);
};

if (args.length > 0) {
  const prompt = args.join(" ");
  void runSingleCommand(prompt);
} else {
  void runInteractive();
}
