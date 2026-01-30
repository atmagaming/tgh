import { Line } from "./Line";

interface ToolHeaderProps {
  name: string;
  input: string;
  prefix: string;
  root?: boolean;
}

export function ToolHeader({ name, input, prefix, root }: ToolHeaderProps) {
  return (
    <Line>
      {root ? "" : prefix}
      <b>{name}</b>({input})
    </Line>
  );
}
