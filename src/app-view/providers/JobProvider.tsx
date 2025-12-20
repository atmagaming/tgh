import { delay } from "@elumixor/frontils";
import { useFinishRender } from "io/output";
import type { Job } from "jobs/job";
import { logger } from "logger";
import { createContext, type ReactNode, useContext, useState } from "react";

export interface JobContextValue {
  readonly messageText: string;
  readonly messageId: number;
  readonly chatId: number;
  traceId: string | null;
  link: string | null;
  done: boolean;
  setTraceId: (id: string | null) => void;
}

const JobContext = createContext<JobContextValue | null>(null);

export function JobProvider({ job, children }: { job: Job; children: ReactNode }) {
  const [done, setDone] = useState(false);
  const [traceId, setTraceId] = useState<string | null>(null);
  const finishRender = useFinishRender();

  const value: JobContextValue = {
    messageText: job.userMessage,
    messageId: job.messageId,
    chatId: job.chatId,
    traceId,
    link: traceId ? `https://platform.openai.com/logs/trace?trace_id=${traceId}` : null,
    setTraceId,
    get done() {
      return done;
    },
    set done(value) {
      if (value && done) {
        logger.warn("Job already completed, ignoring duplicate completion");
        return;
      }

      setDone(value);

      if (value)
        // Delay finishing so that the UI can react to done state first
        void delay(0).then(finishRender);
    },
  };

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
}

export function useJob(): JobContextValue {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error("useJob must be used within a JobProvider");
  return ctx;
}
