import { env } from "env";
import { notion } from "services/notion";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const getPeopleTool = defineTool(
  "GetPeople",
  "Get all people from the People database. By default only active people are returned.",
  z.object({
    showInactive: z.boolean().nullable().describe("Include inactive people; null/false shows only active"),
  }),
  async ({ showInactive }) => {
    const onlyActive = !(showInactive ?? false);
    const filter = onlyActive ? { property: "Status", select: { equals: "Active" } } : undefined;

    const [pages, roles] = await Promise.all([
      notion.queryDatabase(env.NOTION_PEOPLE_DB_ID, { filter }),
      notion.queryDatabase(env.NOTION_ROLES_DB_ID),
    ]);

    const roleNames = new Map(roles.map((r) => [r.id, r.title]));

    const lines = pages.map((page) => {
      const p = page.properties;
      const role = (p.Role?.content ?? "")
        .split(", ")
        .filter(Boolean)
        .map((id) => roleNames.get(id) ?? id)
        .join(", ");
      const telegram = p["Telegram / Contact"]?.content ?? "";
      const sensitiveId = p["Sensitive Data"]?.content ?? "";
      const status = onlyActive ? "" : ` | ${p.Status?.content ?? ""}`;
      return `${page.title} (${page.id}) | ${role} | ${telegram} | ${sensitiveId}${status}`;
    });

    return lines.join("\n");
  },
);
