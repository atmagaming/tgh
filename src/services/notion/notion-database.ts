import { escapeXML } from "./notion-api";
import type { NotionPage } from "./notion-page";
import type { PropertySchema } from "./types";

export class NotionDatabase {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly properties: PropertySchema[],
    readonly totalEntries: number,
    private pageEntries: NotionPage[],
  ) {}

  getPages(offset = 0, limit = 100): NotionPage[] {
    return this.pageEntries.slice(offset, offset + limit);
  }

  toXML(): string {
    const schema = this.properties
      .map((p) => `    <property name="${escapeXML(p.name)}" type="${p.type}" />`)
      .join("\n");
    const pages = this.pageEntries.map((p) => `    <page id="${p.id}" title="${escapeXML(p.title)}" />`).join("\n");

    return [
      `<database id="${this.id}" name="${escapeXML(this.name)}" totalEntries="${this.totalEntries}">`,
      `  <schema>\n${schema}\n  </schema>`,
      `  <pages>\n${pages}\n  </pages>`,
      "</database>",
    ].join("\n");
  }
}
