import { Bot, webhookCallback } from "grammy";
import { ClaudeAssistant } from "./claude-assistant";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is required");

const MODE = process.env.BOT_MODE || "polling"; // "polling" or "webhook"
const ALLOWED_CHAT_ID = -1003479491103; // The specific group chat ID
const bot = new Bot(botToken);
const assistant = new ClaudeAssistant();

// Middleware to filter only allowed group
bot.use(async (ctx, next) => {
  if (ctx.chat?.id === ALLOWED_CHAT_ID) {
    await next();
  }
});

bot.command("start", (ctx) => ctx.reply("Hello! I'm your AI assistant. Send me any message and I'll help you."));

bot.on("message::mention", async (ctx) => {
  console.log("Received mention:", ctx.message.text);

  const userMessage = ctx.message.text;
  await ctx.replyWithChatAction("typing");

  await ctx.reply("This feature is under development. Please use direct messages to interact with me for now.");
  // try {
  //   const response = await assistant.processMessage(userMessage);
  //   await ctx.reply(response, { reply_parameters: { message_id: ctx.message.message_id } });
  // } catch (error) {
  //   console.error("Error processing message:", error);
  //   await ctx.reply("Sorry, I encountered an error processing your request.");
  // }
});

bot.on("message:text", async (ctx) => {
  console.log("Received message:", ctx.message.text);

  // Only respond if bot is mentioned or it's a reply to the bot
  const botMention = ctx.message.entities?.some(
    (entity) => entity.type === "mention" || entity.type === "text_mention",
  );
  const isReply = ctx.message.reply_to_message?.from?.id === ctx.me.id;

  if (!botMention && !isReply) {
    return; // Ignore messages that don't mention the bot
  }

  const userMessage = ctx.message.text;

  await ctx.replyWithChatAction("typing");

  try {
    // const response = await assistant.processMessage(userMessage);
    const response = "This feature is under development. Please use direct messages to interact with me for now.";
    await ctx.reply(response, { reply_parameters: { message_id: ctx.message.message_id } });
  } catch (error) {
    console.error("Error processing message:", error);
    await ctx.reply("Sorry, I encountered an error processing your request.");
  }
});

if (MODE === "webhook") {
  // Webhook mode (for production with public HTTPS URL)
  const PORT = process.env.PORT || 10000;
  const WEBHOOK_URL = process.env.WEBHOOK_URL;

  if (!WEBHOOK_URL) {
    throw new Error("WEBHOOK_URL is required for webhook mode");
  }

  // Set webhook with Telegram
  await bot.api.setWebhook(`${WEBHOOK_URL}/webhook`);
  console.log(`Webhook mode: ${WEBHOOK_URL}/webhook`);

  // Create webhook handler
  const handleWebhook = webhookCallback(bot, "std/http");

  // Start server with webhook handler
  Bun.serve({
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/webhook") {
        return await handleWebhook(req);
      }

      if (url.pathname === "/") {
        return new Response("Bot is running!", { status: 200 });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`Bot server started on port ${PORT}`);
} else {
  // Polling mode (for local development)
  console.log("Polling mode: starting bot...");

  // Remove webhook if it was set before
  await bot.api.deleteWebhook();

  bot.start();
  console.log("Bot is running in polling mode");
}
