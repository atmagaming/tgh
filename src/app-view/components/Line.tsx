import type { ReactNode } from "react";

export function Line({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <br />
    </>
  );
}
