import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import { env } from "env";
import { logger } from "logger";
import { notion } from "services/notion";

const CACHE_FILE = "./cache/system-prompt.md";
const META_FILE = "./cache/system-prompt-meta.json";

const DEFAULT_TEMPLATE = `\
You are {botName} ({botUsername}), a Telegram bot assistant.

## Current Chat

You are currently in a {chatType} chat: "{chatName}".
{chatTypeDescription}

## Behavior

- Understand user requests from the chat context provided
- Use tools and sub-agents to accomplish tasks when needed

## Memories

{memories}

Use {updateMemoriesToolName} tool when:
- User explicitly asks you to remember something
- User provides feedback about preferences
- Important context should be persisted

The tool accepts an instruction in natural language (e.g., "add preference for concise responses", "remove the item about X").
{skillsSection}
## Output Format

- Be concise and direct in responses
- Respond in valid markdown format
- For links, always use the valid format: \`[link text](URL)\` format. Never output raw URLs.

## Message History and Context

The chat content shows the last few messages (oldest first) in the XML format.
Between the user messages there could be different changes in the world, code, systems.
You need not rely on old messages to provide constant results. The system might have changed since then.`;

class SystemPrompt {
  private cache: string | null = null;

  get(): string {
    if (this.cache !== null) return this.cache;

    if (existsSync(CACHE_FILE)) {
      this.cache = readFileSync(CACHE_FILE, "utf-8");
      return this.cache;
    }

    this.cache = DEFAULT_TEMPLATE;
    return DEFAULT_TEMPLATE;
  }

  async sync(): Promise<string> {
    const pageId = env.NOTION_SYSTEM_PROMPT_PAGE_ID;

    try {
      const { lastEditedTime } = await notion.getPageMeta(pageId);

      // Check if cached version is up to date
      const cachedMeta = this.getCachedMeta();
      if (cachedMeta?.lastEditedTime && lastEditedTime === cachedMeta.lastEditedTime && existsSync(CACHE_FILE)) {
        this.cache = readFileSync(CACHE_FILE, "utf-8");
        return "System prompt: cached (up to date)";
      }

      // Fetch content from Notion
      const content = await notion.getPageContents(pageId);

      if (!content.trim()) {
        // Page is empty — seed with default template
        await this.seedNotion(pageId);
        const { lastEditedTime: newTime } = await notion.getPageMeta(pageId);
        this.saveCache(DEFAULT_TEMPLATE, newTime ?? new Date().toISOString());
        return "System prompt: seeded default to Notion";
      }

      this.saveCache(content, lastEditedTime ?? new Date().toISOString());
      return "System prompt: synced from Notion";
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : error }, "Failed to sync system prompt");
      // Fall back to cache or default
      this.get();
      return "System prompt: using fallback (sync failed)";
    }
  }

  private getCachedMeta(): { lastEditedTime: string } | null {
    if (!existsSync(META_FILE)) return null;
    try {
      return JSON.parse(readFileSync(META_FILE, "utf-8"));
    } catch {
      return null;
    }
  }

  private saveCache(content: string, lastEditedTime: string): void {
    this.cache = content;
    mkdirSync("./cache", { recursive: true });
    writeFileSync(CACHE_FILE, content, "utf-8");
    writeFileSync(META_FILE, JSON.stringify({ lastEditedTime }), "utf-8");
  }

  private async seedNotion(pageId: string): Promise<void> {
    const blocks = this.markdownToNotionBlocks(DEFAULT_TEMPLATE);
    await notion.replacePageContents(pageId, blocks);
    this.cache = DEFAULT_TEMPLATE;
  }

  private markdownToNotionBlocks(markdown: string): BlockObjectRequest[] {
    const lines = markdown.split("\n");
    const blocks: BlockObjectRequest[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      if (line.startsWith("### "))
        blocks.push({
          object: "block",
          type: "heading_3",
          heading_3: { rich_text: [{ type: "text", text: { content: line.slice(4) } }] },
        });
      else if (line.startsWith("## "))
        blocks.push({
          object: "block",
          type: "heading_2",
          heading_2: { rich_text: [{ type: "text", text: { content: line.slice(3) } }] },
        });
      else if (line.startsWith("# "))
        blocks.push({
          object: "block",
          type: "heading_1",
          heading_1: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] },
        });
      else if (line.startsWith("- "))
        blocks.push({
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] },
        });
      else
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: line } }] },
        });
    }

    return blocks;
  }
}

export const systemPrompt = new SystemPrompt();
