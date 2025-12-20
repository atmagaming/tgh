import { useState, useEffect } from "react";

export function Dots() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => (c + 1) % 3);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span>{".".repeat(count + 1)}</span>;
}
