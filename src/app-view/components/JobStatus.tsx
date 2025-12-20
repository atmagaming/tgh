import { useJob } from "app-view/providers/JobProvider";
import { Dots } from "./Dots";

export function JobStatus() {
  const job = useJob();
  const link = `https://platform.openai.com/logs/trace?trace_id=trace_${job.id}`;
  const status = job.done ? (
    "Done"
  ) : (
    <>
      Running
      <Dots />
    </>
  );

  return (
    <p>
      <a href={link}>{status}</a>
    </p>
  );
}
