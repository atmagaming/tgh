import "@elumixor/extensions";

import { env } from "env";
import { webhookCallback } from "grammy";
import { logger } from "logger";
import { memories } from "services/memories";
import { gramjsClient } from "services/telegram";
import { App } from "./app.tsx";

// Initialize GramJS client
try {
  await gramjsClient.connect();
} catch (error) {
  logger.error({ error: error instanceof Error ? error.message : error }, "Failed to initialize GramJS");
  process.exit(1);
}

// Initialize memories (sync with Notion once on startup)
await memories.initialize();

const app = new App();

// Notify about new version in production
if (env.TELEGRAM_SESSION_LOCAL === undefined) {
  try {
    const packageJson = await Bun.file("./package.json").json();
    const version = packageJson.config?.version as string;
    await app.bot.api.sendMessage(env.ALLOWED_CHAT_ID, `🚀 Bot updated to version ${version}`);
    logger.info({ version }, "Version notification sent");
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to send version notification",
    );
  }
}

// Setup webhook handler if in webhook mode
const handleWebhook =
  env.BOT_MODE === "webhook"
    ? webhookCallback(app.bot, "std/http", {
        timeoutMilliseconds: 60_000, // 60 seconds to accommodate long-running agent tasks
      })
    : null;

if (env.BOT_MODE === "webhook") {
  await app.bot.api.setWebhook(`${env.BASE_URL}/webhook`);
  logger.info({ webhookUrl: `${env.BASE_URL}/webhook` }, "Webhook configured");
} else {
  await app.bot.api.deleteWebhook();
  app.bot.start();
  logger.info("Bot started in polling mode");
}

// Start HTTP server for webhook (only in webhook mode)
if (env.BOT_MODE === "webhook") {
  Bun.serve({
    port: env.PORT,
    async fetch(req) {
      const url = new URL(req.url);

      // Telegram webhook
      if (url.pathname === "/webhook" && handleWebhook) return await handleWebhook(req);

      // Health check
      if (url.pathname === "/") return new Response("Bot is running!", { status: 200 });

      return new Response("Not Found", { status: 404 });
    },
  });

  logger.info({ port: env.PORT }, "Server started in webhook mode");
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down...");
  try {
    await gramjsClient.disconnect();
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Error during shutdown");
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
