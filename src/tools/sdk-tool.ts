import { tool as sdkTool } from "@openai/agents";
import type { RunContext } from "@openai/agents";
import type { AppContext } from "context/app-context";
import type { FileData } from "io/output";
import { z } from "zod";

export function createTool<TSchema extends z.ZodTypeAny>(config: {
  name: string;
  description: string;
  parameters: TSchema;
  execute: (input: z.infer<TSchema>, context: AppContext) => Promise<unknown>;
}) {
  return sdkTool({
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    execute: async (input: z.infer<TSchema>, ctx: RunContext<AppContext>) => {
      const appContext = ctx.context;

      appContext?.onProgress?.({
        type: "tool_start",
        toolName: config.name,
        input: input as Record<string, unknown>,
      });

      try {
        const result = await config.execute(input, appContext!);

        // Check for file outputs and emit them
        if (result && typeof result === "object" && "files" in result) {
          const files = (result as { files: FileData[] }).files;
          if (Array.isArray(files)) {
            for (const file of files) appContext?.onFile?.(file);
          }
        }

        appContext?.onProgress?.({
          type: "tool_complete",
          toolName: config.name,
          input: input as Record<string, unknown>,
          result,
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        appContext?.onProgress?.({
          type: "tool_error",
          toolName: config.name,
          input: input as Record<string, unknown>,
          error: errorMessage,
        });

        throw error;
      }
    },
  });
}
