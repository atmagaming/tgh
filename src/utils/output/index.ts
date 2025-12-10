/**
 * Multi-target output handler for file outputs
 *
 * Usage:
 *   const output = new Output();
 *   output.addTarget(new ConsoleOutputTarget());
 *   output.addTarget(new TelegramOutputTarget(ctx, messageId));
 *
 *   await output.sendFiles([{ path: "/tmp/img.png", mimeType: "image/png" }]);
 */

import { deleteTempFile } from "utils/temp-files";

export interface FileOutput {
  path: string;
  mimeType: string;
  caption?: string;
  filename?: string; // Suggested download name
}

/**
 * Target interface for file outputs
 */
export interface OutputTarget {
  /** Send files to this target */
  sendFiles(files: FileOutput[]): Promise<void>;

  /** Optional cleanup when target is removed */
  dispose?(): void;
}

/**
 * Main Output class - dispatches to multiple targets and handles cleanup
 */
export class Output {
  private targets: OutputTarget[] = [];
  private cleanupAfterSend: boolean;

  constructor(options?: { cleanupAfterSend?: boolean }) {
    this.cleanupAfterSend = options?.cleanupAfterSend ?? true;
  }

  addTarget(target: OutputTarget): this {
    this.targets.push(target);
    return this;
  }

  removeTarget(target: OutputTarget): this {
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

  async sendFiles(files: FileOutput[]): Promise<void> {
    if (files.length === 0) return;

    // Send to all targets
    await Promise.all(this.targets.map((target) => target.sendFiles(files)));

    // Clean up temp files after sending
    if (this.cleanupAfterSend) {
      await Promise.all(files.map((file) => deleteTempFile(file.path)));
    }
  }
}

// Re-export targets
export { ConsoleOutputTarget } from "./targets/console";
export { TelegramOutputTarget } from "./targets/telegram";
