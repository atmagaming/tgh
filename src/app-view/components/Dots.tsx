import { useEffect, useState } from "react";

export function Dots() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => (c + 2) % 3);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return <>{".".repeat(count + 1)}</>;
}
