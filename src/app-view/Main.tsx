import { Dots } from "@components/Dots";
import { JobStatus } from "@components/JobStatus";
import { run } from "@openai/agents";
import { useJob } from "@providers/JobProvider";
import { masterAgent } from "agents/master-agent/master-agent";
import { Message } from "io/output";
import { useEffect, useState } from "react";
import { parse, Allow } from "partial-json";

export function Main() {
  const job = useJob();
  const [result, setResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<string | null>(null);

  // Run the agent when the component mounts
  useEffect(() => {
    let cancelled = false;

    setResult(null);

    void (async () => {
      try {
        const stream = await run(masterAgent, job.messageText, {
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

        if (cancelled) return;
        setResult(stream.finalOutput.response);
        job.done = true;
      } catch (error) {
        if (cancelled) return;
        setResult(String(error));
        job.done = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [job.id, job.messageText]);

  return (
    <Message repliesTo={job.messageId}>
      {result ? <p>{result}</p> : null}
      <br />
      {logs && <p>{logs}</p>}
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
