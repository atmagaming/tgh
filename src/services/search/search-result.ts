export class SearchResult {
  constructor(
    readonly title: string,
    readonly url: string,
    readonly description: string,
    readonly extraSnippets: string[] = [],
    readonly age?: string,
  ) {}

  toXml() {
    const attrs = `url="${this.url}"${this.age ? ` age="${this.age}"` : ""}`;
    const content = [this.description, ...this.extraSnippets].join("\n");
    return `<search-result ${attrs}>\n${this.title}\n${content}\n</search-result>`;
  }
}
