import { useRef } from "react";

export type UsePromiseResult<T = void> = [Promise<T>, (value: T) => void, (reason?: unknown) => void];

export function usePromise<T = void>(): UsePromiseResult<T> {
  const ref = useRef<UsePromiseResult<T>>(undefined);
  if (!ref.current) {
    const { promise, resolve, reject } = Promise.withResolvers<T>();
    ref.current = [promise, resolve, reject];
  }
  return ref.current;
}
