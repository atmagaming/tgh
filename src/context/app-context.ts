import type { Context } from "grammy";
import type { FileData } from "io/output";

export interface AppContext {
  readonly traceId: string | null;
  readonly link: string | null;
  readonly telegramContext: Context;
  readonly messageId: number;
  readonly chatId: number;
  readonly userMessage: string;
  onProgress?: (event: ProgressEvent) => void;
  onFile?: (file: FileData) => void;
}

export function createTraceLink(traceId: string | null): string | null {
  if (!traceId) return null;
  return `https://platform.openai.com/logs/trace?trace_id=${traceId}`;
}

export type ProgressEvent =
  | { type: "tool_start"; toolName: string; input: Record<string, unknown> }
  | { type: "tool_complete"; toolName: string; input: Record<string, unknown>; result: unknown }
  | { type: "tool_error"; toolName: string; input: Record<string, unknown>; error: string }
  | { type: "status"; message: string };
