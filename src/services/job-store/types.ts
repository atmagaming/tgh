export type JobStatus = "running" | "completed" | "error";
export type BlockState = "in_progress" | "completed" | "error";

export interface StoredJob {
  id: string;
  chatId?: number;
  messageId?: number;
  userId?: number;
  username?: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  status: JobStatus;
  task: string;
  blocks: StoredBlock[];
}

export interface StoredBlock {
  id: string;
  type: "agent" | "tool" | "text" | "file" | "error";
  name: string;
  state: BlockState;
  task?: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  thinking?: string;
  summary?: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  children: StoredBlock[];
}

export interface JobMetadata {
  chatId?: number;
  messageId?: number;
  userId?: number;
  username?: string;
}
