import type { docs_v1 } from "googleapis";
import { google } from "services/google-api";
import { defineTool } from "streaming-agent";
import { z } from "zod";

const operationSchema = z.object({
  type: z
    .enum(["insertText", "deleteRange", "replaceAll", "formatText", "setParagraphStyle", "insertTable"])
    .describe("Operation type"),
  // insertText
  text: z.string().nullable().describe("Text to insert (insertText, replaceAll)"),
  index: z.number().nullable().describe("Character index for insertion/formatting start"),
  appendToEnd: z.boolean().nullable().describe("Insert at document end instead of index"),
  // deleteRange
  endIndex: z.number().nullable().describe("End index for delete/format range"),
  // replaceAll
  findText: z.string().nullable().describe("Text to find (replaceAll)"),
  // formatText
  bold: z.boolean().nullable().describe("Bold formatting"),
  italic: z.boolean().nullable().describe("Italic formatting"),
  underline: z.boolean().nullable().describe("Underline formatting"),
  strikethrough: z.boolean().nullable().describe("Strikethrough formatting"),
  fontSize: z.number().nullable().describe("Font size in points"),
  fontFamily: z.string().nullable().describe("Font family name"),
  linkUrl: z.string().nullable().describe("Hyperlink URL (empty string to remove)"),
  // setParagraphStyle
  headingLevel: z.number().nullable().describe("Heading level 0-6 (0 = normal text)"),
  alignment: z.enum(["START", "CENTER", "END", "JUSTIFIED"]).nullable().describe("Paragraph alignment"),
  // insertTable
  rows: z.number().nullable().describe("Number of rows (insertTable)"),
  columns: z.number().nullable().describe("Number of columns (insertTable)"),
});

export const editGoogleDocTool = defineTool(
  "EditGoogleDoc",
  "Edit a Google Doc with multiple operations. Read the doc first with ReadGoogleDoc to get character indices.",
  z.object({
    documentId: z.string().describe("Google Doc ID"),
    operations: z.array(operationSchema).describe("Operations to apply"),
  }),
  async ({ documentId, operations }) => {
    // Separate replaceAll (text-matched) from index-based operations
    const replaceOps = operations.filter((op) => op.type === "replaceAll");
    const indexOps = operations
      .filter((op) => op.type !== "replaceAll")
      .sort((a, b) => (b.index ?? 0) - (a.index ?? 0));

    const requests: docs_v1.Schema$Request[] = [];

    // replaceAll ops first (they're text-matched, not index-sensitive)
    for (const op of replaceOps) {
      if (!op.findText || op.text === null || op.text === undefined) continue;
      requests.push({
        replaceAllText: {
          containsText: { text: op.findText, matchCase: true },
          replaceText: op.text,
        },
      });
    }

    // Index-based ops in descending order
    for (const op of indexOps) requests.push(toRequest(op));

    if (requests.length === 0) return "No valid operations to apply.";

    await google.docs.batchUpdate(documentId, requests);
    return `Applied ${requests.length} operation(s) to document.`;
  },
);

type Operation = z.infer<typeof operationSchema>;

function toRequest(op: Operation): docs_v1.Schema$Request {
  switch (op.type) {
    case "insertText": {
      if (op.appendToEnd)
        return {
          insertText: {
            endOfSegmentLocation: { segmentId: "" },
            text: op.text ?? "",
          },
        };
      return {
        insertText: {
          location: { index: op.index ?? 1 },
          text: op.text ?? "",
        },
      };
    }
    case "deleteRange":
      return {
        deleteContentRange: {
          range: { startIndex: op.index ?? 1, endIndex: op.endIndex ?? 2 },
        },
      };
    case "formatText": {
      const textStyle: docs_v1.Schema$TextStyle = {};
      const fields: string[] = [];

      if (op.bold !== null && op.bold !== undefined) {
        textStyle.bold = op.bold;
        fields.push("bold");
      }
      if (op.italic !== null && op.italic !== undefined) {
        textStyle.italic = op.italic;
        fields.push("italic");
      }
      if (op.underline !== null && op.underline !== undefined) {
        textStyle.underline = op.underline;
        fields.push("underline");
      }
      if (op.strikethrough !== null && op.strikethrough !== undefined) {
        textStyle.strikethrough = op.strikethrough;
        fields.push("strikethrough");
      }
      if (op.fontSize !== null && op.fontSize !== undefined) {
        textStyle.fontSize = { magnitude: op.fontSize, unit: "PT" };
        fields.push("fontSize");
      }
      if (op.fontFamily !== null && op.fontFamily !== undefined) {
        textStyle.weightedFontFamily = { fontFamily: op.fontFamily };
        fields.push("weightedFontFamily");
      }
      if (op.linkUrl !== null && op.linkUrl !== undefined) {
        textStyle.link = op.linkUrl ? { url: op.linkUrl } : undefined;
        fields.push("link");
      }

      return {
        updateTextStyle: {
          range: { startIndex: op.index ?? 1, endIndex: op.endIndex ?? 2 },
          textStyle,
          fields: fields.join(","),
        },
      };
    }
    case "setParagraphStyle": {
      const paragraphStyle: docs_v1.Schema$ParagraphStyle = {};
      const fields: string[] = [];

      if (op.headingLevel !== null && op.headingLevel !== undefined) {
        const headingMap: Record<number, string> = {
          0: "NORMAL_TEXT",
          1: "HEADING_1",
          2: "HEADING_2",
          3: "HEADING_3",
          4: "HEADING_4",
          5: "HEADING_5",
          6: "HEADING_6",
        };
        paragraphStyle.namedStyleType = headingMap[op.headingLevel] ?? "NORMAL_TEXT";
        fields.push("namedStyleType");
      }
      if (op.alignment) {
        paragraphStyle.alignment = op.alignment;
        fields.push("alignment");
      }

      return {
        updateParagraphStyle: {
          range: { startIndex: op.index ?? 1, endIndex: op.endIndex ?? 2 },
          paragraphStyle,
          fields: fields.join(","),
        },
      };
    }
    case "insertTable": {
      if (op.appendToEnd)
        return {
          insertTable: {
            endOfSegmentLocation: { segmentId: "" },
            rows: op.rows ?? 2,
            columns: op.columns ?? 2,
          },
        };
      return {
        insertTable: {
          location: { index: op.index ?? 1 },
          rows: op.rows ?? 2,
          columns: op.columns ?? 2,
        },
      };
    }
    default:
      throw new Error(`Unknown operation type: ${op.type}`);
  }
}
