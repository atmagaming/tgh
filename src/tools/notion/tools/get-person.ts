import { escapeXML, notion } from "services/notion";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const getPersonTool = defineTool(
  "GetPerson",
  "Get a person's profile from the People database by their Notion page ID.",
  z.object({
    id: z.string().describe("Notion page ID of the person"),
  }),
  async ({ id }) => {
    const page = await notion.getPage(id);
    const extraAttrs = await Promise.all(
      Object.entries(page.properties)
        .filter(([key, prop]) => key !== "Tasks" && prop.content)
        .map(async ([key, prop]) => {
          const attrName = key
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
          const value = prop.type === "relation" ? await notion.resolveRelationContent(prop.content) : prop.content;
          return `${attrName}="${escapeXML(value)}"`;
        }),
    );
    return `<person id="${page.id}" name="${escapeXML(page.title)}" ${extraAttrs.join(" ")} />`;
  },
);
