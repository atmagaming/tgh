import type { Tool } from "agents/agent";
import { logger } from "logger";
import { meshyClient } from "services/meshy/meshy";
import type { FileOutput } from "utils/output";
import { saveTempFile } from "utils/temp-files";

export const generate3DFromImageTool: Tool = {
  definition: {
    name: "generate_3d_from_image",
    description:
      "Generate a 3D model from an image URL. Long-running operation with progress updates. Returns GLB/FBX model files via output handler.",
    input_schema: {
      type: "object",
      properties: {
        image_url: {
          type: "string",
          description: "The URL of the image to convert to 3D",
        },
      },
      required: ["image_url"],
    },
  },
  execute: async (toolInput, context) => {
    const image_url = toolInput.image_url as string;

    logger.info({ image_url }, "3D generation request");

    context?.progress?.message("🔄 Starting 3D generation...");

    const taskId = await meshyClient.createImageTo3D({ image_url });
    logger.info({ taskId, image_url }, "3D generation task created");

    // Poll for completion with progress updates
    const finalTask = await meshyClient.pollTask(taskId, async (task) => {
      const statusEmoji = {
        PENDING: "⏳",
        IN_PROGRESS: "🔄",
        SUCCEEDED: "✅",
        FAILED: "❌",
        CANCELED: "🚫",
      }[task.status];

      context?.progress?.message(`${statusEmoji} ${task.status}: ${task.progress}%`);
    });

    if (finalTask.status !== "SUCCEEDED") {
      const error = finalTask.status === "FAILED" ? finalTask.error : `Status: ${finalTask.status}`;
      throw new Error(`3D generation failed: ${error ?? "Unknown error"}`);
    }

    const glbUrl = finalTask.model_urls?.glb;
    const fbxUrl = finalTask.model_urls?.fbx;

    if (!glbUrl && !fbxUrl) throw new Error("3D generation completed but no model files found");

    logger.info({ taskId, glbUrl, fbxUrl }, "3D generation completed");

    // Download and save files
    const files: FileOutput[] = [];

    if (glbUrl) {
      const glbData = await meshyClient.downloadFile(glbUrl);
      const glbPath = await saveTempFile(glbData, "glb");
      files.push({ path: glbPath, mimeType: "model/gltf-binary", filename: "model.glb", caption: "GLB Model" });
    }

    if (fbxUrl) {
      const fbxData = await meshyClient.downloadFile(fbxUrl);
      const fbxPath = await saveTempFile(fbxData, "fbx");
      files.push({ path: fbxPath, mimeType: "application/octet-stream", filename: "model.fbx", caption: "FBX Model" });
    }

    // Send files via output handler
    if (context?.output && files.length > 0) await context.output.sendFiles(files);

    return {
      success: true,
      message: `3D model generated (${files.map((f) => f.filename?.split(".")[1]?.toUpperCase()).join(", ")})`,
      taskId,
    };
  },
};
