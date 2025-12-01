import { describe, expect, test } from "bun:test";
import { ClaudeAssistant } from "./claude-assistant";

describe.skipIf(!process.env.RUN_MANUAL_TESTS)("ClaudeAssistant (manual)", () => {
  const assistant = new ClaudeAssistant();

  test("should answer a math question", async () => {
    const response = await assistant.processMessage("What's 2+2?");
    expect(response).toBeDefined();
    expect(response).toContain("4");
    console.log("Math response:", response);
  });
});
