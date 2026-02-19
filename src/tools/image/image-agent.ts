import { models } from "models";
import { StreamingAgent } from "streaming-agent";
import { explainTool } from "../core";
import { analyzeImageTool, generate3DFromImageTool, generateImageTool } from "./tools";

const IMAGE_AGENT_PROMPT = `You handle visual content operations.

When generating or editing images:
- Write detailed narrative prompts with explicit intent (new image vs edit)
- Label reference images as "Image 1", "Image 2", etc.
- Be specific about pose, style, lighting, composition, and mood
- For edits, specify what changes and what stays the same

When analyzing images:
- Formulate clear analysis instructions referencing images by label
- Specify the type of analysis: describe, identify, compare, explain, or evaluate
- Ground conclusions in visible evidence

Focus on visual result, minimal explanation.`;

export const imageAgent = new StreamingAgent({
  name: "image_agent",
  model: models.mini,
  instructions: IMAGE_AGENT_PROMPT,
  tools: [generateImageTool, analyzeImageTool, explainTool, generate3DFromImageTool],
});
