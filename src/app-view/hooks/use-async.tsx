import { useEffect, useState } from "react";

export function useAsync<T>(promise: Promise<T>) {
  const [result, setResult] = useState<T | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const res = await promise;
      if (cancelled) return;
      setResult(res);
    })();

    return () => {
      cancelled = true;
    };
  }, [promise]);

  return result;
}
