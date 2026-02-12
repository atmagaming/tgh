import { openai } from "services/openai";

const cache = new Map<string, string>();

export async function transcribeAudio(buffer: Buffer, fileId: string): Promise<string> {
  const cached = cache.get(fileId);
  if (cached) return cached;

  const file = new File([buffer], "voice.ogg", { type: "audio/ogg" });
  const { text } = await openai.audio.transcriptions.create({ model: "whisper-1", file });
  cache.set(fileId, text);
  return text;
}
