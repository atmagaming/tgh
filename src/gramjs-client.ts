import { TelegramClient } from "telegram";
import { Logger } from "telegram/extensions/Logger";
import { StringSession } from "telegram/sessions";
import { env } from "./env";
import { logger } from "./logger";

export class GramJSClient {
  private client: TelegramClient;
  private initialized = false;

  constructor() {
    const sessionString = env.TELEGRAM_SESSION_LOCAL ?? env.TELEGRAM_SESSION;
    const session = new StringSession(sessionString);
    this.client = new TelegramClient(session, env.TELEGRAM_API_ID, env.TELEGRAM_API_HASH, {
      connectionRetries: 5,
      baseLogger: new (class extends Logger {
        override log() {
          return;
        }
      })(),
    });
  }

  async connect(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.client.connect();
      const me = await this.client.getMe();
      logger.info({ userId: me.id, username: me.username }, "GramJS client connected");
      this.initialized = true;
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : error }, "Failed to connect GramJS client");
      throw new Error("GramJS session invalid or expired. Run 'bun run login' to regenerate.");
    }
  }

  async searchMessages(params: {
    query: string;
    limit?: number;
  }): Promise<Array<{ id: number; text: string; date: Date; senderId?: number }>> {
    if (!this.initialized) throw new Error("GramJS client not initialized");

    const { query, limit = 10 } = params;

    const messages = await this.client.getMessages(env.ALLOWED_CHAT_ID, {
      search: query,
      limit: Math.min(limit, 100),
    });

    return messages.map((msg) => ({
      id: msg.id,
      text: msg.text || "",
      date: new Date(msg.date * 1000),
      senderId: msg.senderId?.valueOf() as number | undefined,
    }));
  }

  async getMessageMentions(messageId: number): Promise<{
    repliedTo?: number;
    replies: number[];
  }> {
    if (!this.initialized) throw new Error("GramJS client not initialized");

    const [message, replies] = await Promise.all([
      this.client.getMessages(env.ALLOWED_CHAT_ID, { ids: [messageId] }),
      this.client.getMessages(env.ALLOWED_CHAT_ID, { replyTo: messageId, limit: 100 }),
    ]);

    return {
      repliedTo: message[0]?.replyTo?.replyToMsgId,
      replies: replies.map((msg) => msg.id),
    };
  }

  async getMessageHistory(params: {
    limit?: number;
    offset?: number;
  }): Promise<Array<{ id: number; text: string; date: Date; senderId?: number }>> {
    if (!this.initialized) throw new Error("GramJS client not initialized");

    const { limit = 10, offset = 0 } = params;

    const messages = await this.client.getMessages(env.ALLOWED_CHAT_ID, {
      limit: Math.min(limit, 100),
      offsetId: offset,
    });

    return messages.map((msg) => ({
      id: msg.id,
      text: msg.text || "",
      date: new Date(msg.date * 1000),
      senderId: msg.senderId?.valueOf() as number | undefined,
    }));
  }

  async getChatInfo(): Promise<{
    title: string;
    participantCount?: number;
    participants?: Array<{ id: number; username?: string; firstName?: string; lastName?: string }>;
    messageCount?: number;
    description?: string;
  }> {
    if (!this.initialized) throw new Error("GramJS client not initialized");

    const entity = await this.client.getEntity(env.ALLOWED_CHAT_ID);

    const result: {
      title: string;
      participantCount?: number;
      participants?: Array<{ id: number; username?: string; firstName?: string; lastName?: string }>;
      messageCount?: number;
      description?: string;
    } = {
      title: "title" in entity ? (entity.title as string) : "Unknown",
    };

    if ("participantsCount" in entity) result.participantCount = entity.participantsCount as number;

    if ("about" in entity) result.description = entity.about as string;

    try {
      const messages = await this.client.getMessages(env.ALLOWED_CHAT_ID, { limit: 1 });
      if (messages.length > 0 && messages[0]) result.messageCount = messages[0].id;
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : error }, "Failed to get message count");
    }

    try {
      const participants = await this.client.getParticipants(env.ALLOWED_CHAT_ID, { limit: 100 });
      result.participants = participants.map((p) => ({
        id: p.id.valueOf() as number,
        username: "username" in p ? (p.username as string) : undefined,
        firstName: "firstName" in p ? (p.firstName as string) : undefined,
        lastName: "lastName" in p ? (p.lastName as string) : undefined,
      }));
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : error }, "Failed to get participants");
    }

    return result;
  }

  async disconnect(): Promise<void> {
    if (this.initialized) {
      await this.client.disconnect();
      this.initialized = false;
      logger.info("GramJS client disconnected");
    }
  }
}

export const gramjsClient = new GramJSClient();
