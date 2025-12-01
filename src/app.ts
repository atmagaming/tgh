import { Bot } from "grammy";
import { claude } from "./claude-assistant";
import { env } from "./env";
import { isBotMentioned } from "./utils/mention-parser";

export class App {
  readonly bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  private botUsername?: string;
  private botUserId?: number;

  constructor() {
    this.bot.api.getMe().then((me) => {
      this.botUsername = me.username;
      this.botUserId = me.id;
      claude.botName = me.username;
      console.log(`Bot username: @${me.username}, ID: ${me.id}`);
    });

    this.bot.on("message", async (ctx) => {
      const isGroupChat = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";

      if (isGroupChat) {
        if (ctx.chat?.id !== env.ALLOWED_CHAT_ID) return;

        if (!isBotMentioned(ctx.message, this.botUsername, this.botUserId)) return;

        console.log("Received mention in group from:", ctx.from?.username, "ID:", ctx.from?.id);
      } else {
        if (ctx.from?.id !== env.ALLOWED_USER_ID) return;
      }

      await ctx.replyWithChatAction("typing");

      try {
        let userMessage = "";
        const imageUrls: string[] = [];

        const text = ctx.message.text || ctx.message.caption || "";
        if (text) userMessage = text;

        if (ctx.message.photo) {
          const photo = ctx.message.photo.at(-1);
          if (photo) {
            const fileLink = await ctx.api.getFile(photo.file_id);
            const imageUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${fileLink.file_path}`;
            imageUrls.push(imageUrl);
          }
        }

        if (ctx.message.reply_to_message?.photo) {
          const photo = ctx.message.reply_to_message.photo.at(-1);
          if (photo) {
            const fileLink = await ctx.api.getFile(photo.file_id);
            const imageUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${fileLink.file_path}`;
            imageUrls.push(imageUrl);
          }
        }

        if (imageUrls.length > 0) {
          userMessage = userMessage
            ? `${userMessage}\n\nImage URLs: ${JSON.stringify(imageUrls)}`
            : `I've received ${imageUrls.length} image(s): ${JSON.stringify(imageUrls)}`;
        }

        if (!userMessage) return;

        const response = await claude.processMessage(userMessage, ctx);
        if (response) await ctx.reply(response, { reply_parameters: { message_id: ctx.message.message_id } });
      } catch (error) {
        console.error("Error processing message:", error);
        await ctx.reply("Sorry, I encountered an error processing your request.");
      }
    });
  }
}
