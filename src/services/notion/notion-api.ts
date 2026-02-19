import { Client } from "@notionhq/client";
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import { env } from "env";
import { NotionDatabase } from "./notion-database";
import { NotionPage } from "./notion-page";
import type { NotionProperty, PropertySchema, RichTextItem } from "./types";

const NOTION_VERSION = "2022-06-28";

export class NotionAPI {
  private client: Client;
  private titleCache = new Map<string, Promise<string>>();

  constructor(private apiKey: string) {
    this.client = new Client({ auth: apiKey });
  }

  async createPage(
    databaseId: string,
    properties: Record<string, unknown>,
    blocks?: BlockObjectRequest[],
  ): Promise<string> {
    // biome-ignore lint: Notion SDK types are overly strict for dynamic property construction
    const page = await this.client.pages.create({ parent: { database_id: databaseId }, properties } as any);
    if (blocks?.length) await this.client.blocks.children.append({ block_id: page.id, children: blocks });
    return page.id;
  }

  async updatePage(
    pageId: string,
    updates: { properties?: Record<string, unknown>; archived?: boolean },
  ): Promise<void> {
    // biome-ignore lint: Notion SDK types are overly strict for dynamic property construction
    await this.client.pages.update({ page_id: pageId, ...updates } as any);
  }

  async getPageMeta(pageId: string): Promise<{ lastEditedTime: string | null }> {
    const page = await this.client.pages.retrieve({ page_id: pageId });
    const time = "last_edited_time" in page ? (page.last_edited_time as string) : null;
    return { lastEditedTime: time };
  }

  getPageContents(pageId: string): Promise<string> {
    return this.fetchContents(pageId);
  }

  async replacePageContents(pageId: string, blocks: BlockObjectRequest[]): Promise<void> {
    const existing = await this.client.blocks.children.list({ block_id: pageId, page_size: 100 });
    for (const block of existing.results) await this.client.blocks.delete({ block_id: block.id });
    if (blocks.length) await this.client.blocks.children.append({ block_id: pageId, children: blocks });
  }

  buildPropertyPayload(type: string, value: string): Record<string, unknown> {
    switch (type) {
      case "text":
      case "rich_text":
        return { rich_text: [{ text: { content: value } }] };
      case "select":
        return { select: { name: value } };
      case "multi_select":
        return { multi_select: value.split(",").map((name) => ({ name: name.trim() })) };
      case "date":
        return { date: { start: value } };
      case "relation":
        return { relation: value.split(",").map((id) => ({ id: id.trim() })) };
      case "checkbox":
        return { checkbox: value === "true" };
      case "number":
        return { number: Number(value) };
      case "url":
        return { url: value };
      case "email":
        return { email: value };
      case "phone":
      case "phone_number":
        return { phone_number: value };
      case "status":
        return { status: { name: value } };
      default:
        throw new Error(`Unsupported property type for update: ${type}`);
    }
  }

  markdownToBlocks(markdown: string): BlockObjectRequest[] {
    return markdown
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line): BlockObjectRequest => {
        if (line.startsWith("# "))
          return { type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } };
        if (line.startsWith("## "))
          return { type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: line.slice(3) } }] } };
        if (line.startsWith("### "))
          return { type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: line.slice(4) } }] } };
        if (line.startsWith("- "))
          return {
            type: "bulleted_list_item",
            bulleted_list_item: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] },
          };
        return { type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: line } }] } };
      });
  }

  async searchPages(
    query: string | null,
    filter: "page" | "database" | null,
  ): Promise<Array<{ id: string; title: string; object: string }>> {
    const body: Record<string, unknown> = {};
    if (query) body.query = query;
    if (filter) body.filter = { value: filter, property: "object" };

    const response = (await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }).then((r) => r.json())) as {
      results: Array<{ id: string; object: string; properties?: Record<string, unknown>; title?: RichTextItem[] }>;
    };

    return response.results.map((item) => {
      let title = "";
      if (item.object === "page" && item.properties) title = this.extractTitleAndProperties(item.properties).title;
      else if (item.object === "database" && item.title) title = item.title.map((t) => t.plain_text).join("");
      return { id: item.id, title, object: item.object };
    });
  }

  async queryDatabase(
    databaseId: string,
    options: {
      filter?: Record<string, unknown>;
      sorts?: Array<{ property: string; direction: "ascending" | "descending" }>;
      limit?: number;
    } = {},
  ): Promise<NotionPage[]> {
    const pages: NotionPage[] = [];
    let cursor: string | null = null;
    const pageLimit = options.limit ?? Number.POSITIVE_INFINITY;

    do {
      const body: Record<string, unknown> = { page_size: Math.min(100, pageLimit - pages.length) };
      if (cursor) body.start_cursor = cursor;
      if (options.filter) body.filter = options.filter;
      if (options.sorts) body.sorts = options.sorts;

      const response = (await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }).then((r) => r.json())) as {
        results: Array<{ id: string; properties: Record<string, unknown> }>;
        has_more: boolean;
        next_cursor: string | null;
      };

      for (const page of response.results) {
        const { title, properties } = this.extractTitleAndProperties(page.properties);
        pages.push(new NotionPage(page.id, title, properties, (id) => this.fetchContents(id)));
      }

      cursor = response.has_more && pages.length < pageLimit ? response.next_cursor : null;
    } while (cursor);

    return pages;
  }

  getPageTitle(id: string): Promise<string> {
    const cached = this.titleCache.get(id);
    if (cached !== undefined) return cached;
    const promise = this.getPage(id).then((page) => page.title);
    this.titleCache.set(id, promise);
    return promise;
  }

  async resolveRelationContent(content: string): Promise<string> {
    const ids = content.split(", ").filter(Boolean);
    if (!ids.length) return content;
    const resolved = await Promise.all(ids.map(async (id) => `${await this.getPageTitle(id)} (${id})`));
    return resolved.join(", ");
  }

  async getPage(pageId: string): Promise<NotionPage> {
    const page = await this.client.pages.retrieve({ page_id: pageId });
    if (!("properties" in page)) throw new Error("Not a full page response");

    const { title, properties } = this.extractTitleAndProperties(page.properties as Record<string, unknown>);
    return new NotionPage(page.id, title, properties, (id) => this.fetchContents(id));
  }

  async getDatabase(databaseId: string): Promise<NotionDatabase> {
    const db = (await this.client.databases.retrieve({ database_id: databaseId })) as {
      id: string;
      title?: RichTextItem[];
      data_sources?: Array<{ id: string }>;
    };
    const dbName = db.title?.map((t) => t.plain_text).join("") ?? "";

    const dataSources = db.data_sources;
    let schema: PropertySchema[] = [];
    if (dataSources?.[0]) {
      const ds = await this.client.dataSources.retrieve({ data_source_id: dataSources[0].id });
      if ("properties" in ds) {
        schema = Object.values(ds.properties as Record<string, { name: string; type: string }>)
          .filter((p) => p.type !== "title")
          .map((p) => ({ name: p.name, type: p.type }));
      }
    }

    const allPages = await this.queryDatabase(databaseId);
    return new NotionDatabase(db.id, dbName, schema, allPages.length, allPages);
  }

  private extractTitleAndProperties(raw: Record<string, unknown>): {
    title: string;
    properties: Record<string, NotionProperty>;
  } {
    let title = "";
    const properties: Record<string, NotionProperty> = {};

    for (const [name, value] of Object.entries(raw)) {
      const prop = value as { type: string; [key: string]: unknown };
      if (prop.type === "title") {
        const items = prop.title as RichTextItem[] | undefined;
        title = items?.map((t) => t.plain_text).join("") ?? "";
      } else {
        properties[name] = this.parseProperty(prop);
      }
    }

    return { title, properties };
  }

  private parseProperty(prop: { type: string; [key: string]: unknown }): NotionProperty {
    switch (prop.type) {
      case "rich_text": {
        const items = prop.rich_text as RichTextItem[] | undefined;
        return { type: "text", content: items?.map((t) => t.plain_text).join("") ?? "" };
      }
      case "number":
        return { type: "number", content: String(prop.number ?? "") };
      case "select": {
        const select = prop.select as { name: string } | null;
        return { type: "select", content: select?.name ?? "" };
      }
      case "multi_select": {
        const items = prop.multi_select as Array<{ name: string }> | undefined;
        return { type: "multi_select", content: items?.map((i) => i.name).join(", ") ?? "" };
      }
      case "date": {
        const date = prop.date as { start: string; end?: string } | null;
        return { type: "date", content: date?.start ?? "" };
      }
      case "checkbox":
        return { type: "checkbox", content: String(prop.checkbox ?? false) };
      case "url":
        return { type: "url", content: (prop.url as string) ?? "" };
      case "email":
        return { type: "email", content: (prop.email as string) ?? "" };
      case "phone_number":
        return { type: "phone", content: (prop.phone_number as string) ?? "" };
      case "relation": {
        const items = prop.relation as Array<{ id: string }> | undefined;
        return {
          type: "relation",
          content: items?.map((i) => i.id).join(", ") ?? "",
          relatedDatabaseId: (prop as { relation_database_id?: string }).relation_database_id,
        };
      }
      case "status": {
        const status = prop.status as { name: string } | null;
        return { type: "status", content: status?.name ?? "" };
      }
      case "people": {
        const items = prop.people as Array<{ name?: string; id: string }> | undefined;
        return { type: "people", content: items?.map((p) => p.name ?? p.id).join(", ") ?? "" };
      }
      default:
        return { type: prop.type, content: "" };
    }
  }

  private async fetchContents(blockId: string, depth = 0): Promise<string> {
    const blocks = await this.client.blocks.children.list({ block_id: blockId, page_size: 100 });
    const lines: string[] = [];
    const indent = "  ".repeat(depth);
    let numberedIndex = 1;

    for (const raw of blocks.results) {
      const block = raw as {
        id: string;
        type: string;
        has_children: boolean;
        [key: string]: unknown;
      };

      if (!("type" in block)) continue;

      const richText = (block[block.type] as { rich_text?: RichTextItem[] } | undefined)?.rich_text ?? [];
      const text = this.renderRichText(richText);

      switch (block.type) {
        case "heading_1":
          lines.push(`${indent}# ${text}`);
          break;
        case "heading_2":
          lines.push(`${indent}## ${text}`);
          break;
        case "heading_3":
          lines.push(`${indent}### ${text}`);
          break;
        case "bulleted_list_item":
          lines.push(`${indent}- ${text}`);
          break;
        case "numbered_list_item":
          lines.push(`${indent}${numberedIndex}. ${text}`);
          numberedIndex++;
          break;
        case "to_do": {
          const checked = (block.to_do as { checked?: boolean })?.checked;
          lines.push(`${indent}- [${checked ? "x" : " "}] ${text}`);
          break;
        }
        case "code": {
          const lang = (block.code as { language?: string })?.language ?? "";
          lines.push(`${indent}\`\`\`${lang}`, `${indent}${text}`, `${indent}\`\`\``);
          break;
        }
        case "divider":
          lines.push(`${indent}---`);
          break;
        case "paragraph":
          lines.push(`${indent}${text}`);
          break;
        default:
          if (text) lines.push(`${indent}${text}`);
          break;
      }

      if (block.type !== "numbered_list_item") numberedIndex = 1;

      if (block.has_children) {
        const childContent = await this.fetchContents(block.id, depth + 1);
        if (childContent) lines.push(childContent);
      }
    }

    return lines.join("\n");
  }

  private renderRichText(items: RichTextItem[]): string {
    return items
      .map((item) => {
        let text = item.plain_text;
        if (item.annotations.code) text = `\`${text}\``;
        if (item.annotations.bold) text = `**${text}**`;
        if (item.annotations.italic) text = `*${text}*`;
        if (item.annotations.strikethrough) text = `~~${text}~~`;
        if (item.href) text = `[${text}](${item.href})`;
        return text;
      })
      .join("");
  }
}

export function escapeXML(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const notion = new NotionAPI(env.NOTION_API_KEY);
