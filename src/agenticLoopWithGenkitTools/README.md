# Agentic Loop with Genkit Tools

Minimal implementation of a Plan/Act/Critic loop.

## Steps

1. Plan: look at user goal + past critic observations and produce one instruction for Act.
2. Act: execute that instruction, optionally using Genkit native tools.
3. Critic: evaluate whether the goal is fulfilled.
4. If not fulfilled, store critic observations and run the next iteration.
5. Stop on success or when max iterations is reached.

The planner only receives tool names and descriptions (no input schemas) to keep prompt context small.

## Files

- `tools.ts`: Genkit native tools (`ai.defineTool`).
- `prompts.ts`: Plan, Act and Critic prompts.
- `types.ts`: critic schema and loop state types.
- `loop.ts`: loop orchestration.
- `main.ts`: CLI runner.

## Run

```bash
npm run agentic-loop-genkit-tools -- "Tell me today's UTC date and explain briefly how you got it"
```

Optional env vars:

- `AWS_REGION` (default: `eu-north-1`)
- `AGENTIC_MODEL` (`amazon.nova-lite`, `amazon.nova-pro`, `anthropic.claude-3.7-sonnet`)
- `AGENTIC_MAX_ITERATIONS` (default: `6`)
