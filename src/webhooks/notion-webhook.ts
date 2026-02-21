import type { Bot } from "grammy";
import { env } from "env";
import { logger } from "logger";
import { notion } from "services/notion";
import { gramjsClient } from "services/telegram";

type Property = { type: string; [key: string]: unknown };

interface RichTextItem {
  plain_text: string;
}

interface TelegramPerson {
  name: string;
  telegramId: number | null;
}

// Notion person ID → Telegram info
const peopleMap = new Map<string, TelegramPerson>();

export async function initPeopleMap(): Promise<string> {
  const [people, chatInfo] = await Promise.all([
    notion.queryDatabase(env.NOTION_PEOPLE_DB_ID, {
      filter: { property: "Status", select: { equals: "Active" } },
    }),
    gramjsClient.getChatInfo(env.TELEGRAM_TEAM_GROUP_ID),
  ]);

  // Build username → telegram ID lookup from group participants
  const usernameToId = new Map<string, number>();
  for (const p of chatInfo.participants) {
    if (p.username) usernameToId.set(p.username.toLowerCase(), p.id);
  }

  for (const person of people) {
    const telegramContact = person.properties["Telegram / Contact"]?.content ?? "";
    let telegramId: number | null = null;

    if (telegramContact.startsWith("@")) {
      const username = telegramContact.slice(1).toLowerCase();
      telegramId = usernameToId.get(username) ?? null;
    } else if (/^\d+$/.test(telegramContact)) {
      telegramId = Number(telegramContact);
    }

    peopleMap.set(person.id, { name: person.title, telegramId });
  }

  return `People map: ${peopleMap.size} people, ${[...peopleMap.values()].filter((p) => p.telegramId).length} with Telegram`;
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

function extractRelationIds(prop: Property | undefined): string[] {
  if (!prop || prop.type !== "relation") return [];
  const items = prop.relation as Array<{ id: string }> | undefined;
  return items?.map((r) => r.id) ?? [];
}

function mentionPerson(person: TelegramPerson): string {
  if (person.telegramId) return `<a href="tg://user?id=${person.telegramId}">${person.name}</a>`;
  return person.name;
}

function notionPageUrl(pageId: string): string {
  return `https://www.notion.so/${pageId.replace(/-/g, "")}`;
}

async function resolvePersonMentions(prop: Property | undefined): Promise<string> {
  const ids = extractRelationIds(prop);
  if (!ids.length) return "";
  const mentions = await Promise.all(
    ids.map(async (id) => {
      const person = peopleMap.get(id);
      if (person) return mentionPerson(person);
      const name = await notion.getPageTitle(id);
      return name;
    }),
  );
  return mentions.join(", ");
}

export async function handleNotionWebhook(bot: Bot, req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

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

  const payload = body as { data?: { id?: string; properties?: Record<string, Property>; url?: string } };
  const properties = payload?.data?.properties;
  if (!properties) {
    logger.warn({ body }, "No properties found in webhook payload");
    return new Response("OK", { status: 200 });
  }

  const pageId = payload.data?.id ?? "";
  const title = extractTitle(properties);
  const status = extractSelect(properties["Status"]);

  if (!status) {
    logger.info("No status in webhook payload, skipping notification");
    return new Response("OK", { status: 200 });
  }

  // Determine responsible person and message based on status
  const statusLower = status.toLowerCase();
  let responsibleProp: Property | undefined;
  let suffix = "";

  if (statusLower.includes("ready for review")) {
    responsibleProp = properties.Reviewer;
    suffix = "Please check it as soon as possible \u{1F64F}";
  } else if (statusLower.includes("ready for test")) {
    responsibleProp = properties.QA;
    suffix = "Please check it as soon as possible \u{1F64F}";
  } else if (statusLower === "done") {
    responsibleProp = properties.Developer;
    suffix = "\u{1F389}";
  } else {
    responsibleProp = properties.Developer;
  }

  const responsibleMention = await resolvePersonMentions(responsibleProp);

  // Build task link
  const taskUrl = payload.data?.url ?? notionPageUrl(pageId);
  const taskLink = `<a href="${taskUrl}">${title}</a>`;

  // Resolve parent task
  const parentIds = extractRelationIds(properties["Parent item"]);
  let parentPart = "";
  const firstParentId = parentIds[0];
  if (firstParentId) {
    const parentTitle = await notion.getPageTitle(firstParentId);
    const parentUrl = notionPageUrl(firstParentId);
    parentPart = ` (subtask of <a href="${parentUrl}">${parentTitle}</a>)`;
  }

  const parts: string[] = [];
  if (responsibleMention) parts.push(`${responsibleMention} —`);
  if (statusLower === "done") {
    parts.push(`task ${taskLink}${parentPart} is <b>Done</b>! ${suffix}`);
  } else {
    parts.push(`task ${taskLink}${parentPart} was set to <b>${status}</b>.`);
    if (suffix) parts.push(suffix);
  }

  const message = parts.join(" ");

  try {
    await bot.api.sendMessage(env.TELEGRAM_TEAM_GROUP_ID, message, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
    logger.info({ title, status, responsibleMention }, "Notion webhook notification sent");
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Failed to send notification");
    return new Response("Failed to send notification", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
