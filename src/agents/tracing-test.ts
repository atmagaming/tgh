/**
 * Test file to debug tracing
 * Run: bun run src/agents/tracing-test.ts
 */

import { Agent, run, withTrace, addTraceProcessor, getGlobalTraceProvider } from "@openai/agents";

// Add a console processor to see traces
addTraceProcessor({
  processSpan(span) {
    console.log("[SPAN]", span.spanData.type, span.spanData);
  },
  processTrace(trace) {
    console.log("[TRACE]", trace.traceId, trace.name);
  },
  async shutdown() {
    console.log("[SHUTDOWN]");
  },
  async forceFlush() {
    console.log("[FLUSH]");
  },
});

const agent = new Agent({
  name: "TestAgent",
  model: "gpt-4o-mini",
  instructions: "You are a helpful assistant. Be brief.",
});

async function main() {
  console.log("Starting trace test...\n");

  await withTrace("TestWorkflow", async () => {
    console.log("Inside withTrace...");
    const result = await run(agent, "Say hello in 3 words");
    console.log("\nResult:", result.finalOutput);
  });

  // Force flush to ensure traces are exported
  await getGlobalTraceProvider().forceFlush();

  console.log("\nDone!");
}

main().catch(console.error);
