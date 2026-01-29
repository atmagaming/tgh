import "extensions";
import { JobStatus } from "@components/JobStatus";
import { EventEmitter } from "@elumixor/event-emitter";
import { delay } from "@elumixor/frontils";
import { useArray, usePromise } from "@hooks";
import { useJob } from "@providers/JobProvider";
import { Message } from "io/output";
import { useEffect, useMemo, useState } from "react";

export function Main() {
  const job = useJob();
  const [summarized, onSummarized] = usePromise<string>();

  // Create mock agent data with event emitters
  const agentData = useMemo<AgentCallData>(
    () => ({
      type: "agent",
      name: "DriveAgent",
      input: "find concept art",
      reasoning: {
        started: new EventEmitter(),
        delta: new EventEmitter(),
        ended: new EventEmitter(),
      },
      output: {
        started: new EventEmitter(),
        delta: new EventEmitter(),
        ended: new EventEmitter(),
      },
      log: new EventEmitter(),
      call: new EventEmitter(),
    }),
    [],
  );

  useEffect(() => {
    void (async () => {
      // Root agent starts reasoning
      agentData.reasoning.started.emit();
      await delay(0.5);
      agentData.reasoning.delta.emit("Let me find concept art for you...");
      await delay(1);
      agentData.reasoning.ended.emit();

      agentData.log.emit("Delegating to FileAgent...");
      await delay(0.5);

      // Root agent calls a nested agent (which will summarize)
      const nestedAgent: AgentCallData = {
        type: "agent",
        name: "FileAgent",
        input: "search for *.png",
        reasoning: {
          started: new EventEmitter(),
          delta: new EventEmitter(),
          ended: new EventEmitter(),
        },
        output: {
          started: new EventEmitter(),
          delta: new EventEmitter(),
          ended: new EventEmitter(),
        },
        log: new EventEmitter(),
        call: new EventEmitter(),
      };
      agentData.call.emit(nestedAgent);

      await delay(0.5);
      nestedAgent.reasoning.started.emit();
      nestedAgent.reasoning.delta.emit("I'll search Google Drive...");
      await delay(1);
      nestedAgent.reasoning.ended.emit();

      nestedAgent.log.emit("Preparing search query...");
      await delay(0.5);

      // Nested agent calls a tool (deepest level - will summarize first)
      const nestedTool: ToolCallData = {
        type: "tool",
        name: "SearchDrive",
        input: { query: "*.png", folder: "/Assets" },
        log: new EventEmitter(),
        output: {
          started: new EventEmitter(),
          delta: new EventEmitter(),
          ended: new EventEmitter(),
        },
      };
      nestedAgent.call.emit(nestedTool);

      await delay(0.5);
      nestedTool.log.emit("Connecting to Drive API");
      await delay(1);
      nestedTool.log.emit("Found 3 files");
      await delay(0.5);
      nestedTool.output.delta.emit("concept_art.png, logo.png, banner.png");

      // Now FileAgent continues and finishes
      nestedAgent.log.emit("Processing results...");
      await delay(0.5);
      nestedAgent.output.delta.emit("Found 3 PNG files in /Assets");

      // Root agent continues
      agentData.log.emit("Received results from FileAgent");
      await delay(0.5);
      agentData.output.delta.emit("Here is your file: ./concept_art.png");

      // Wait for root completion (no summarization, just signals done)
      await summarized;
      job.done = true;
    })();
  }, []);

  return (
    <Message repliesTo={job.messageId}>
      <Tool data={agentData} root onSummarized={onSummarized} />
      <br />
      <JobStatus />
    </Message>
  );
}

/** Mock summarization - returns summary after 1.5s */
async function mockSummarize(_name: string, _input: string, _steps: string[], output: string): Promise<string> {
  await delay(1);
  return `${output.slice(0, 30)}...`;
}

// ============ Event-driven Call interfaces ============

interface DeltaStream {
  started: EventEmitter<void>;
  delta: EventEmitter<string>;
  ended: EventEmitter<void>;
}

interface ToolCallData {
  type: "tool";
  name: string;
  input: Record<string, unknown>;
  log: EventEmitter<string>;
  output: DeltaStream;
}

interface AgentCallData {
  type: "agent";
  name: string;
  input: string;
  reasoning: DeltaStream;
  output: DeltaStream;
  log: EventEmitter<string>;
  call: EventEmitter<CallData>;
}

type CallData = ToolCallData | AgentCallData;

// ============ Event-driven Tool component ============

interface ToolProps {
  data: CallData;
  root?: boolean;
  depth?: number;
  onSummarized?: (summary: string) => void;
}

type Step = { type: "log"; message: string } | { type: "call"; data: CallData };

function Tool({ data, root = false, depth = 0, onSummarized }: ToolProps) {
  const indent = "   ".repeat(depth);
  const parentIndent = depth > 0 ? "   ".repeat(depth - 1) : "";
  const [summary, setSummary] = useState<string>();
  const [reasoning, setReasoning] = useState<string>();
  const [isReasoning, setIsReasoning] = useState(false);
  const [reasoningDurationSec, setReasoningDurationSec] = useState<number>();
  const [output, setOutput] = useState<string>();
  const steps = useArray<Step>();
  const [nestedDone, setNestedDone] = useState<Set<string>>(new Set());

  const { name, input } = data;
  const inputStr = typeof input === "string" ? input : JSON.stringify(input);

  useEffect(() => {
    // Subscribe to log events
    const logSub = data.log.subscribe((msg) => steps.push({ type: "log", message: msg }));

    // Subscribe to output events
    const outputSub = data.output.delta.subscribe((text) => setOutput((prev) => (prev ?? "") + text));

    // Agent-specific subscriptions
    const subs: { unsubscribe: () => void }[] = [logSub, outputSub];

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
          setReasoningDurationSec(duration);
          setIsReasoning(false);
        }),
        data.call.subscribe((nested) => steps.push({ type: "call", data: nested })),
      );
    }

    return () => {
      for (const sub of subs) sub.unsubscribe();
    };
  }, [data]);

  // Check if all nested calls are done
  const nestedCalls = steps.filter((s) => s.type === "call");
  const logs = steps.filter((s) => s.type === "log");
  const allNestedDone = nestedCalls.every((c) => nestedDone.has(c.data.name));

  // Trigger summarization when output is done and all nested calls are done
  useEffect(() => {
    if (!output || !allNestedDone || summary) return;
    if (root) {
      // Root tools don't summarize, just signal completion
      onSummarized?.(output);
    } else {
      void mockSummarize(
        name,
        inputStr,
        logs.map((l) => l.message),
        output,
      ).then((s) => {
        setSummary(s);
        onSummarized?.(s);
      });
    }
  }, [root, output, allNestedDone, summary]);

  // Once summarized, show only the summary (never for root)
  // Summary appears at parent's level
  if (!root && summary)
    return (
      <p>
        {parentIndent}└ {name}: <i>{summary}</i>
      </p>
    );

  return (
    <div>
      <p>
        {root ? "" : `${parentIndent}└ `}
        <b>{name}</b>({inputStr})
      </p>

      {/* Reasoning (agents only) */}
      {isReasoning && (
        <p>
          {indent}└ {reasoning} 💭
        </p>
      )}
      {!isReasoning && reasoningDurationSec !== undefined && (
        <p>
          {indent}└ 💭 ({reasoningDurationSec}s)
        </p>
      )}

      {/* Steps (logs and nested calls in order) */}
      {steps.map((step) =>
        step.type === "log" ? (
          <p key={step.message}>
            {indent}└ {step.message}
          </p>
        ) : (
          <Tool
            key={step.data.name}
            depth={depth + 1}
            data={step.data}
            onSummarized={() => setNestedDone((prev) => new Set(prev).add(step.data.name))}
          />
        ),
      )}

      {/* Output */}
      {output &&
        (root ? (
          <p>
            <br />
            {output}
          </p>
        ) : (
          <>
            {indent}└→ {output}
          </>
        ))}
    </div>
  );
}
