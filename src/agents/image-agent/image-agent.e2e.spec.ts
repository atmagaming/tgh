import { describe, expect, test } from "bun:test";
import { analyzeImageTool } from "./tools/analyze-image";
import { generateImageTool } from "./tools/generate-image";

describe("ImageAgent E2E", () => {
  test.skipIf(process.env.RUN_MANUAL_TESTS !== "1")(
    "[E2E] should generate image and then analyze it",
    async () => {
      // Step 1: Generate an image
      const generateResult = (await generateImageTool.execute({
        prompt: "A simple red circle on white background",
        aspect_ratio: "1:1",
      })) as {
        success: boolean;
        image_url?: string;
        error?: string;
      };

      expect(generateResult.success).toBe(true);
      expect(generateResult.image_url).toBeTruthy();

      if (!generateResult.image_url) throw new Error("No image URL returned");

      // Step 2: Wait a moment for the image to be available
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 3: Analyze the generated image
      const analyzeResult = (await analyzeImageTool.execute({
        image_url: generateResult.image_url,
      })) as {
        analysis: string;
      };

      expect(analyzeResult.analysis).toBeTruthy();
      expect(typeof analyzeResult.analysis).toBe("string");
      expect(analyzeResult.analysis.length).toBeGreaterThan(10);

      // Step 4: Verify the analysis mentions expected elements
      const analysis = analyzeResult.analysis.toLowerCase();
      expect(analysis).toMatch(/circle|round|red|shape/);

      console.log("\n=== E2E Test Results ===");
      console.log("Generated Image URL:", generateResult.image_url);
      console.log("Analysis:", analyzeResult.analysis);
      console.log("========================\n");
    },
    30000, // 30 second timeout for image generation
  );

  test.skipIf(process.env.RUN_MANUAL_TESTS !== "1")(
    "[E2E] should analyze existing image with custom prompt",
    async () => {
      // Use a known test image
      const testImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/1200px-Cat03.jpg";

      const analyzeResult = (await analyzeImageTool.execute({
        image_url: testImageUrl,
        prompt: "What animal is this and what color is its fur?",
      })) as {
        analysis: string;
      };

      expect(analyzeResult.analysis).toBeTruthy();
      expect(typeof analyzeResult.analysis).toBe("string");

      const analysis = analyzeResult.analysis.toLowerCase();
      expect(analysis).toMatch(/cat|feline/);
      expect(analysis).toMatch(/orange|ginger|tabby|brown/);

      console.log("\n=== Custom Prompt Analysis ===");
      console.log("Image URL:", testImageUrl);
      console.log("Analysis:", analyzeResult.analysis);
      console.log("==============================\n");
    },
  );
});
