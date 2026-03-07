import { Genkit } from "genkit";
import { AgentAction, buildAgentActionSchema, AgentLoopState, CriticDecision, CriticDecisionSchema } from "./types";
import { describeAvailableTools, getToolNames } from "./tools";

export async function planNextAction(ai: Genkit, state: AgentLoopState): Promise<AgentAction> {

    const AgentActionSchema = buildAgentActionSchema(getToolNames());

    const response = await ai.generate({
        system: `
            You are a planning component in an agentic loop.
            Choose exactly one next action.
            Use only tools listed in AVAILABLE_TOOLS.
            If enough information is available, choose action='finish'.
            If the goal requires information that no available tool can supply and the user has not provided it,
            choose action='clarify' and set clarifyQuestion to a concise question that will get the missing information.
            Do NOT call unrelated tools when critical information is missing — ask the user instead.
        `,
        prompt: `
            GOAL: ${state.goal}

            ATTEMPT: ${state.attempts + 1}/${state.maxAttempts}

            PLAN_SO_FAR: ${state.plan.join(" | ") || "<none>"}

            OBSERVATIONS: ${state.observations.join(" | ") || "<none>"}

            AVAILABLE_TOOLS:
            ${describeAvailableTools()}

            Return a single structured decision.
        `,
        output: { schema: AgentActionSchema },
    });

    if (!response.output) {
        throw new Error("Planner returned no structured output.");
    }

    return response.output;
}

export async function criticDecision(ai: Genkit, state: AgentLoopState, lastStepSummary: string): Promise<CriticDecision> {
    
    const response = await ai.generate({
        system: `
            You are a strict reviewer in an agentic loop.
            Decide if the goal has been achieved.
            If done=true, provide a concise and actionable finalAnswer.
        `,
        prompt: `
            GOAL: ${state.goal}

            LAST_STEP: ${lastStepSummary}

            OBSERVATIONS: ${state.observations.join(" | ") || "<none>"}
        `,
        output: { schema: CriticDecisionSchema },
    });

    if (!response.output) {
        throw new Error("Critic returned no structured output.");
    }

    return response.output;
}
