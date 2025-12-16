import type { StoredBlock, StoredJob } from "services/job-store";

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f5f5f5; color: #333; }
  h1 { margin-bottom: 20px; font-size: 1.5em; }
  a { color: #0066cc; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .container { max-width: 1200px; margin: 0 auto; }
  table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #f8f9fa; font-weight: 600; }
  tr:hover { background: #f8f9fa; }
  .status { padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 500; }
  .status-running { background: #fff3cd; color: #856404; }
  .status-completed { background: #d4edda; color: #155724; }
  .status-error { background: #f8d7da; color: #721c24; }
  .task { max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .job-detail { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .job-header { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
  .job-task { font-size: 1.2em; margin-bottom: 10px; }
  .job-meta { color: #666; font-size: 0.9em; }
  .job-meta span { margin-right: 15px; }
  .blocks { margin-top: 20px; }
  details { margin: 8px 0; }
  summary { cursor: pointer; padding: 8px 12px; background: #f8f9fa; border-radius: 4px; font-weight: 500; }
  summary:hover { background: #e9ecef; }
  .block-content { padding: 12px; margin-left: 20px; border-left: 2px solid #dee2e6; }
  .block-meta { font-size: 0.85em; color: #666; margin-bottom: 8px; }
  pre { background: #2d2d2d; color: #f8f8f2; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 0.85em; margin: 8px 0; }
  .thinking { background: #fff8e1; border-left: 4px solid #ffc107; padding: 12px; margin: 8px 0; border-radius: 0 4px 4px 0; }
  .error-text { color: #dc3545; }
  .duration { color: #6c757d; font-size: 0.85em; }
  .block-type { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 0.75em; margin-right: 8px; }
  .block-type-agent { background: #e3f2fd; color: #1565c0; }
  .block-type-tool { background: #f3e5f5; color: #7b1fa2; }
  .state-icon { margin-right: 6px; }
  .back-link { margin-bottom: 20px; display: inline-block; }
`;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

function getStateIcon(state: string): string {
  if (state === "completed") return "[v]";
  if (state === "error") return "[x]";
  return "[...]";
}

function getStatusClass(status: string): string {
  if (status === "running") return "status-running";
  if (status === "completed") return "status-completed";
  return "status-error";
}

function renderBlock(block: StoredBlock, depth = 0): string {
  const icon = getStateIcon(block.state);
  const typeClass = block.type === "agent" ? "block-type-agent" : "block-type-tool";
  const durationStr = block.duration ? ` (${formatDuration(block.duration)})` : "";

  let content = "";

  // Input/params for tools
  if (block.type === "tool" && block.input) {
    content += `<div><strong>Input:</strong></div><pre>${escapeHtml(JSON.stringify(block.input, null, 2))}</pre>`;
  }

  // Thinking block
  if (block.thinking) {
    content += `<details><summary>Thinking</summary><div class="thinking">${escapeHtml(block.thinking)}</div></details>`;
  }

  // Output/result
  if (block.output) {
    content += `<div><strong>Output:</strong></div><pre>${escapeHtml(JSON.stringify(block.output, null, 2))}</pre>`;
  }

  // Error
  if (block.error) {
    content += `<div class="error-text"><strong>Error:</strong> ${escapeHtml(block.error)}</div>`;
  }

  // Children
  const childrenHtml = block.children.map((child) => renderBlock(child, depth + 1)).join("");

  return `
    <details id="block-${block.id}" ${depth === 0 ? "open" : ""}>
      <summary>
        <span class="state-icon">${icon}</span>
        <span class="block-type ${typeClass}">${block.type}</span>
        <strong>${escapeHtml(block.name)}</strong>
        ${block.task ? `: ${escapeHtml(block.task)}` : ""}
        <span class="duration">${durationStr}</span>
      </summary>
      <div class="block-content">
        <div class="block-meta">
          Started: ${formatDate(block.startedAt)}
          ${block.completedAt ? ` | Completed: ${formatDate(block.completedAt)}` : ""}
        </div>
        ${content}
        ${childrenHtml}
      </div>
    </details>
  `;
}

export function renderJobList(jobs: { id: string; task: string; status: string; startedAt: string }[]): string {
  const rows = jobs
    .map(
      (job) => `
    <tr>
      <td><a href="/jobs/${job.id}">${escapeHtml(job.id)}</a></td>
      <td class="task" title="${escapeHtml(job.task)}">${escapeHtml(job.task.substring(0, 100))}</td>
      <td><span class="status ${getStatusClass(job.status)}">${job.status}</span></td>
      <td>${formatDate(job.startedAt)}</td>
    </tr>
  `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jobs</title>
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    <h1>Job History</h1>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Task</th>
          <th>Status</th>
          <th>Started</th>
        </tr>
      </thead>
      <tbody>
        ${rows || "<tr><td colspan='4'>No jobs found</td></tr>"}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

export function renderJobDetail(job: StoredJob): string {
  const blocksHtml = job.blocks.map((block) => renderBlock(block)).join("");
  const durationStr = job.duration ? formatDuration(job.duration) : "...";

  const wsScript =
    job.status === "running"
      ? `
    <script>
      const ws = new WebSocket(\`ws://\${location.host}/ws/jobs/${job.id}\`);
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'job_complete') {
          location.reload();
        } else if (data.type === 'block_update') {
          // For simplicity, just reload on updates
          // A more sophisticated implementation would update the DOM
          location.reload();
        }
      };
      ws.onerror = () => console.log('WebSocket error');
      ws.onclose = () => console.log('WebSocket closed');
    </script>
  `
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job: ${escapeHtml(job.task.substring(0, 50))}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    <a href="/jobs" class="back-link">&larr; Back to Jobs</a>
    <div class="job-detail">
      <div class="job-header">
        <div class="job-task">${escapeHtml(job.task)}</div>
        <div class="job-meta">
          <span class="status ${getStatusClass(job.status)}">${job.status}</span>
          <span>Started: ${formatDate(job.startedAt)}</span>
          ${job.completedAt ? `<span>Completed: ${formatDate(job.completedAt)}</span>` : ""}
          <span>Duration: ${durationStr}</span>
          ${job.username ? `<span>User: ${escapeHtml(job.username)}</span>` : ""}
        </div>
      </div>
      <div class="blocks">
        <h2>Execution</h2>
        ${blocksHtml || "<p>No blocks yet</p>"}
      </div>
    </div>
  </div>
  ${wsScript}
</body>
</html>`;
}
