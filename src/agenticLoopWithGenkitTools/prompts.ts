import { Genkit } from "genkit";
import { AgentLoopState, CriticDecision, CriticDecisionSchema, PlanActDecision, PlanActDecisionSchema, ToolExecution } from "./types";
import { createNativeTools, describeAvailableTools } from "./tools";

export async function planAndActWithNativeTools(
    ai: Genkit,
    state: AgentLoopState,
    onToolExecution: (execution: ToolExecution) => void
): Promise<PlanActDecision> {

    const response = await ai.generate({
        system: `
            You are a planning-and-acting component in an agentic loop.
            Choose exactly one action among: tool, finish, clarify.

            If external information is needed and available through tools, call exactly one native tool from the provided tools list.
            If enough information is available, choose action='finish' and provide draftAnswer.
            If critical information is missing and no available tool can provide it, choose action='clarify' and provide clarifyQuestion.

            When action='tool', do not provide draftAnswer or clarifyQuestion.
            Never invent tool outputs.
        `,
        prompt: `
            GOAL: ${state.goal}

            ATTEMPT: ${state.attempts + 1}/${state.maxAttempts}

            PLAN_SO_FAR: ${state.plan.join(" | ") || "<none>"}

            OBSERVATIONS: ${state.observations.join(" | ") || "<none>"}

            Return a single structured decision.
        `,
        tools: createNativeTools(ai, onToolExecution),
        output: { schema: PlanActDecisionSchema },
    });

    if (!response.output) {
        throw new Error("Plan+act step returned no structured output.");
    }

    return response.output;
}

export async function criticDecision(ai: Genkit, state: AgentLoopState, lastStepSummary: string): Promise<CriticDecision> {

    const response = await ai.generate({
        system: `
            You are a strict reviewer in an agentic loop.
            Decide if the goal has been achieved.
            If done=true, provide a concise and actionable finalAnswer.
            If the latest step contains an ERROR, set done=false and explain what missing input or corrective action is needed.
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
