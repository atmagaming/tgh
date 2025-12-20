import { useJob } from "app-view/providers/JobProvider";
import { Dots } from "./Dots";

export function JobStatus() {
  const job = useJob();
  return (
    <p>
      <a href={job.link}>
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
