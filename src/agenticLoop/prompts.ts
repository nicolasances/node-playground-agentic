import { Genkit } from "genkit";
import { AgentAction, buildAgentActionSchema, AgentLoopState, CriticDecision, CriticDecisionSchema } from "./types";
import { describeAvailableTools, getToolInputSchemas, getToolNames } from "./tools";

export async function planNextAction(ai: Genkit, state: AgentLoopState): Promise<AgentAction> {

    const AgentActionSchema = buildAgentActionSchema(getToolNames(), getToolInputSchemas());

    const response = await ai.generate({
        system: `
            You are a planning component in an agentic loop.
            Choose exactly one next action.
            Use only tools listed in AVAILABLE_TOOLS.
            When choosing action='tool', you MUST set toolInput to a JSON object containing ALL required parameters
            for that tool, extracting their values from the GOAL, context, and prior OBSERVATIONS.
            The AVAILABLE_TOOLS section shows the exact keys and types required in toolInput for each tool.
            For example, if a tool requires toolInput: {"location": "<string>"}, you must output toolInput: {"location": "the actual value"}.
            Never leave toolInput empty or omit required fields.
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
