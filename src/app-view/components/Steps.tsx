import type { CallData } from "@agents";
import { Line } from "./Line";
import { Tool } from "./Tool";

export type Step = { type: "log"; message: string } | { type: "call"; data: CallData };

interface StepsProps {
  steps: readonly Step[];
  depth: number;
  root?: boolean;
  hasOutput: boolean;
  getPrefix: (index: number) => string;
  onNestedSummarized: (name: string) => void;
}

export function Steps({ steps, depth, root, hasOutput, getPrefix, onNestedSummarized }: StepsProps) {
  return (
    <>
      {steps.map((step, index) =>
        step.type === "log" ? (
          <Line key={step.message}>
            {getPrefix(index)}
            {step.message}
          </Line>
        ) : (
          <Tool
            key={step.data.name}
            depth={depth + 1}
            data={step.data}
            isLast={index === steps.length - 1 && (root || !hasOutput)}
            onSummarized={() => onNestedSummarized(step.data.name)}
          />
        ),
      )}
    </>
  );
}
