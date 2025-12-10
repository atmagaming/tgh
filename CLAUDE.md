# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # Development with watch mode
bun run cli          # Interactive CLI for testing (no Telegram)
bun test             # Run tests (excludes manual tests)
bun run test:manual  # Run all tests including manual ones
bun run lint         # Check with Biome
bun run format       # Format with Biome
```

## Code Style

- Single-statement blocks: Remove braces, keep on one line (e.g., `if (condition) throw error;`)
- Remove obvious comments explaining what code does (code should be self-explanatory)
- Keep minimal spacing, avoid excessive blank lines
- Compact object returns when simple (e.g., `return { inlineData: { mimeType, data } };`)

## Testing Guidelines

- **Test functionality, not implementation details**. Avoid testing:
  - Agent/tool names, descriptions, or schema structures
  - Model names (e.g., "should use sonnet")
  - Thinking budgets or token limits
  - Required parameter lists or tool existence
- **Focus on actual behavior**: Test if agents/tools complete their job successfully
- **Manual tests are acceptable**: If only manual tests exist for a feature, that's fine
- Keep tests that verify error handling and edge cases

## Agent System Prompts

When creating or updating agent system prompts:

- **Minimal & Focused**: Agents know their tools via definitions - don't repeat capabilities
- **Context Placement**: Include only relevant context per agent:
  - Master Agent: Project overview, sub-agent roster
  - Specialized agents: Domain-specific context only (e.g., Telegram for Context Agent, API specifics for Drive Agent)
- **Decision Rules**: Focus on guidelines, patterns, and when to use which approach
- **No Process Explanation**: State what to do, not how the system works
- **Keep Technical Details**: API specifics, operation sequences, data formats where needed

## Tool Design Principles

1. **Don't duplicate - refactor/update existing tools**
   - Before creating a new tool, check if an existing tool can be extended
   - Add parameters/overloads to existing tools instead of creating variants

2. **Don't couple tools with output (Telegram/console)**
   - Tools return data (file paths, results) - NOT send to Telegram directly
   - Output is handled by the Output system (`src/utils/output/`)
   - For file outputs, return `files: FileOutput[]` in the result
   - The Agent class detects file outputs and sends via Output targets

3. **Use temp files for binary data passing**
   - Save buffers to temp files, pass paths between tools
   - Temp files are cleaned up after Output sends them
   - See `src/utils/temp-files.ts` for utilities

## Adding New Tools

1. Create tool file in the appropriate agent's `tools/` directory
2. Export and add to agent's tool array
3. For file outputs: Return `{ files: [{ path, mimeType, filename?, caption? }] }`
4. Use `context?.progress?.message()` for status updates
5. Tools should be synchronous (wait for completion) unless truly long-running

## General Guidelines

- Never run dev in background - ALWAYS ask user to do so. But firstly, check if the process is already running. That is, do this ONLY if you actually require to run the bot. If you just need to test some functionality - write unit tests and run them.

- For quick functionality testing/debugging, use `bun run cli "your prompt here"` to process a single prompt and see the output. Add more logging to trace execution flow if needed.

- When implementing new feature or doing refactoring, make sure there are no problems/errors left. Use `bun run lint` and `CLAUDECODE=1 bun test` to verify. and fix any issues reported. Use `CLAUDECODE=1` to improve readability and reduce context noise.

- For `render` commands always specify `-o` options to specify a non-interactive output mode.

- ALWAYS use `??` operator instead of `||` when providing default values, unless you specifically want to treat falsy values (like `0` or `""`) as needing a default.

- Never split declaration and initialization if it is simple. DON'T do:

```typescript
class Example {
  private readonly field: Field;

  constructor() {
    this.field = new Field();
  }
}
```

Instead, do:

```typescript
class Example {
  private readonly field = new Field();
}
```

- When working on some feature, it is okay to run manual tests. Don't run all tests unless it's ACTUALLY needed. Run only specific tests related to your changes. Once these tests have succeeded, you may run the final automatic (non-manual) unit tests.
