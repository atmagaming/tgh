import type { JobMetadata, JobStore, StoredBlock, StoredJob } from "services/job-store";
import type { Output } from "./output";
import type { BlockContent, BlockHandle, BlockState, FileData, MessageContent, MessageHandle } from "./types";

type WebSocketNotifier = (jobId: string, event: { type: string; blockId?: string; block?: StoredBlock }) => void;

function blockContentToStoredBlock(content: BlockContent, id: string): StoredBlock {
  const now = new Date().toISOString();
  const base = {
    id,
    state: "in_progress" as BlockState,
    startedAt: now,
    children: [],
  };

  switch (content.type) {
    case "agent":
      return { ...base, type: "agent", name: content.name, task: content.task, summary: content.summary };
    case "tool":
      return {
        ...base,
        type: "tool",
        name: content.name,
        input: content.input,
        output: content.result,
        error: content.error,
        summary: content.summary,
      };
    case "text":
      return { ...base, type: "text", name: "text" };
    case "file":
      return { ...base, type: "file", name: content.data.filename ?? "file" };
    case "error":
      return { ...base, type: "error", name: "error", error: content.message };
  }
}

function updateStoredBlockFromContent(stored: StoredBlock, content: BlockContent): void {
  switch (content.type) {
    case "agent":
      stored.task = content.task;
      stored.summary = content.summary;
      if ("result" in content) stored.output = content.result;
      break;
    case "tool":
      stored.input = content.input;
      stored.output = content.result;
      stored.error = content.error;
      stored.summary = content.summary;
      break;
    case "error":
      stored.error = content.message;
      break;
  }
}

class JobStoreBlockHandle implements BlockHandle {
  private _state: BlockState = "in_progress";
  private _content: BlockContent;

  constructor(
    private readonly storedBlock: StoredBlock,
    private readonly job: StoredJob,
    private readonly store: JobStore,
    private readonly notifier?: WebSocketNotifier,
  ) {
    this._content = { type: "text", text: "" };
  }

  get state(): BlockState {
    return this._state;
  }

  set state(value: BlockState) {
    this._state = value;
    this.storedBlock.state = value;

    if (value === "completed" || value === "error") {
      this.storedBlock.completedAt = new Date().toISOString();
      this.storedBlock.duration =
        new Date(this.storedBlock.completedAt).getTime() - new Date(this.storedBlock.startedAt).getTime();
    }

    this.save();
  }

  get content(): BlockContent {
    return this._content;
  }

  set content(value: BlockContent) {
    this._content = value;
    updateStoredBlockFromContent(this.storedBlock, value);
    this.save();
  }

  addChild(content: BlockContent): BlockHandle {
    const id = Math.random().toString(36).substring(2, 9);
    const childBlock = blockContentToStoredBlock(content, id);
    this.storedBlock.children.push(childBlock);
    this.save();
    return new JobStoreBlockHandle(childBlock, this.job, this.store, this.notifier);
  }

  private save(): void {
    this.store.updateJob(this.job);
    this.notifier?.(this.job.id, { type: "block_update", blockId: this.storedBlock.id, block: this.storedBlock });
  }
}

class JobStoreMessageHandle implements MessageHandle {
  constructor(
    private readonly job: StoredJob,
    private readonly store: JobStore,
    private readonly notifier?: WebSocketNotifier,
  ) {}

  append(_text: string): void {
    // Text appends are not stored in job store (handled by Telegram/Console output)
  }

  addPhoto(_file: FileData): void {
    // Photos are not stored in job store
  }

  addFile(_file: FileData): void {
    // Files are not stored in job store
  }

  replaceWith(_text: string): void {
    // Text replacements are not stored in job store
  }

  clear(): void {
    // Clear is not applicable to job store
  }

  createBlock(content: BlockContent): BlockHandle {
    const id = Math.random().toString(36).substring(2, 9);
    const storedBlock = blockContentToStoredBlock(content, id);
    this.job.blocks.push(storedBlock);
    this.store.updateJob(this.job);
    this.notifier?.(this.job.id, { type: "block_update", blockId: id, block: storedBlock });
    return new JobStoreBlockHandle(storedBlock, this.job, this.store, this.notifier);
  }
}

export class JobStoreOutput implements Output {
  private job: StoredJob;

  constructor(
    private readonly store: JobStore,
    jobId: string,
    task: string,
    metadata: JobMetadata = {},
    private readonly notifier?: WebSocketNotifier,
  ) {
    this.job = store.createJob(jobId, task, metadata);
  }

  get jobId(): string {
    return this.job.id;
  }

  sendMessage(_content: MessageContent): MessageHandle {
    return new JobStoreMessageHandle(this.job, this.store, this.notifier);
  }

  complete(status: "completed" | "error" = "completed"): void {
    this.store.completeJob(this.job.id, status);
    this.notifier?.(this.job.id, { type: "job_complete", blockId: undefined, block: undefined });
  }
}
