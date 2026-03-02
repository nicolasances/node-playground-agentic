# Agentic Loop Skeleton (Genkit + TypeScript)

This folder contains a minimal, from-scratch skeleton of an agentic loop implemented with Genkit.

## Loop shape

The implementation follows:

1. **Plan**: ask the planner for the next action.
2. **Act**: execute one tool.
3. **Reflect**: store the observation and step trace.
4. **Decide**: ask a critic whether to continue or finish.

Hard stops:

- `maxAttempts` guard.
- Tool input validation with typed schemas.

## Files

- `types.ts`: state/action/critic schemas and interfaces.
- `tools.ts`: starter tools (`echo`, `getCurrentDate`) and execution helper.
- `prompts.ts`: planner + critic structured outputs using Genkit.
- `loop.ts`: orchestrator (`runAgenticLoop`) for the iterative loop.
- `main.ts`: runnable CLI entrypoint.

## Run

From repository root:

```bash
npm run agentic-loop -- "Find current UTC datetime and answer concisely"
```

Optional env vars:

- `AGENTIC_MODEL` (`amazon.nova-lite`, `amazon.nova-pro`, `anthropic.claude-3.7-sonnet`)
- `AWS_REGION` (default: `eu-north-1`)

## Next extensions

- Replace local tools with MCP/HTTP/database tools.
- Persist state in Redis/Mongo for resumable loops.
- Add loop policies (budget/time/no-progress guards).
- Add evaluation metrics for planner and tool success.