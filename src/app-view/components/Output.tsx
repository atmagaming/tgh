import { Line } from "./Line";

interface OutputProps {
  output: string;
  prefix: string;
  root?: boolean;
}

const TRUNCATE_LENGTH = 15;

export function Output({ output, prefix, root }: OutputProps) {
  // Truncate non-root tool output until summarized
  const displayOutput = root
    ? output
    : output.length > TRUNCATE_LENGTH
      ? `${output.slice(0, TRUNCATE_LENGTH)}...`
      : output;

  return (
    <>
      {root && <br />}
      <Line>
        {prefix}
        {displayOutput}
      </Line>
    </>
  );
}
