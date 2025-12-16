import type { JobStore } from "services/job-store";
import { renderJobDetail, renderJobList } from "./templates";

export async function handleJobList(store: JobStore): Promise<Response> {
  const jobs = await store.listAsync();
  const html = renderJobList(jobs);
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

export async function handleJobDetail(store: JobStore, jobId: string): Promise<Response> {
  const job = await store.loadAsync(jobId);
  if (!job) return new Response("Job not found", { status: 404 });

  const html = renderJobDetail(job);
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

export async function handleApiJobList(store: JobStore): Promise<Response> {
  const jobs = await store.listAsync();
  return Response.json(jobs);
}

export async function handleApiJobDetail(store: JobStore, jobId: string): Promise<Response> {
  const job = await store.loadAsync(jobId);
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
  return Response.json(job);
}

export function parseJobIdFromPath(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  // Extract job ID (everything before the next slash or end)
  const match = rest.match(/^([^/]+)/);
  return match?.[1] ?? null;
}
