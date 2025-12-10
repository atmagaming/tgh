import type { ExtractedError, ProgressTarget, Status } from "../index";

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

/**
 * Console target - prints formatted progress to stdout
 */
export class ConsoleTarget implements ProgressTarget {
  constructor(private readonly verbose = !!process.env.VERBOSE) {}

  agent(name: string, status: Status, message?: string): void {
    const icon = status === "start" ? "🤖" : status === "complete" ? "✓" : "✗";
    const color = status === "error" ? COLORS.red : status === "complete" ? COLORS.green : COLORS.cyan;
    const statusText = status === "start" ? "starting" : status;
    const msg = message ? `: ${message}` : "";

    console.log(`${color}${icon} ${name} ${statusText}${msg}${COLORS.reset}`);
  }

  tool(name: string, status: Status, result?: string): void {
    if (status === "start" && !this.verbose) return;

    const icon = status === "start" ? "→" : status === "complete" ? "✓" : "✗";
    const color = status === "error" ? COLORS.red : status === "complete" ? COLORS.green : COLORS.dim;

    if (status === "start") {
      console.log(`${color}  ${icon} ${name}...${COLORS.reset}`);
    } else {
      const resultText = result ? this.truncate(result, 80) : "";
      console.log(`${color}  ${icon} ${name}${resultText ? `: ${resultText}` : ""}${COLORS.reset}`);
    }
  }

  message(text: string): void {
    console.log(`${COLORS.dim}  ${text}${COLORS.reset}`);
  }

  error(error: ExtractedError): void {
    console.log(`${COLORS.red}❌ Error: ${error.message}${COLORS.reset}`);

    if (this.verbose && error.stack) {
      console.log(`${COLORS.dim}${error.stack}${COLORS.reset}`);
    }

    if (this.verbose && error.context) {
      console.log(`${COLORS.dim}Context: ${JSON.stringify(error.context, null, 2)}${COLORS.reset}`);
    }
  }

  private truncate(text: string, maxLength: number): string {
    const singleLine = text.replace(/\n/g, " ").trim();
    return singleLine.length > maxLength ? `${singleLine.substring(0, maxLength)}...` : singleLine;
  }
}
