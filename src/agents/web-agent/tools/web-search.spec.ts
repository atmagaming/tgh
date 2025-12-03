import { describe, expect, it } from "bun:test";
import { webSearchTool } from "./web-search";

describe("web-search", () => {
  it("should have correct tool definition", () => {
    expect(webSearchTool.definition.name).toBe("web_search");
    expect(webSearchTool.definition.input_schema.required).toContain("query");
  });
});

describe.skipIf(!process.env.RUN_MANUAL_TESTS)("web-search (manual)", () => {
  it("should return actual search results", async () => {
    const result = await webSearchTool.execute({ query: "What is the weather today?" });
    expect(typeof result).toBe("string");
    expect((result as string).length).toBeGreaterThan(0);
  }, 30000);
});
