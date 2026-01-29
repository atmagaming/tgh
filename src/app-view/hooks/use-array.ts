import { useMemo, useState } from "react";

export interface UseArrayResult<T> extends Iterable<T> {
  readonly items: readonly T[];
  readonly length: number;
  push(...items: T[]): void;
  pop(): T | undefined;
  shift(): T | undefined;
  unshift(...items: T[]): void;
  remove(index: number): void;
  removeItem(item: T): void;
  clear(): void;
  set(items: T[]): void;
  map<U>(fn: (item: T, index: number) => U): U[];
  filter<S extends T>(fn: (item: T, index: number) => item is S): S[];
  filter(fn: (item: T, index: number) => boolean): T[];
  find<S extends T>(fn: (item: T, index: number) => item is S): S | undefined;
  find(fn: (item: T, index: number) => boolean): T | undefined;
}

export function useArray<T>(initial: T[] = []): UseArrayResult<T> {
  const [items, setItems] = useState<T[]>(initial);

  return useMemo(
    () => ({
      get items() {
        return items;
      },
      get length() {
        return items.length;
      },
      push: (...newItems: T[]) => setItems((prev) => [...prev, ...newItems]),
      pop: () => {
        let popped: T | undefined;
        setItems((prev) => {
          popped = prev[prev.length - 1];
          return prev.slice(0, -1);
        });
        return popped;
      },
      shift: () => {
        let shifted: T | undefined;
        setItems((prev) => {
          shifted = prev[0];
          return prev.slice(1);
        });
        return shifted;
      },
      unshift: (...newItems: T[]) => setItems((prev) => [...newItems, ...prev]),
      remove: (index: number) => setItems((prev) => prev.filter((_, i) => i !== index)),
      removeItem: (item: T) => setItems((prev) => prev.filter((i) => i !== item)),
      clear: () => setItems([]),
      set: (newItems: T[]) => setItems(newItems),
      map: <U>(fn: (item: T, index: number) => U) => items.map(fn),
      filter: (fn: (item: T, index: number) => boolean) => items.filter(fn),
      find: (fn: (item: T, index: number) => boolean) => items.find(fn),
      [Symbol.iterator]: () => items[Symbol.iterator](),
    }),
    [items],
  );
}
