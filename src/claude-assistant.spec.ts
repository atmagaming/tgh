import { describe, expect, test } from "bun:test";
import { ClaudeAssistant } from "./claude-assistant";

describe("ClaudeAssistant", () => {
  const assistant = new ClaudeAssistant();

  test("should process a simple greeting", async () => {
    const response = await assistant.processMessage("Hello, who are you?");
    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
    console.log("Greeting response:", response);
  });

  test("should answer a math question", async () => {
    const response = await assistant.processMessage("What's 2+2?");
    expect(response).toBeDefined();
    expect(response).toContain("4");
    console.log("Math response:", response);
  });

  test("should generate creative content", async () => {
    const response = await assistant.processMessage("Write a haiku about coding");
    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
    console.log("Haiku response:", response);
  });
});
