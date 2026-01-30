import { Line } from "./Line";

interface OutputProps {
  output: string;
  prefix: string;
  root?: boolean;
}

export function Output({ output, prefix, root }: OutputProps) {
  return (
    <>
      {root && <br />}
      <Line>
        {prefix}
        {output}
      </Line>
    </>
  );
}
