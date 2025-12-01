import type { Message, MessageEntity } from "grammy/types";

export function isBotMentioned(message: Message, botUsername?: string, botUserId?: number): boolean {
  if (!botUsername && !botUserId) return false;

  const textEntities = message.entities || [];
  const captionEntities = message.caption_entities || [];

  if (!textEntities.length && !captionEntities.length) return false;

  const checkEntities = (entities: MessageEntity[], text: string) =>
    entities.some((entity) => {
      if (entity.type === "mention") {
        const mention = extractMentionText(text, entity).toLowerCase();
        return botUsername && mention === `@${botUsername.toLowerCase()}`;
      }
      if (entity.type === "text_mention" && "user" in entity && entity.user) return botUserId === entity.user.id;
      return false;
    });

  return checkEntities(textEntities, message.text || "") || checkEntities(captionEntities, message.caption || "");
}

function extractMentionText(text: string, entity: MessageEntity): string {
  return text.slice(entity.offset, entity.offset + entity.length);
}
