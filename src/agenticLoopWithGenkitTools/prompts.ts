import { AgentLoopState } from "./types";
import { AVAILABLE_TOOLS_TEXT } from "./tools";

export const PLAN_SYSTEM_PROMPT = `
You are the Planner agent in an agentic loop.
Your role is to decide the next instruction for the Act agent.

Rules:
- Use the user goal and past critic observations.
- You only know tool names and descriptions.
- Keep the instruction short, concrete, and executable.
- The instruction should be enough for Act to answer the goal.
`;

export const ACT_SYSTEM_PROMPT = `
You are the Act agent in an agentic loop.
Follow the planner instruction.
Use available tools only when needed.

Rules:
- Keep the answer concise and directly useful.
- Do not invent tools or tool outputs.
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

export function buildPlanPrompt(state: AgentLoopState): string {
    return [
        `GOAL: ${state.goal}`,
        `CONTEXT: ${state.context.join(" | ") || "<none>"}`,
        `AVAILABLE_TOOLS:\n${AVAILABLE_TOOLS_TEXT}`,
        `CRITIC_OBSERVATIONS: ${state.observations.join(" | ") || "<none>"}`,
    ].join("\n\n");
}

export function buildActPrompt(instruction: string): string {
    return `PLANNER_INSTRUCTION: ${instruction}`;
}

export function buildCriticPrompt(goal: string, actOutput: string): string {
    return [
        `GOAL: ${goal}`,
        `ACT_OUTPUT: ${actOutput}`,
    ].join("\n\n");
}
