import type { FileData } from "io/output";
import type { Context } from "grammy";

export interface AppContext {
  readonly id: string;
  readonly link: string;
  readonly telegramContext: Context;
  readonly messageId: number;
  readonly chatId: number;
  readonly userMessage: string;
  onProgress?: (event: ProgressEvent) => void;
  onFile?: (file: FileData) => void;
}

export type ProgressEvent =
  | { type: "tool_start"; toolName: string; input: Record<string, unknown> }
  | { type: "tool_complete"; toolName: string; input: Record<string, unknown>; result: unknown }
  | { type: "tool_error"; toolName: string; input: Record<string, unknown>; error: string }
  | { type: "status"; message: string };
