import { geminiClient } from "services/gemini/gemini";
import { defineTool } from "streaming-agent";
import { saveTempFile } from "utils";
import { z } from "zod";

export const generateImageTool = defineTool(
  "GenerateImage",
  "Generate new images or edit existing ones. Supports creation, targeted edits, style transfer, and character consistency.",
  z.object({
    prompt: z
      .string()
      .describe(
        "Detailed prompt for image generation or editing. Specify intent (new/edit), reference image labels (Image 1, Image 2), and desired visual details.",
      ),
    reference_images: z
      .array(z.string())
      .nullable()
      .describe("Paths or URLs to reference images (max 14). Label them as Image 1, Image 2, etc. in the prompt."),
  }),
  async ({ prompt, reference_images }) => {
    const { images, texts } = await geminiClient.generateImage(prompt, reference_images ?? undefined);
    const files = await Promise.all(
      images.map((base64, i) => saveTempFile(Buffer.from(base64, "base64"), `generated-${i + 1}.png`)),
    );
    return { files, texts };
  },
);
