/**
 * Multi-target progress reporting system (similar to Pino's transport architecture)
 *
 * Usage:
 *   const progress = new Progress();
 *   progress.addTarget(new ConsoleTarget());
 *   progress.addTarget(new TelegramTarget(ctx, messageId));
 *
 *   progress.agent("DriveAgent", "start");
 *   progress.tool("search_drive_files", "start");
 *   progress.tool("search_drive_files", "complete", "Found 5 files");
 *   progress.agent("DriveAgent", "complete");
 */

export type Status = "start" | "complete" | "error";

export interface ExtractedError {
  message: string;
  stack?: string;
  code?: string;
  context?: Record<string, unknown>;
}

/**
 * Target interface - each target formats output its own way
 */
export interface ProgressTarget {
  /** Report agent status change */
  agent(name: string, status: Status, message?: string): void;

  /** Report tool execution status */
  tool(name: string, status: Status, result?: string): void;

  /** Report general progress message */
  message(text: string): void;

  /** Report error */
  error(error: ExtractedError): void;

  /** Optional cleanup when target is removed */
  dispose?(): void;
}

/**
 * Extract error information from any error type
 */
export function extractError(error: unknown): ExtractedError {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as NodeJS.ErrnoException).code,
    };
  }

  if (typeof error === "string") return { message: error };

  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    return {
      message: String(obj.message ?? obj.error ?? JSON.stringify(error)),
      code: obj.code as string | undefined,
      context: obj,
    };
  }

  return { message: String(error) };
}

/**
 * Main Progress class - dispatches to multiple targets
 */
export class Progress {
  private targets: ProgressTarget[] = [];
  private verbose: boolean;

  constructor(options?: { verbose?: boolean }) {
    this.verbose = options?.verbose ?? !!process.env.VERBOSE;
  }

  get isVerbose(): boolean {
    return this.verbose;
  }

  addTarget(target: ProgressTarget): this {
    this.targets.push(target);
    return this;
  }

  removeTarget(target: ProgressTarget): this {
    const index = this.targets.indexOf(target);
    if (index !== -1) {
      this.targets.splice(index, 1);
      target.dispose?.();
    }
    return this;
  }

  clearTargets(): this {
    for (const target of this.targets) target.dispose?.();
    this.targets = [];
    return this;
  }

  agent(name: string, status: Status, message?: string): void {
    for (const target of this.targets) target.agent(name, status, message);
  }

  tool(name: string, status: Status, result?: string): void {
    for (const target of this.targets) target.tool(name, status, result);
  }

  message(text: string): void {
    for (const target of this.targets) target.message(text);
  }

  error(error: unknown): void {
    const extracted = extractError(error);
    for (const target of this.targets) target.error(extracted);
  }
}

// Re-export targets
export { ConsoleTarget } from "./targets/console";
export { FileTarget } from "./targets/file";
export { NullTarget } from "./targets/null";
export { TelegramTarget } from "./targets/telegram";
