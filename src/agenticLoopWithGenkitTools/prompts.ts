import { Genkit } from "genkit";
import {
    AgentLoopState,
    GoalCriticDecision,
    GoalCriticDecisionSchema,
    PlanCreation,
    PlanCreationSchema,
    PlanItem,
    PlanItemCriticDecision,
    PlanItemCriticDecisionSchema,
} from "./types";
import { createNativeTools, describeToolNamesAndDescriptions, getAvailableToolNames } from "./tools";

function serializePlan(plan: PlanItem[]): string {
    if (plan.length === 0) return "<none>";
    return plan
        .map((item) => `#${item.id} [${item.completed ? "completed" : "pending"}] ${item.title} - ${item.description}`)
        .join(" | ");
}

function planHasImpossibleExternalDependencies(plan: PlanCreation, availableToolNames: string[]): boolean {
    const text = plan.items
        .map((item) => `${item.title} ${item.description}`)
        .join(" ")
        .toLowerCase();

    const mentionsExternalDependency = /(internet|web\s*search|browse|browser|google|wikipedia|external\s+source|research\s+source|search\s+online|online\s+search)/i.test(text);
    const hasSearchLikeTool = availableToolNames.some((name) => /(search|browse|web|internet|retriev)/i.test(name));

    return mentionsExternalDependency && !hasSearchLikeTool;
}

export async function createPlan(
    ai: Genkit,
    state: AgentLoopState
): Promise<PlanCreation> {

    const availableToolNames = getAvailableToolNames();

    const response = await ai.generate({
        system: `
            You are the planning component in an agentic loop.
            Build a concise, actionable plan to solve the user's goal. 
            Take as few steps as possible. 
            Regarding tools: 
                - If you have the knowledge to complete the goal without tools, do not use them.
                - If you need to use tools, break down the plan into steps that use them effectively. DO NOT INVENT TOOLS. Only use the tools provided.
                - Do NOT create steps that require internet browsing, web search, or external sources unless a matching tool exists.
            Do not execute tools in this step.
        `,
        prompt: `
            GOAL: ${state.goal}

            GOAL_ITERATION: ${state.goalIteration + 1}/${state.maxGoalIterations}

            CONTEXT: ${state.context.join(" | ") || "<none>"}

            PLAN_SO_FAR: ${serializePlan(state.plan)}

            OBSERVATIONS: ${state.observations.join(" | ") || "<none>"}

            AVAILABLE_TOOLS:
            ${describeToolNamesAndDescriptions()}

            Return a structured plan with 1-8 items.
        `,
        output: { schema: PlanCreationSchema },
    });

    if (!response.output) {
        throw new Error("Planner returned no structured output.");
    }

    if (!planHasImpossibleExternalDependencies(response.output, availableToolNames)) {
        return response.output;
    }

    const fallbackResponse = await ai.generate({
        system: `
            You are the planning component in an agentic loop.
            Rewrite the plan to be fully feasible with available tools and model-internal knowledge only.
            Remove any dependency on internet browsing, web search, or external sources if no such tool exists.
            Keep the plan concise and actionable with 1-8 steps.
        `,
        prompt: `
            GOAL: ${state.goal}

            CURRENT_PLAN:
            ${JSON.stringify(response.output.items)}

            AVAILABLE_TOOLS:
            ${describeToolNamesAndDescriptions()}

            AVAILABLE_TOOL_NAMES:
            ${availableToolNames.join(", ") || "<none>"}

            Return a corrected structured plan.
        `,
        output: { schema: PlanCreationSchema },
    });

    if (!fallbackResponse.output) {
        return response.output;
    }

    return fallbackResponse.output;
}

export async function actOnPlanItem(
    ai: Genkit,
    item: PlanItem,
    criticObservationsForItem: string[]
): Promise<string> {

    const response = await ai.generate({
        system: `
            You are the acting component for one plan item in an agentic loop.
            Your only task is to execute the provided plan item instruction.
            Use native tools only when needed.

            Important behavior:
            - Prefer your own model knowledge/capabilities when sufficient.
            - Do NOT claim failure just because a tool is missing or not used.
            - Only report inability if the instruction truly requires unavailable external/private/realtime data.
            - If the item is writing/summarizing/explaining, produce the content directly.

            Never invent tool outputs.
            Return only the action result summary as plain text.
        `,
        prompt: `
            PLAN_ITEM_INSTRUCTION: #${item.id} ${item.title} - ${item.description}

            CRITIC_OBSERVATIONS_FOR_THIS_ITEM: ${criticObservationsForItem.join(" | ") || "<none>"}
        `,
        tools: createNativeTools(ai),
    });

    return response.text?.trim() || "Action attempted with no textual summary.";
}

export async function criticPlanItemCompletion(
    ai: Genkit,
    state: AgentLoopState,
    item: PlanItem,
    lastActSummary: string
): Promise<PlanItemCriticDecision> {

    const response = await ai.generate({
        system: `
            You are a strict reviewer for a single plan item.
            Decide whether the current plan item is completed.

            Review policy:
            - Evaluate ONLY against the plan item instruction, not the whole user goal.
            - Tool usage is optional; do not require tools if the item can be solved with model knowledge.
            - Mark completed=true whenever the instruction is sufficiently satisfied.
            - If not completed, provide a concrete correctionInstruction focused only on the missing part.
            - Never ask for non-existing tools.
        `,
        prompt: `
            PLAN_ITEM: #${item.id} ${item.title} - ${item.description}

            LAST_ACT_SUMMARY: ${lastActSummary}

            ITEM_CRITIC_HISTORY: ${state.observations.filter((entry) => entry.includes(`item-critic #${item.id}`) || entry.includes(`item-feedback #${item.id}`)).join(" | ") || "<none>"}

            AVAILABLE_TOOLS:
            ${describeToolNamesAndDescriptions()}
        `,
        output: { schema: PlanItemCriticDecisionSchema },
    });

    if (!response.output) {
        throw new Error("Plan-item critic returned no structured output.");
    }

    return response.output;
}

export async function criticGoalCompletion(
    ai: Genkit,
    state: AgentLoopState,
    lastStepSummary: string
): Promise<GoalCriticDecision> {

    const response = await ai.generate({
        system: `
            You are a strict reviewer in an agentic loop.
            Decide if the overall user goal has been achieved.
            If done=true, provide a concise and actionable finalAnswer.
            If not done, explain what remains.
        `,
        prompt: `
            GOAL: ${state.goal}

            PLAN: ${serializePlan(state.plan)}

            LAST_STEP: ${lastStepSummary}

            OBSERVATIONS: ${state.observations.join(" | ") || "<none>"}
        `,
        output: { schema: GoalCriticDecisionSchema },
    });

    if (!response.output) {
        throw new Error("Goal critic returned no structured output.");
    }

    return response.output;
}
