import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { Block, BlockState } from "../types";

// Convert snake_case to CamelCase
function toCamelCase(name: string): string {
  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

// Format name: "drive_agent" -> "Drive", "search_drive_files" -> "SearchDriveFiles"
function formatName(name: string, type: "agent" | "tool"): string {
  const camelName = toCamelCase(name);
  if (type === "agent") return camelName.replace(/Agent$/i, "");
  return camelName;
}

const stateColors: Record<BlockState, string> = {
  in_progress: "cyan",
  completed: "green",
  error: "red",
};

// Get status indicator based on state
function getStatusIndicator(state: BlockState): string {
  if (state === "completed") return "✓";
  if (state === "error") return "✖";
  return "...";
}

// Compute effective state: parent is in_progress if any child is in_progress
function getEffectiveState(block: Block): BlockState {
  if (block.state === "error") return "error";
  const hasInProgressChild = block.children.some((c) => getEffectiveState(c) === "in_progress");
  if (hasInProgressChild) return "in_progress";
  return block.state;
}

interface BlockViewProps {
  block: Block;
  depth?: number;
  verbose: boolean;
}

function AgentBlockView({ block, depth, verbose }: { block: Block; depth: number; verbose: boolean }) {
  const content = block.content;
  if (content.type !== "agent") return null;

  const indent = "  ".repeat(depth);
  const effectiveState = getEffectiveState(block);
  const name = formatName(content.name, "agent");
  // Show summary first (cleaned), then fall back to task
  const summary = content.summary ?? content.task;
  const status = getStatusIndicator(effectiveState);
  const color = stateColors[effectiveState];

  // Format: Name: summary [status]
  return (
    <Box flexDirection="column">
      <Box>
        <Text>{indent}</Text>
        <Text color={color}>{name}</Text>
        {summary && <Text>: {summary}</Text>}
        <Text> </Text>
        {effectiveState === "in_progress" ? <Spinner type="dots" /> : <Text color={color}>{status}</Text>}
      </Box>
      {/* Children (tools) */}
      {block.children.map((child) => (
        <BlockView key={child.id} block={child} depth={depth + 1} verbose={verbose} />
      ))}
    </Box>
  );
}

function ToolBlockView({ block, depth, verbose }: { block: Block; depth: number; verbose: boolean }) {
  const content = block.content;
  if (content.type !== "tool") return null;

  const indent = "  ".repeat(depth);
  const effectiveState = getEffectiveState(block);
  const name = formatName(content.name, "tool");
  const status = getStatusIndicator(effectiveState);
  const color = stateColors[effectiveState];

  // Show only summary - no raw JSON
  const summary = content.error ?? content.summary;

  // Format: └ Name: summary [status]
  return (
    <Box flexDirection="column">
      <Box>
        <Text>{indent}└ </Text>
        <Text color={color} bold>
          {name}
        </Text>
        {summary && <Text>: {summary}</Text>}
        <Text> </Text>
        {effectiveState === "in_progress" ? <Spinner type="dots" /> : <Text color={color}>{status}</Text>}
      </Box>
      {/* Children */}
      {block.children.map((child) => (
        <BlockView key={child.id} block={child} depth={depth + 1} verbose={verbose} />
      ))}
    </Box>
  );
}

export function BlockView({ block, depth = 0, verbose }: BlockViewProps) {
  // Skip MasterAgent blocks - render only their children
  if (block.content.type === "agent" && block.content.name.toLowerCase().includes("master")) {
    return (
      <>
        {block.children.map((child) => (
          <BlockView key={child.id} block={child} depth={depth} verbose={verbose} />
        ))}
      </>
    );
  }

  const content = block.content;

  if (content.type === "agent") {
    return <AgentBlockView block={block} depth={depth} verbose={verbose} />;
  }

  if (content.type === "tool") {
    return <ToolBlockView block={block} depth={depth} verbose={verbose} />;
  }

  // Fallback for other block types (text, file, error)
  const indent = "  ".repeat(depth);
  const effectiveState = getEffectiveState(block);
  const color = stateColors[effectiveState];

  let text = "";
  if (content.type === "text") text = content.text;
  else if (content.type === "file") text = content.data.filename ?? "file";
  else if (content.type === "error") text = content.message;

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={color}>
          {indent}
          {text}
        </Text>
      </Box>
      {block.children.map((child) => (
        <BlockView key={child.id} block={child} depth={depth + 1} verbose={verbose} />
      ))}
    </Box>
  );
}

interface MessageViewProps {
  blocks: Block[];
  verbose: boolean;
}

export function MessageView({ blocks, verbose }: MessageViewProps) {
  return (
    <Box flexDirection="column" paddingY={1}>
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} verbose={verbose} />
      ))}
    </Box>
  );
}
