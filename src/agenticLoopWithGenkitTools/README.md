# Agentic Loop with Genkit Tools

Minimal implementation of an Act/Critic loop.

## Steps

1. Act: try to solve the user goal, optionally using Genkit native tools.
2. Critic: evaluate whether the goal is fulfilled.
3. If not fulfilled, store critic observations and run the next iteration.
4. Stop on success or when max iterations is reached.

No planner, no extra orchestration layers.

## Files

- `tools.ts`: Genkit native tools (`ai.defineTool`).
- `prompts.ts`: Act and Critic prompts.
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
