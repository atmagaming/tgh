import { Anthropic } from "@anthropic-ai/sdk";
import { env } from "env";
import type { Context } from "grammy";
import { logger } from "logger";
import type { FileOutput, Output } from "utils/output";
import type { Progress } from "utils/progress";

const MAX_TOOL_ITERATIONS = 10;

export type AgentResponse =
  | {
      success: true;
      result: string;
    }
  | {
      success: false;
      error?: string;
    };

export interface ToolContext {
  telegramCtx?: Context;
  messageId?: number;
  progress?: Progress;
  output?: Output;
}

export interface Tool {
  definition: Anthropic.Tool;
  execute: (toolInput: Record<string, unknown>, context?: ToolContext) => Promise<unknown>;
}

export abstract class Agent implements Tool {
  protected client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  public abstract readonly definition: Anthropic.Tool;

  constructor(
    public readonly name: string,
    public readonly model: string,
    public readonly systemPrompt: string,
    public tools: Tool[],
    public readonly maxTokens: number,
    public readonly thinkingBudget?: number,
  ) {}

  async execute(toolInput: Record<string, unknown>, context?: ToolContext): Promise<unknown> {
    const task = toolInput.task as string;
    if (!task) throw new Error("Task is required");

    const response = await this.processTask(task, context);

    if (!response.success) throw new Error(response.error ?? "Agent task failed");

    return { result: response.result };
  }

  async processTask(task: string, context?: ToolContext): Promise<AgentResponse> {
    const taskId = Math.random().toString(36).substring(2, 9);
    const taskPreview = task.length > 100 ? `${task.substring(0, 100)}...` : task;
    const progress = context?.progress;

    // Only log to logger in verbose mode
    if (progress?.isVerbose) {
      logger.info(
        {
          taskId,
          agent: this.name,
          model: this.model,
          thinking: this.thinkingBudget !== undefined,
          maxTokens: this.maxTokens,
          toolCount: this.tools.length,
        },
        `[${taskId}] ${this.name} starting: ${taskPreview}`,
      );
    }

    // Report to progress targets
    progress?.agent(this.name, "start", taskPreview);

    try {
      const messages: Anthropic.MessageParam[] = [{ role: "user", content: task }];

      // Process initial task
      if (progress?.isVerbose) logger.info({ taskId, agent: this.name }, `[${taskId}] Calling API (initial)`);
      let response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompt,
        tools: this.tools.map((t) => t.definition),
        messages,
        thinking: this.thinkingBudget
          ? {
              type: "enabled",
              budget_tokens: this.thinkingBudget,
            }
          : undefined,
      });

      // Use tools while requested and within iteration limit
      let iterations = 0;
      while (response.stop_reason === "tool_use" && iterations < MAX_TOOL_ITERATIONS) {
        iterations++;

        const toolUses = response.content.filter((b) => b.type === "tool_use");
        if (toolUses.length === 0) break;

        if (progress?.isVerbose) {
          logger.info(
            {
              taskId,
              agent: this.name,
              iteration: iterations,
              toolCount: toolUses.length,
              tools: toolUses.map((t) => (t.type === "tool_use" ? t.name : "unknown")),
            },
            `[${taskId}] Iteration ${iterations}: ${toolUses.length} tool(s)`,
          );
        }

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        // Execute all tools in parallel
        const toolExecutions = toolUses
          .filter((t) => t.type === "tool_use")
          .map(async (toolUse) => {
            if (toolUse.type !== "tool_use") return null;

            const toolId = Math.random().toString(36).substring(2, 7);

            try {
              const tool = this.tools.find((t) => t.definition.name === toolUse.name);
              if (!tool) throw new Error(`Tool ${toolUse.name} not found`);

              // Report tool start to progress
              progress?.tool(toolUse.name, "start");

              if (progress?.isVerbose) {
                const inputStr = JSON.stringify(toolUse.input);
                const inputPreview = inputStr.length > 150 ? `${inputStr.substring(0, 150)}...` : inputStr;
                logger.info(
                  { taskId, toolId, agent: this.name, tool: toolUse.name },
                  `[${taskId}:${toolId}] → ${toolUse.name}(${inputPreview})`,
                );
              }

              const result = await tool.execute(toolUse.input as Record<string, unknown>, context);

              // Check for file outputs and send to output targets
              if (result && typeof result === "object" && "files" in result) {
                const files = (result as { files: FileOutput[] }).files;
                if (Array.isArray(files) && files.length > 0 && context?.output) {
                  await context.output.sendFiles(files);
                }
              }

              // Report tool completion
              const resultStr = JSON.stringify(result);
              const resultPreview = resultStr.length > 80 ? `${resultStr.substring(0, 80)}...` : resultStr;
              progress?.tool(toolUse.name, "complete", resultPreview);

              if (progress?.isVerbose) {
                const fullPreview = resultStr.length > 200 ? `${resultStr.substring(0, 200)}...` : resultStr;
                logger.info(
                  { taskId, toolId, agent: this.name, tool: toolUse.name, resultLength: resultStr.length },
                  `[${taskId}:${toolId}] ✓ ${toolUse.name}: ${fullPreview}`,
                );
              }

              return {
                type: "tool_result" as const,
                tool_use_id: toolUse.id,
                content: resultStr,
              };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);

              // Report tool error
              progress?.tool(toolUse.name, "error", errorMessage);

              if (progress?.isVerbose) {
                logger.error(
                  { taskId, toolId, agent: this.name, tool: toolUse.name, error: errorMessage },
                  `[${taskId}:${toolId}] ✗ ${toolUse.name} failed: ${errorMessage}`,
                );
              }

              return {
                type: "tool_result" as const,
                tool_use_id: toolUse.id,
                content: JSON.stringify({ error: errorMessage }),
                is_error: true,
              };
            }
          });

        // Wait for all tools to complete in parallel
        const results = await Promise.all(toolExecutions);
        for (const result of results) {
          if (result !== null) toolResults.push(result);
        }

        messages.push({ role: "assistant", content: response.content });
        messages.push({ role: "user", content: toolResults });

        if (progress?.isVerbose) {
          logger.info(
            { taskId, agent: this.name, iteration: iterations },
            `[${taskId}] Calling API (iteration ${iterations})`,
          );
        }
        response = await this.client.messages.create({
          model: this.model,
          max_tokens: this.maxTokens,
          system: this.systemPrompt,
          tools: this.tools.map((t) => t.definition),
          messages,
          thinking: this.thinkingBudget
            ? {
                type: "enabled",
                budget_tokens: this.thinkingBudget,
              }
            : undefined,
        });
      }

      const textBlock = response.content.find((b) => b.type === "text");
      const result = textBlock && textBlock.type === "text" ? textBlock.text : "No response";

      // Report completion
      progress?.agent(this.name, "complete", `${iterations} iterations`);

      if (progress?.isVerbose) {
        const resultPreview = result.length > 150 ? `${result.substring(0, 150)}...` : result;
        logger.info(
          {
            taskId,
            agent: this.name,
            iterations,
            resultLength: result.length,
            stopReason: response.stop_reason,
          },
          `[${taskId}] ✓ ${this.name} completed (${iterations} iterations): ${resultPreview}`,
        );
      }

      return {
        success: true,
        result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Report error
      progress?.agent(this.name, "error", errorMessage);
      progress?.error(error);

      if (progress?.isVerbose) {
        logger.error({ taskId, agent: this.name, error }, `[${taskId}] ✗ ${this.name} failed`);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
