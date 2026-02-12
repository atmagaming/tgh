# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent System Prompts

## Agents and Tools

We are using OpenAI Agents SDK to build a modular agent system. Each agent has a specific role and access to a defined set of tools. Tools are the interfaces through which agents interact with external systems (APIs, databases, file systems, etc.).

The file structure is:

- `src/master-agent.ts`: The main orchestrator agent that coordinates sub-agents.
- `src/tools/*`: Contains all tool definitions, organized by domain (e.g., `calendar`, `drive`, `telegram`).
  - There also might be subagents, that have their own set of tools. For example:
    - `src/tools/calendar/calendar-agent.ts`: A specialized agent for handling calendar-related tasks, with its own tools in `src/tools/calendar/tools/**`.
- **Never use `.optional()` for tool parameters** - Use `.nullable()` instead. `defineTool()` enforces this at the type level. Use `?? default` or `?? undefined` when passing nullable values to functions expecting `undefined`
- **Never use `z.record()` for tool parameters** - OpenAI rejects `propertyNames` in JSON Schema. Use `z.array(z.object({ key: z.string(), value: z.string() }))` instead and convert to a record in the execute function
- Tool names should follow `CamelCase` naming
- Keep system prompts, tool descriptions, and parameter descriptions concise. Explain what they mean in minimum words. Use clear, descriptive names.
- Do not use abbreviations

## Render deploy specifics

We deploy on Render, which has some specific requirements:

- For `render` commands always specify `-o` options to specify a non-interactive output mode.
- When you modify `.env` variables, sync then with Render's environment variables settings.

## Code style

- ALWAYS use `??` operator instead of `||` when providing default values, unless you specifically want to treat falsy values (like `0` or `""`) as needing a default.
- Single-statement blocks: Remove braces, keep on one line (e.g., `if (condition) throw error;`)
- Write self-explanatory code, avoid obvious comments - code should clearly express what it does through good naming and structure
- Compact object returns when simple (e.g., `return { inlineData: { mimeType, data } };`)
- Never use `setXXX()`/`getXXX()` methods - use TypeScript getters/setters property accessors instead
- Never add unnecessary `?` optional chaining - if a value is always defined, don't mark it optional
- Don't use `!` - throw a descriptive error instead
- Don't define excessive helper interfaces and types - rely more on typescript inference - write minimal, readable code

```typescript
class Example {
  // assign fields directly in declaration when possible
  private readonly field = new Field();

  // assign fields in constructor when initialization requires parameters or logic
  constructor(private readonly dependency: Dependency) {}
}
```

## Other Development Notes

- Never run `dev` script
- Do not run full `build` to check
- Write short code tests as simple `.ts` files (not `.test.ts`) and run with `bun run my-test-file.ts` to quickly check functionality during development
  - Always do these tests and run them yourself to verify functionality
- Run `bun run lint` to check typescript and biome errors and warnings
- Run `bun run format` to format everything after your changes
