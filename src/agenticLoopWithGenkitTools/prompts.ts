import { AgentLoopState } from "./types";
import { AVAILABLE_TOOLS_TEXT } from "./tools";

export const ACT_SYSTEM_PROMPT = `
You are the Act agent in an agentic loop.
Try to fulfill the user goal directly.
Use available tools only when needed.

Rules:
- Keep the answer concise and directly useful.
- Do not invent tools or tool outputs.
- If previous critic observations exist, apply them.
- Return only the user-facing answer for this attempt.
`;

export const CRITIC_SYSTEM_PROMPT = `
You are the Critic agent in an agentic loop.
Check if the latest act output fully satisfies the user goal.

Rules:
- If fulfilled=true, provide finalAnswer.
- If fulfilled=false, provide concrete observations to guide the next act attempt.
- Be strict but practical.
`;

export function buildActPrompt(state: AgentLoopState): string {
    return [
        `GOAL: ${state.goal}`,
        `CONTEXT: ${state.context.join(" | ") || "<none>"}`,
        `AVAILABLE_TOOLS:\n${AVAILABLE_TOOLS_TEXT}`,
        `CRITIC_OBSERVATIONS: ${state.observations.join(" | ") || "<none>"}`,
    ].join("\n\n");
}

export function buildCriticPrompt(goal: string, actOutput: string): string {
    return [
        `GOAL: ${goal}`,
        `ACT_OUTPUT: ${actOutput}`,
    ].join("\n\n");
}
