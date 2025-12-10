import * as path from "node:path";
import type { FileOutput, OutputTarget } from "../index";

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
};

/**
 * Console target - prints file paths to stdout
 */
export class ConsoleOutputTarget implements OutputTarget {
  async sendFiles(files: FileOutput[]): Promise<void> {
    if (files.length === 0) return;

    console.log(`${COLORS.green}📁 Generated ${files.length} file(s):${COLORS.reset}`);

    for (const file of files) {
      const filename = file.filename ?? path.basename(file.path);
      const caption = file.caption ? ` (${file.caption})` : "";
      console.log(`${COLORS.cyan}   → ${filename}${caption}${COLORS.reset}`);
      console.log(`${COLORS.dim}     ${file.path}${COLORS.reset}`);
    }
  }
}
