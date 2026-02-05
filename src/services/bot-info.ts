import { logger } from "logger";

export interface BotInfo {
  id: number;
  username: string;
  firstName: string;
}

let botInfo: BotInfo | null = null;

export function setBotInfo(info: BotInfo): void {
  botInfo = info;
  logger.info({ username: info.username, firstName: info.firstName }, "Bot info set");
}

export function getBotInfo(): BotInfo {
  if (!botInfo) throw new Error("Bot info not initialized");
  return botInfo;
}
