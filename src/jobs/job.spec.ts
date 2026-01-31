import { describe, expect, it } from "bun:test";
import type { Context } from "grammy";
import { Job } from "./job";

describe("job", () => {
  it("Should create valid summary of the job", () => {
    expect.hasAssertions();
    const job = new Job(undefined as unknown as Context, "Analyze sales data for Q1 2024 and provide insights", 1, 1);
    expect(job.summarizedName).resolves.toBeDefined();
  });
});
