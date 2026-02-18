import type { CallData } from "streaming-agent";
import { Line } from "./Line";
import { Tool } from "./Tool";

export type Step = { type: "log"; message: string } | { type: "call"; data: CallData };

interface StepsProps {
  steps: readonly Step[];
  depth: number;
}

export function Steps({ steps, depth }: StepsProps) {
  const indent = "  ".repeat(depth + 1);
  return (
    <>
      {steps.map((step) =>
        step.type === "log" ? (
          <Line key={step.message}>
            {indent}
            {step.message}
          </Line>
        ) : (
          <Tool key={step.data.id} depth={depth + 1} data={step.data} />
        ),
      )}
    </>
  );
}
