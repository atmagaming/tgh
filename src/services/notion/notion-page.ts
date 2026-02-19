import { escapeXML } from "./notion-api";
import type { NotionProperty } from "./types";

interface NotionResolver {
  resolveRelationContent(content: string): Promise<string>;
  getPage(id: string): Promise<NotionPage>;
}

export class NotionPage {
  private _contents: string | null = null;

  constructor(
    readonly id: string,
    readonly title: string,
    readonly properties: Record<string, NotionProperty>,
    private fetchContentsFn: (blockId: string) => Promise<string>,
  ) {}

  async getContents(): Promise<string> {
    if (this._contents !== null) return this._contents;
    this._contents = await this.fetchContentsFn(this.id);
    return this._contents;
  }

  async toXML(includeContent = true): Promise<string> {
    const props = Object.entries(this.properties)
      .map(([name, p]) => `  - ${name} (${p.type}):${p.content ? ` ${p.content}` : ""}`)
      .join("\n");

    const parts = [
      `<page id="${this.id}" title="${escapeXML(this.title)}">`,
      `  <properties>\n${props}\n  </properties>`,
    ];

    if (includeContent) {
      const contents = await this.getContents();
      parts.push(`  <contents>\n${contents}\n  </contents>`);
    }

    parts.push("</page>");
    return parts.join("\n");
  }

  async toTaskXML(propsToShow: string[], includeChildren: boolean, api: NotionResolver, depth = 0): Promise<string> {
    const indent = "  ".repeat(depth);

    const attrParts = await Promise.all(
      propsToShow.map(async (name) => {
        const prop = this.properties[name];
        if (!prop?.content) return null;
        const attrName = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const value = prop.type === "relation" ? await api.resolveRelationContent(prop.content) : prop.content;
        return `${attrName}="${escapeXML(value)}"`;
      }),
    );
    const attrs = attrParts.filter(Boolean).join(" ");

    const description = this.properties["Description"]?.content ?? "";
    const innerParts: string[] = [];

    if (description) innerParts.push(`${indent}  <description>${escapeXML(description)}</description>`);

    if (includeChildren) {
      const subtaskIds = (this.properties["Sub-item"]?.content ?? "")
        .split(", ")
        .map((s) => s.trim())
        .filter(Boolean);

      const subtaskLines = await Promise.all(
        subtaskIds.map(async (subId) => {
          const subPage = await api.getPage(subId);
          return subPage.toTaskXML(propsToShow, true, api, depth + 1);
        }),
      );
      innerParts.push(...subtaskLines);
    }

    const attrStr = attrs ? ` ${attrs}` : "";
    if (!innerParts.length) return `${indent}<task id="${this.id}" title="${escapeXML(this.title)}"${attrStr} />`;

    return `${indent}<task id="${this.id}" title="${escapeXML(this.title)}"${attrStr}>\n${innerParts.join("\n")}\n${indent}</task>`;
  }
}
