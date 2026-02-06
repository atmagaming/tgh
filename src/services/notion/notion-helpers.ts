import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

/**
 * Helper to build Notion property values for page creation/updates
 */
export class NotionPropertyBuilder {
  private properties: Record<string, unknown> = {};

  title(name: string, text: string) {
    this.properties[name] = { title: [{ text: { content: text } }] };
    return this;
  }

  richText(name: string, text: string) {
    this.properties[name] = { rich_text: [{ text: { content: text } }] };
    return this;
  }

  email(name: string, emailValue: string) {
    this.properties[name] = { email: emailValue };
    return this;
  }

  phone(name: string, phoneValue: string) {
    this.properties[name] = { phone_number: phoneValue };
    return this;
  }

  number(name: string, value: number) {
    this.properties[name] = { number: value };
    return this;
  }

  select(name: string, optionName: string) {
    this.properties[name] = { select: { name: optionName } };
    return this;
  }

  multiSelect(name: string, optionNames: string[]) {
    this.properties[name] = { multi_select: optionNames.map((name) => ({ name })) };
    return this;
  }

  date(name: string, start: string, end?: string) {
    this.properties[name] = { date: { start, end: end ?? null } };
    return this;
  }

  checkbox(name: string, checked: boolean) {
    this.properties[name] = { checkbox: checked };
    return this;
  }

  url(name: string, urlValue: string) {
    this.properties[name] = { url: urlValue };
    return this;
  }

  relation(name: string, pageIds: string[]) {
    this.properties[name] = { relation: pageIds.map((id) => ({ id })) };
    return this;
  }

  build() {
    return this.properties;
  }
}

/**
 * Extract property values from a Notion page response
 */
export class NotionPropertyExtractor {
  constructor(private page: PageObjectResponse) {}

  title(name: string): string | undefined {
    const prop = this.page.properties[name];
    if (prop?.type !== "title") return undefined;
    return prop.title[0]?.plain_text;
  }

  richText(name: string): string | undefined {
    const prop = this.page.properties[name];
    if (prop?.type !== "rich_text") return undefined;
    return prop.rich_text.map((rt) => rt.plain_text).join("");
  }

  email(name: string): string | undefined {
    const prop = this.page.properties[name];
    if (prop?.type !== "email") return undefined;
    return prop.email ?? undefined;
  }

  phone(name: string): string | undefined {
    const prop = this.page.properties[name];
    if (prop?.type !== "phone_number") return undefined;
    return prop.phone_number ?? undefined;
  }

  number(name: string): number | undefined {
    const prop = this.page.properties[name];
    if (prop?.type !== "number") return undefined;
    return prop.number ?? undefined;
  }

  select(name: string): string | undefined {
    const prop = this.page.properties[name];
    if (prop?.type !== "select") return undefined;
    return prop.select?.name;
  }

  multiSelect(name: string): string[] {
    const prop = this.page.properties[name];
    if (prop?.type !== "multi_select") return [];
    return prop.multi_select.map((option) => option.name);
  }

  date(name: string): { start: string; end?: string } | undefined {
    const prop = this.page.properties[name];
    if (prop?.type !== "date") return undefined;
    if (!prop.date) return undefined;
    return { start: prop.date.start, end: prop.date.end ?? undefined };
  }

  checkbox(name: string): boolean | undefined {
    const prop = this.page.properties[name];
    if (prop?.type !== "checkbox") return undefined;
    return prop.checkbox;
  }

  url(name: string): string | undefined {
    const prop = this.page.properties[name];
    if (prop?.type !== "url") return undefined;
    return prop.url ?? undefined;
  }

  relation(name: string): string[] {
    const prop = this.page.properties[name];
    if (prop?.type !== "relation") return [];
    return prop.relation.map((rel) => rel.id);
  }
}

/**
 * Build Notion database query filters
 */
export class NotionFilterBuilder {
  private filters: unknown[] = [];

  emailEquals(propertyName: string, email: string) {
    this.filters.push({ property: propertyName, email: { equals: email } });
    return this;
  }

  titleContains(propertyName: string, text: string) {
    this.filters.push({ property: propertyName, title: { contains: text } });
    return this;
  }

  richTextContains(propertyName: string, text: string) {
    this.filters.push({ property: propertyName, rich_text: { contains: text } });
    return this;
  }

  selectEquals(propertyName: string, optionName: string) {
    this.filters.push({ property: propertyName, select: { equals: optionName } });
    return this;
  }

  relationContains(propertyName: string, pageId: string) {
    this.filters.push({ property: propertyName, relation: { contains: pageId } });
    return this;
  }

  build(): unknown {
    if (this.filters.length === 0) return undefined;
    if (this.filters.length === 1) return this.filters[0];
    return { and: this.filters };
  }
}

/**
 * Helper to simplify page properties for output
 */
export function simplifyPageProperties(page: PageObjectResponse) {
  const extractor = new NotionPropertyExtractor(page);
  const simplified: Record<string, unknown> = {};

  for (const [key, prop] of Object.entries(page.properties)) {
    switch (prop.type) {
      case "title":
        simplified[key] = extractor.title(key);
        break;
      case "rich_text":
        simplified[key] = extractor.richText(key);
        break;
      case "email":
        simplified[key] = extractor.email(key);
        break;
      case "phone_number":
        simplified[key] = extractor.phone(key);
        break;
      case "number":
        simplified[key] = extractor.number(key);
        break;
      case "select":
        simplified[key] = extractor.select(key);
        break;
      case "multi_select":
        simplified[key] = extractor.multiSelect(key);
        break;
      case "date":
        simplified[key] = extractor.date(key);
        break;
      case "checkbox":
        simplified[key] = extractor.checkbox(key);
        break;
      case "url":
        simplified[key] = extractor.url(key);
        break;
      case "relation":
        simplified[key] = extractor.relation(key);
        break;
    }
  }

  return simplified;
}
