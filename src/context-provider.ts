import { AsyncLocalStorage } from "node:async_hooks";
import type { AppContext } from "./context";

/**
 * AsyncLocalStorage for making AppContext available throughout async execution
 */
const contextStorage = new AsyncLocalStorage<AppContext>();

/**
 * Run a function with the given AppContext available to all nested calls
 */
export function runWithContext<T>(context: AppContext, fn: () => T | Promise<T>): Promise<T> {
  return Promise.resolve(contextStorage.run(context, fn));
}

/**
 * Get the current AppContext (must be called within runWithContext)
 * @throws Error if no context is available
 */
export function getContext(): AppContext {
  const context = contextStorage.getStore();
  if (!context) throw new Error("No context available. Tools must be called within runWithContext().");

  return context;
}

/**
 * Get the current AppContext if available, otherwise return undefined
 */
export function tryGetContext(): AppContext | undefined {
  return contextStorage.getStore();
}
