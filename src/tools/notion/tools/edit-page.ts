import { notion } from "services/notion";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const editPageTool = defineTool(
  "EditPage",
  "Update a Notion page's properties and/or replace its content. Pass only fields you want to change.",
  z.object({
    id: z.string().describe("Notion page ID"),
    content: z.string().nullable().describe("New markdown content to replace page body, or null to skip"),
    properties: z
      .array(
        z.object({ name: z.string().describe("Property name"), value: z.string().describe("New value as string") }),
      )
      .nullable()
      .describe("Properties to update"),
  }),
  async ({ id, content, properties }) => {
    const updates: string[] = [];

    if (properties?.length) {
      const page = await notion.getPage(id);
      const propertyUpdates: Record<string, unknown> = {};

      for (const { name, value } of properties) {
        const existing = page.properties[name];
        if (!existing) throw new Error(`Property "${name}" not found on page ${id}`);
        propertyUpdates[name] = notion.buildPropertyPayload(existing.type, value);
      }

      await notion.updatePage(id, { properties: propertyUpdates });
      updates.push(`Updated ${properties.length} propert${properties.length === 1 ? "y" : "ies"}`);
    }

    if (content !== null) {
      const blocks = notion.markdownToBlocks(content);
      await notion.replacePageContents(id, blocks);
      updates.push(`Replaced content (${blocks.length} blocks)`);
    }

    return updates.length > 0 ? updates.join("; ") : "No changes made.";
  },
);
