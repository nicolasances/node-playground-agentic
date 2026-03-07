# Agentic Loop with Native Genkit Tools

This folder replicates the `agenticLoop` skeleton, but uses Genkit's native tool-calling in the planner step.

## Loop shape

1. **Plan+Act**: single `ai.generate` call with native Genkit tools.
2. **Observe**: explicit logging and state update of tool execution output.
3. **Critic**: explicit reviewer step deciding whether to continue or finish.

Hard stops:

- `maxAttempts` guard.
- Structured output schema for the merged plan+act decision.

## Files

- `types.ts`: loop state and decision schemas.
- `tools.ts`: native Genkit tool definitions and execution capture.
- `prompts.ts`: merged plan+act + explicit critic prompts.
- `loop.ts`: orchestrator (`runAgenticLoopWithGenkitTools`).
- `main.ts`: runnable CLI entrypoint.

## Run

From repository root:

```bash
npm run agentic-loop-genkit-tools -- "Find current UTC datetime and answer concisely"
```

Optional env vars:

- `AGENTIC_MODEL` (`amazon.nova-lite`, `amazon.nova-pro`, `anthropic.claude-3.7-sonnet`)
- `AWS_REGION` (default: `eu-north-1`)
