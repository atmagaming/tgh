import { defineTool } from "@agentic/streaming-agent";
import { delay } from "@elumixor/frontils";
import { z } from "zod";

export const waitTool = defineTool(
  "Wait",
  "Wait for a specified number of seconds",
  z.object({
    seconds: z.number().min(1).max(60).describe("Number of seconds to wait"),
  }),
  ({ seconds }) => delay(seconds),
);
