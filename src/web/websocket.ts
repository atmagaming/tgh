import type { ServerWebSocket } from "bun";
import type { StoredBlock } from "services/job-store";

interface WebSocketData {
  jobId: string;
}

// Map of jobId -> set of connected websockets
const subscribers = new Map<string, Set<ServerWebSocket<WebSocketData>>>();

export function subscribeToJob(ws: ServerWebSocket<WebSocketData>, jobId: string): void {
  let subs = subscribers.get(jobId);
  if (!subs) {
    subs = new Set();
    subscribers.set(jobId, subs);
  }
  subs.add(ws);
}

export function unsubscribeFromJob(ws: ServerWebSocket<WebSocketData>): void {
  const jobId = ws.data?.jobId;
  if (!jobId) return;

  const subs = subscribers.get(jobId);
  if (subs) {
    subs.delete(ws);
    if (subs.size === 0) subscribers.delete(jobId);
  }
}

export function notifyJobSubscribers(
  jobId: string,
  event: { type: string; blockId?: string; block?: StoredBlock },
): void {
  const subs = subscribers.get(jobId);
  if (!subs) return;

  const message = JSON.stringify(event);
  for (const ws of subs) {
    try {
      ws.send(message);
    } catch {
      // Remove failed connections
      subs.delete(ws);
    }
  }

  // Clean up if job is complete
  if (event.type === "job_complete") subscribers.delete(jobId);
}

export function parseWsJobId(pathname: string): string | null {
  const match = pathname.match(/^\/ws\/jobs\/([^/]+)$/);
  return match?.[1] ?? null;
}

export const websocketHandler = {
  open(ws: ServerWebSocket<WebSocketData>) {
    const jobId = ws.data?.jobId;
    if (jobId) subscribeToJob(ws, jobId);
  },
  message(_ws: ServerWebSocket<WebSocketData>, _message: string | Buffer) {
    // No client messages expected
  },
  close(ws: ServerWebSocket<WebSocketData>) {
    unsubscribeFromJob(ws);
  },
};
