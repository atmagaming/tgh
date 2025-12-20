import { useJob } from "app-view/providers/JobProvider";
import { Dots } from "./Dots";

export function JobStatus() {
  const job = useJob();
  return (
    <p>
      <a href={job.link ?? undefined}>
        {job.done ? (
          "Done"
        ) : (
          <>
            Running
            <Dots />
          </>
        )}
      </a>
    </p>
  );
}
