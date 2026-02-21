import type { Bot } from "grammy";
import { env } from "env";
import { logger } from "logger";
import { notion } from "services/notion";

type Property = { type: string; [key: string]: unknown };

interface RichTextItem {
  plain_text: string;
}

function extractTitle(properties: Record<string, Property>): string {
  for (const prop of Object.values(properties)) {
    if (prop.type === "title") {
      const items = prop.title as RichTextItem[] | undefined;
      return items?.map((t) => t.plain_text).join("") ?? "";
    }
  }
  return "Untitled";
}

function extractSelect(prop: Property | undefined): string {
  if (!prop) return "";
  if (prop.type === "select") return (prop.select as { name: string } | null)?.name ?? "";
  if (prop.type === "status") return (prop.status as { name: string } | null)?.name ?? "";
  return "";
}

async function extractRelationNames(prop: Property | undefined): Promise<string> {
  if (!prop || prop.type !== "relation") return "";
  const items = prop.relation as Array<{ id: string }> | undefined;
  if (!items?.length) return "";
  const names = await Promise.all(items.map((r) => notion.getPageTitle(r.id)));
  return names.join(", ");
}

export async function handleNotionWebhook(bot: Bot, req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  // Validate webhook secret if configured
  if (env.NOTION_WEBHOOK_SECRET) {
    const auth = req.headers.get("Authorization");
    if (auth !== `Bearer ${env.NOTION_WEBHOOK_SECRET}`) return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  logger.info({ body }, "Notion webhook received");

  // Notion automation "Send webhook" sends { source, data: { properties, ... } }
  const data = body as { data?: { properties?: Record<string, Property> } };
  const properties = data?.data?.properties;
  if (!properties) {
    logger.warn({ body }, "No properties found in webhook payload");
    return new Response("OK", { status: 200 });
  }

  const title = extractTitle(properties);
  const status = extractSelect(properties["Status"]);
  const [reviewer, developer] = await Promise.all([
    extractRelationNames(properties["Reviewer"]),
    extractRelationNames(properties["Developer"]),
  ]);

  if (!status) {
    logger.info("No status in webhook payload, skipping notification");
    return new Response("OK", { status: 200 });
  }

  const parts = [`<b>${title}</b> is now <b>${status}</b>`];
  if (reviewer) parts.push(`Reviewer: ${reviewer}`);
  if (developer) parts.push(`Developer: ${developer}`);
  const message = parts.join("\n");

  try {
    await bot.api.sendMessage(env.TELEGRAM_TEAM_GROUP_ID, message, { parse_mode: "HTML" });
    logger.info({ title, status, reviewer, developer }, "Notion webhook notification sent");
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Failed to send notification");
    return new Response("Failed to send notification", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
