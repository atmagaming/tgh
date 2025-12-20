import { tool } from "@openai/agents";
import { logger } from "logger";
import { gramjsClient } from "services/telegram";
import { z } from "zod";

export const getMessageInfoTool = tool({
  name: "get_message_info",
  description:
    "Get comprehensive information about a specific message: text, media (voice/photo/document), sender, date, reply relationships (replies to/from), and optionally transcribe voice messages. This is your primary tool for understanding message content and context.",
  parameters: z.object({
    message_id: z.number().describe("The ID of the message to get info for"),
    include_mentions: z
      .boolean()
      .optional()
      .describe("Include message mentions (replies to this message and message it replied to). Default: true"),
    transcribe_voice: z
      .boolean()
      .optional()
      .describe("If message contains voice, transcribe it using OpenAI Whisper. Default: false"),
  }),
  execute: async ({ message_id, include_mentions, transcribe_voice }) => {
    const includeMentions = include_mentions !== false;
    const transcribeVoice = transcribe_voice === true;

    logger.info({ messageId: message_id, includeMentions, transcribeVoice }, "Message info request received");

    const [messageInfo, mentions] = await Promise.all([
      gramjsClient.getMessageInfo(message_id),
      includeMentions ? gramjsClient.getMessageMentions(message_id) : Promise.resolve(undefined),
    ]);

    const result: Record<string, unknown> = {
      ...messageInfo,
    };

    if (mentions) {
      result.replied_to = mentions.repliedTo;
      result.replies = mentions.replies;
    }

    if (transcribeVoice && messageInfo.voice) {
      // Requires a Telegram bot context; temporarily disabled.
      // if (context?.telegramContext) {
      //   try {
      //     const bot = context.telegramContext.api;
      //     const msg = await bot.forwardMessage(env.ALLOWED_CHAT_ID, env.ALLOWED_CHAT_ID, message_id);
      //     if (msg.voice) {
      //       const fileLink = await bot.getFile(msg.voice.file_id);
      //       const voiceUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${fileLink.file_path}`;
      //       const response = await fetch(voiceUrl);
      //       const buffer = await response.arrayBuffer();
      //       const file = new File([buffer], "voice.ogg", { type: "audio/ogg" });
      //       const transcription = await openai.audio.transcriptions.create({ file, model: "whisper-1" });
      //       await bot.deleteMessage(env.ALLOWED_CHAT_ID, msg.message_id);
      //       result.voice_transcription = transcription.text;
      //       logger.info({ messageId: message_id, transcriptionLength: transcription.text.length }, "Voice transcribed");
      //     }
      //   } catch (error) {
      //     logger.error(
      //       { messageId: message_id, error: error instanceof Error ? error.message : error },
      //       "Voice transcription failed",
      //     );
      //     result.transcription_error = error instanceof Error ? error.message : "Unknown error";
      //   }
      // }
    }

    logger.info(
      {
        messageId: message_id,
        hasVoice: !!messageInfo.voice,
        hasMentions: !!mentions,
        transcribed: !!result.voice_transcription,
      },
      "Message info retrieved",
    );
    return result;
  },
});
