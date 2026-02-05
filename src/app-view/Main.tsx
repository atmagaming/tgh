import type { AgentCallData } from "@agents";
import { masterAgent } from "@agents/master-agent";
import { JobStatus, Tool } from "@components";
import { random } from "@elumixor/frontils";
import { useEffectAsync, usePromise } from "@hooks";
import { useJob } from "@providers/JobProvider";
import { LinkPreviewProvider } from "@providers/LinkPreviewProvider";
import { Message } from "io/output";
import { useMemo, useState } from "react";
import { gramjsClient } from "services/telegram";

export function Main() {
  const job = useJob();
  const [summarized, onSummarized] = usePromise<string>();
  const [input, setInput] = useState<string>("...");

  const agentData = useMemo<AgentCallData>(
    () => ({
      type: "agent",
      id: random.string(8),
      name: masterAgent.name,
      input,
      reasoning: masterAgent.reasoning,
      output: masterAgent.output,
      log: masterAgent.log,
      call: masterAgent.call,
    }),
    [input],
  );

  useEffectAsync(async () => {
    // Get chat messages from the current chat
    const messages = await gramjsClient.getMessages({
      chatId: job.chatId,
      limit: 10,
      order: "oldest first",
    });

    const content = messages.map((msg) => msg.toXml()).join("\n");
    setInput(content);

    await masterAgent.run(content, job);
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
