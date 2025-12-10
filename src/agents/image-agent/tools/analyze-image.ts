import * as fs from "node:fs/promises";
import type { Tool } from "agents/agent";
import { logger } from "logger";
import { geminiClient } from "services/gemini/gemini";
import { detectMimeType } from "utils/temp-files";

export const analyzeImageTool: Tool = {
  definition: {
    name: "analyze_image",
    description:
      "Analyze an image using Gemini Vision AI. Describes content, identifies objects, reads text, detects emotions. Use when user asks to analyze, describe, or understand image content. Accepts URL or local file path.",
    input_schema: {
      type: "object",
      properties: {
        imageUrl: {
          type: "string",
          description: "URL of the image to analyze (for web images or Telegram URLs).",
        },
        imagePath: {
          type: "string",
          description: "Local file path to analyze (for temp files from download_drive_file, generate_image, etc.).",
        },
        prompt: {
          type: "string",
          description: "Optional specific question about the image. If not provided, gives general description.",
        },
      },
      // At least one of imageUrl or imagePath required (enforced in execute)
    },
  },
  execute: async (toolInput) => {
    const imageUrl = toolInput.imageUrl as string | undefined;
    const imagePath = toolInput.imagePath as string | undefined;
    const prompt = toolInput.prompt as string | undefined;

    logger.info({ imageUrl, imagePath, prompt }, "Image analysis request");

    let analysis: string;

    if (imageUrl) {
      analysis = await geminiClient.analyzeImage(imageUrl, prompt);
    } else if (imagePath) {
      const buffer = await fs.readFile(imagePath);
      const mimeType = detectMimeType(imagePath);
      analysis = await geminiClient.analyzeImageFromBuffer(buffer, mimeType, prompt);
    } else {
      throw new Error("Either imageUrl or imagePath is required");
    }

    logger.info({ imageUrl, imagePath, analysisLength: analysis.length }, "Image analysis completed");

    return { analysis };
  },
};
