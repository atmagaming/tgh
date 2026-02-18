import { useArray } from "@hooks";
import { useEffect, useState } from "react";
import type { CallData } from "streaming-agent";
import { Line } from "./Line";
import { Output } from "./Output";
import { Reasoning } from "./Reasoning";
import { type Step, Steps } from "./Steps";

interface ToolProps {
  data: CallData;
  root?: boolean;
  depth?: number;
}

export function Tool({ data, root = false, depth = 0 }: ToolProps) {
  const indent = "  ".repeat(depth);
  const [outputEnded, setOutputEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [output, setOutput] = useState<string>();
  const [reasoning, setReasoning] = useState<string>();
  const [isReasoning, setIsReasoning] = useState(false);
  const [reasoningDuration, setReasoningDuration] = useState<number>();
  const steps = useArray<Step>();

  const { name } = data;

  useEffect(() => {
    if (data.outputEnded) setOutputEnded(true);

    const subs: { unsubscribe(): void }[] = [
      data.log.subscribe((msg) => steps.push({ type: "log", message: msg })),
      data.output.ended.subscribe(() => setOutputEnded(true)),
      data.error.subscribe(() => setFailed(true)),
    ];

    if (root) subs.push(data.output.delta.subscribe((text) => setOutput((prev) => (prev ?? "") + text)));

    if (data.type === "agent") {
      let reasoningStartTime: number;
      subs.push(
        data.reasoning.started.subscribe(() => {
          reasoningStartTime = Date.now();
          setIsReasoning(true);
        }),
        data.reasoning.delta.subscribe((text) => setReasoning((prev) => (prev ?? "") + text)),
        data.reasoning.ended.subscribe(() => {
          const duration = Math.round((Date.now() - reasoningStartTime) / 1000);
          setReasoningDuration(duration);
          setIsReasoning(false);
        }),
        data.call.subscribe((nested) => steps.push({ type: "call", data: nested })),
      );
    }

    return () => {
      for (const sub of subs) sub.unsubscribe();
    };
  }, [data]);

  if (data.type === "tool" && data.isHidden) return null;

  if (!root && outputEnded) {
    const emoji = failed ? "🔴" : "🟢";
    return (
      <Line>
        {indent}
        {emoji} <b>{name}</b>
      </Line>
    );
  }

  return (
    <>
      {!root && (
        <Line>
          {indent}⚪ <b>{name}</b>
        </Line>
      )}
      {root && (
        <Reasoning
          prefix={`${indent}  `}
          reasoning={reasoning}
          isReasoning={isReasoning}
          durationSec={reasoningDuration}
        />
      )}
      <Steps steps={steps.items} depth={root ? depth - 1 : depth} />
      {root && output && <Output output={output} prefix={indent} root />}
    </>
  );
}
