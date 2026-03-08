import { AgentLoopState } from "./types";
import { getAvailableToolsText } from "./tools";

export const PLAN_SYSTEM_PROMPT = `
You are the Planner agent in an agentic loop.
Your role is to decide what the next action of the Act agent should be.

Rules:
- Use the user goal and past critic observations.
- Look at the tools that are available and if any is clearly useful to fulfill the user goal, specify that in the instructions.
- The instruction should clearly explain to the Act agent what it is supposed to do to fulfill the goal.
`;

export const ACT_SYSTEM_PROMPT = `
You are the Act agent in an agentic loop. 
Your role is to fulfill a user's request by following the instructions of the Planner agent.
Follow the planner instructions to fulfill the user goal.
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
    return `
        GOAL: ${state.goal}
        CONTEXT: ${state.context.join(" | ") || "<none>"}
        AVAILABLE_TOOLS:\n${getAvailableToolsText()}
        CRITIC_OBSERVATIONS: ${state.observations.join(" | ") || "<none>"}

        Give instructions to the Act agent on how to fulfill the user goal.
    `
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
