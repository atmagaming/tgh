import { geminiClient } from "services/gemini/gemini";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const analyzeImageTool = defineTool(
  "AnalyzeImage",
  "Analyze one or more images using Gemini vision. Supports description, identification, comparison, spatial reasoning, and critique.",
  z.object({
    task: z
      .string()
      .describe(
        "Structured analysis instructions. Reference images as Image 1, Image 2, etc. Specify the type of analysis: describe, identify, compare, explain, or evaluate.",
      ),
    images: z.array(z.string()).min(1).describe("Paths or URLs of images to analyze (max 14)"),
  }),
  async ({ task, images }) => geminiClient.analyzeImage(task, images),
);
