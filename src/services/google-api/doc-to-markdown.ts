import type { docs_v1 } from "googleapis";

/**
 * Converts a Google Docs document to markdown with [idx:N] annotations per paragraph.
 * The index N is the startIndex of the paragraph, useful for editing operations.
 */
export function docToMarkdown(doc: docs_v1.Schema$Document): string {
  const body = doc.body;
  if (!body?.content) return "";

  const lists = doc.lists ?? {};
  const parts: string[] = [];

  for (const element of body.content) {
    if (element.paragraph) parts.push(renderParagraph(element.paragraph, element.startIndex ?? 0, lists));
    else if (element.table) parts.push(renderTable(element.table, element.startIndex ?? 0));
    else if (element.sectionBreak && parts.length > 0) parts.push("---\n");
  }

  return parts.join("\n");
}

function renderParagraph(
  paragraph: docs_v1.Schema$Paragraph,
  startIndex: number,
  lists: Record<string, docs_v1.Schema$List>,
): string {
  const style = paragraph.paragraphStyle?.namedStyleType ?? "";
  const text = renderInlineElements(paragraph.elements ?? []);

  // Skip empty paragraphs
  if (!text.trim()) return "";

  const prefix = `[idx:${startIndex}] `;

  // Heading
  const headingMatch = style.match(/^HEADING_(\d)$/);
  if (headingMatch) {
    const level = Number(headingMatch[1]);
    return `${prefix}${"#".repeat(level)} ${text}`;
  }

  // List item
  const bullet = paragraph.bullet;
  if (bullet) {
    const listId = bullet.listId ?? "";
    const nestingLevel = bullet.nestingLevel ?? 0;
    const indent = "  ".repeat(nestingLevel);
    const listProps = lists[listId]?.listProperties?.nestingLevels?.[nestingLevel];
    const isOrdered = listProps?.glyphType && listProps.glyphType !== "GLYPH_TYPE_UNSPECIFIED";
    const marker = isOrdered ? "1." : "-";
    return `${prefix}${indent}${marker} ${text}`;
  }

  return `${prefix}${text}`;
}

function renderInlineElements(elements: docs_v1.Schema$ParagraphElement[]): string {
  let result = "";

  for (const el of elements) {
    if (el.textRun) {
      const content = el.textRun.content ?? "";
      // Skip trailing newline that Google Docs adds to every paragraph
      const trimmed = content.replace(/\n$/, "");
      if (!trimmed) continue;

      const style = el.textRun.textStyle;
      let text = trimmed;

      // Apply inline formatting
      if (style?.strikethrough) text = `~~${text}~~`;
      if (style?.italic) text = `*${text}*`;
      if (style?.bold) text = `**${text}**`;
      if (style?.link?.url) text = `[${text}](${style.link.url})`;

      result += text;
    } else if (el.inlineObjectElement) {
      result += "[image]";
    }
  }

  return result;
}

function renderTable(table: docs_v1.Schema$Table, startIndex: number): string {
  const rows = table.tableRows ?? [];
  if (rows.length === 0) return "";

  const lines: string[] = [`[idx:${startIndex}]`];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const cells = row.tableCells ?? [];
    const cellTexts = cells.map((cell) => {
      const paragraphs = cell.content ?? [];
      return paragraphs
        .map((el) => {
          if (el.paragraph) return renderInlineElements(el.paragraph.elements ?? []);
          return "";
        })
        .filter(Boolean)
        .join(" ");
    });

    lines.push(`| ${cellTexts.join(" | ")} |`);

    // Add separator after header row
    if (r === 0) lines.push(`| ${cellTexts.map(() => "---").join(" | ")} |`);
  }

  return lines.join("\n");
}
