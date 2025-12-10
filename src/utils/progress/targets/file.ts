import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ExtractedError, ProgressTarget, Status } from "../index";

/**
 * File target - writes progress to a log file
 */
export class FileTarget implements ProgressTarget {
  constructor(private readonly filePath: string = "./logs/progress.log") {
    // Ensure directory exists
    mkdirSync(dirname(this.filePath), { recursive: true });
  }

  agent(name: string, status: Status, message?: string): void {
    const timestamp = new Date().toISOString();
    const msg = message ? ` - ${message}` : "";
    this.write(`[${timestamp}] AGENT ${name} ${status.toUpperCase()}${msg}`);
  }

  tool(name: string, status: Status, result?: string): void {
    const timestamp = new Date().toISOString();
    const resultText = result ? ` - ${result}` : "";
    this.write(`[${timestamp}] TOOL ${name} ${status.toUpperCase()}${resultText}`);
  }

  message(text: string): void {
    const timestamp = new Date().toISOString();
    this.write(`[${timestamp}] MSG ${text}`);
  }

  error(error: ExtractedError): void {
    const timestamp = new Date().toISOString();
    this.write(`[${timestamp}] ERROR ${error.message}`);

    if (error.stack) this.write(`  Stack: ${error.stack}`);
    if (error.code) this.write(`  Code: ${error.code}`);
    if (error.context) this.write(`  Context: ${JSON.stringify(error.context)}`);
  }

  private write(line: string): void {
    appendFileSync(this.filePath, `${line}\n`);
  }
}
