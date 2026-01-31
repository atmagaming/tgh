import type { AgentCallData } from "@agents";
import { masterAgent } from "@agents/master-agent/master-agent";
import { JobStatus } from "@components/JobStatus";
import { Tool } from "@components/Tool";
import { random } from "@elumixor/frontils";
import { useEffectAsync, usePromise } from "@hooks";
import { useJob } from "@providers/JobProvider";
import { LinkPreviewProvider } from "@providers/LinkPreviewProvider";
import { Message } from "io/output";
import { useMemo } from "react";

export function Main() {
  const job = useJob();
  const [summarized, onSummarized] = usePromise<string>();

  const agentData = useMemo<AgentCallData>(
    () => ({
      type: "agent",
      id: random.string(8),
      name: masterAgent.name,
      input: job.userMessage,
      reasoning: masterAgent.reasoning,
      output: masterAgent.output,
      log: masterAgent.log,
      call: masterAgent.call,
    }),
    [],
  );

  useEffectAsync(async () => {
    await masterAgent.run(job.userMessage, {
      chatId: job.chatId,
      messageId: job.messageId,
      userMessage: job.userMessage,
    });
    await summarized;
    job.done = true;
  }, []);

  return (
    <LinkPreviewProvider>
      <Message repliesTo={job.messageId}>
        <Tool data={agentData} root onSummarized={onSummarized} />
        <br />
        <JobStatus />
      </Message>
    </LinkPreviewProvider>
  );
}
