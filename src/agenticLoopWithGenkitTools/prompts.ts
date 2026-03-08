import { AgentLoopState } from "./types";
import { getAvailableToolsText } from "./tools";

export const PLAN_SYSTEM_PROMPT = `
    You are the Planner agent in an agentic loop.
    Your role is to decide what the next action of the Act agent should be.

    Rules:
    - Use the user goal and past critic observations.
    - Look at the tools that are available and if any is clearly useful to fulfill the user goal, specify that in the instructions.
    - Do not invent tools that do not exist.
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
    - Make sure that the previous act has not hallucinated: check the history of the agentic loop to make sure there is no unwanted alteration of the goal, context, or data.
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

export function buildActPrompt(state: AgentLoopState, instruction: string): string {
    return `
        GOAL: ${state.goal}

        PLANNER_INSTRUCTION: ${instruction}
    `;
}

export function buildCriticPrompt(state: AgentLoopState, actOutput: string): string {
    return `
        GOAL: ${state.goal}

        HISTORY: ${state.history.map((h) => `Iteration ${h.iteration}: plan="${h.planInstruction}", actOutput="${h.actOutput}", criticObservations="${h.criticObservations || ""}"`).join("\n") || "<none>"}

        ACT_OUTPUT: ${actOutput}

        Check if the act output satisfies the user goal. If not, give concrete observations to guide the next attempt.
    `
}
