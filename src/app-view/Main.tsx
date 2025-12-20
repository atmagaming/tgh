import { Dots } from "@components/Dots";
import { JobStatus } from "@components/JobStatus";
import { run, withTrace } from "@openai/agents";
import { useJob } from "@providers/JobProvider";
import { masterAgent } from "agents/master-agent/master-agent";
import { Message } from "io/output";
import { parse } from "partial-json";
import { useEffect, useState } from "react";

export function Main() {
  const job = useJob();
  const [result, setResult] = useState<string | null>(null);

  // Run the agent when the component mounts
  useEffect(() => {
    let cancelled = false;

    setResult(null);

    void (async () => {
      try {
        await withTrace(
          await job.summarizedName,
          async () => {
            const stream = await run(masterAgent, job.userMessage, {
              stream: true,
            });

            let current = "";

            for await (const chunk of stream.toTextStream()) {
              current += chunk;
              if (cancelled) return;

              let parsed: string;
              try {
                parsed = parse(current).response;
              } catch {
                parsed = "";
              }

              setResult(parsed);
            }

            await stream.completed;

            if (cancelled) return;
            job.done = true;
          },
          { traceId: `trace_${job.id}` },
        );
      } catch (error) {
        if (cancelled) return;
        setResult(String(error));
        job.done = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [job.userMessage]);

  return (
    <Message repliesTo={job.messageId}>
      {result ? <p>{result}</p> : null}
      <br />
      {!job.done ? <Progress toolName={masterAgent.name} /> : null}
      <br />
      <JobStatus />
    </Message>
  );
}

function Progress({ toolName }: { toolName: string }) {
  return (
    <p>
      <u>{toolName}</u>:{" "}
      <i>
        thinking
        <Dots />
      </i>
    </p>
  );
}
