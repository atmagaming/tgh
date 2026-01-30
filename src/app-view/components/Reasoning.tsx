import { Line } from "./Line";

interface ReasoningProps {
  prefix: string;
  reasoning?: string;
  isReasoning: boolean;
  durationSec?: number;
}

export function Reasoning({ prefix, reasoning, isReasoning, durationSec }: ReasoningProps) {
  if (isReasoning)
    return (
      <Line>
        {prefix}
        {reasoning} 💭
      </Line>
    );

  if (durationSec !== undefined)
    return (
      <Line>
        {prefix}💭 ({durationSec}s)
      </Line>
    );

  return null;
}
