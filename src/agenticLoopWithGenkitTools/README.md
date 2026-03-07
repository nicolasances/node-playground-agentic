# Agentic Loop with Native Genkit Tools

This folder replicates the `agenticLoop` skeleton, but uses Genkit's native tool-calling in the planner step.

## Loop shape

1. **Plan**: create a structured plan from goal, context and available tools (name + description).
2. **Act**: execute the first non-completed plan item using native Genkit tool-calling.
3. **Critic (item)**: verify whether that plan item is completed; if not, retry item act.
4. **Critic (goal)**: after item loop, verify whether the full user goal is solved.

This produces nested loops:

- outer loop on goal completion,
- inner loop across plan items,
- inner loop per item for act + item-critic retries.

Hard stops:

- `maxAttempts` guard.
- Structured output schema for the merged plan+act decision.

## Files

- `types.ts`: loop state and decision schemas.
- `tools.ts`: native Genkit tool definitions.
- `prompts.ts`: planner, item actor, item critic, and goal critic prompts.
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
