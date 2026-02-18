import type { ReactionTypeEmoji } from "@grammyjs/types";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const setReactionTool = defineTool(
  "SetReaction",
  "Set a reaction emoji on the user's message, replacing any current reaction. Common uses: 👍 (done), 🔥 (success), 👀 (looking), 😢 (error), 🤔 (warning), 🎉 (celebration). Only standard Telegram reaction emojis are supported.",
  z.object({
    emoji: z.string().describe("Telegram reaction emoji"),
  }),
  ({ emoji }, job) =>
    job.telegramContext.api.setMessageReaction(job.currentChatId, job.messageId, [
      { type: "emoji", emoji: emoji as ReactionTypeEmoji["emoji"] },
    ]),
  { isHidden: true },
);
