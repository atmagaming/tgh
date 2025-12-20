import { describe, expect, it } from "bun:test";
import z from "zod";
import { Tool } from "./tool";

describe("Tool", () => {
  it("should create a tool with correct definition", () => {
    const tool = new Tool(
      "test_tool",
      "Test description",
      {
        a: z.string().describe("A string parameter"),
        b: z.number().optional().describe("An optional number parameter"),
      },
      ({ a, b }) => Promise.resolve({ a, b }),
    );

    console.log(tool.definition);

    expect(tool.definition.name).toBe("test_tool");
    expect(tool.definition.description).toBe("Test description");
    expect(tool.definition.input_schema).toBeDefined();
    expect(tool.definition.input_schema?.properties).toHaveProperty("a");
    expect(tool.definition.input_schema?.properties).toHaveProperty("b");
  });
});
