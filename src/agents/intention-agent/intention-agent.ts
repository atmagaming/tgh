import { Agent } from "@openai/agents";
import { models } from "models";
import { z } from "zod";
import { getChatInfoTool } from "./tools/get-chat-info";
import { getMessageInfoTool } from "./tools/get-message-info";

const INTENTION_AGENT_PROMPT = `You understand user intention from Telegram messages.

Core Task:
- Determine what the user wants to do from their message
- Resolve message references: "this message" (replied-to), "that conversation"
- Clarify ambiguous requests by searching relevant context

When to Activate:
- ONLY when user intention is unclear or ambiguous
- When message contains vague references that need resolution
- When context from other messages would clarify intent

Resolution Patterns:
- "this/that message" → check messageId, use get_message_info
- Conversation references → search keywords, get chat history
- Voice content → set transcribe_voice: true
- Always gather context before asking for clarification

Guidelines:
- get_message_info is your primary tool for message references
- Search uses AND logic (all terms required)
- Return concise intention summary with message IDs and links`;

const IntentionOutputSchema = z.object({
  clarified_intent: z.string(),
  referenced_messages: z.array(
    z.object({
      id: z.number(),
      link: z.string(),
      snippet: z.string(),
    }),
  ),
  confidence: z.enum(["high", "medium", "low"]),
  needs_user_clarification: z.boolean(),
});

export const intentionAgent = new Agent({
  name: "intention_agent",
  model: models.fast,
  instructions: INTENTION_AGENT_PROMPT,
  tools: [getMessageInfoTool, getChatInfoTool],
  outputType: IntentionOutputSchema,
});
