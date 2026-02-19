import { meshyClient } from "services/meshy/meshy";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const generate3DFromImageTool = defineTool(
  "Generate3DFromImage",
  "Generate a 3D model from an image URL",
  z.object({
    imageUrl: z.string().describe("URL of the image to convert to 3D"),
  }),
  async ({ imageUrl }) => {
    const taskId = await meshyClient.createImageTo3D({ image_url: imageUrl });
    const finalTask = await meshyClient.pollTask(taskId);

    if (finalTask.status !== "SUCCEEDED") {
      const error = finalTask.status === "FAILED" ? finalTask.error : `Status: ${finalTask.status}`;
      throw new Error(`3D generation failed: ${error ?? "Unknown error"}`);
    }

    const glbUrl = finalTask.model_urls?.glb;
    const fbxUrl = finalTask.model_urls?.fbx;

    if (!glbUrl && !fbxUrl) throw new Error("3D generation completed but no model files found");

    const files: { buffer: Buffer; mimeType: string; filename: string }[] = [];

    if (glbUrl) {
      const glbBuffer = await meshyClient.downloadFile(glbUrl);
      files.push({ buffer: glbBuffer, mimeType: "model/gltf-binary", filename: "model.glb" });
    }

    if (fbxUrl) {
      const fbxBuffer = await meshyClient.downloadFile(fbxUrl);
      files.push({ buffer: fbxBuffer, mimeType: "application/octet-stream", filename: "model.fbx" });
    }

    return { files };
  },
);
