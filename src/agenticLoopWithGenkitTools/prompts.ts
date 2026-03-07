import { Genkit } from "genkit";
import {
    AgentLoopState,
    GoalCriticDecision,
    GoalCriticDecisionSchema,
    PlanCreation,
    PlanCreationSchema,
    PlanItem,
    PlanItemActDecision,
    PlanItemCriticDecision,
    PlanItemCriticDecisionSchema,
} from "./types";
import { createNativeTools, describeToolNamesAndDescriptions } from "./tools";

function serializePlan(plan: PlanItem[]): string {
    if (plan.length === 0) return "<none>";
    return plan
        .map((item) => `#${item.id} [${item.completed ? "completed" : "pending"}] ${item.title} - ${item.description}`)
        .join(" | ");
}

function normalizeActDecisionFromText(text: string): PlanItemActDecision {
    const trimmed = text.trim();

    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]) as Partial<PlanItemActDecision>;
            const action = parsed.action;

            if (action === "finish") {
                return {
                    action: "finish",
                    reasoning: parsed.reasoning ?? "Model chose finish.",
                    draftAnswer: parsed.draftAnswer ?? trimmed,
                    actSummary: null,
                    clarifyQuestion: null,
                };
            }

            if (action === "clarify") {
                return {
                    action: "clarify",
                    reasoning: parsed.reasoning ?? "Model requested clarification.",
                    clarifyQuestion: parsed.clarifyQuestion ?? "Could you clarify the missing information?",
                    actSummary: null,
                    draftAnswer: null,
                };
            }

            if (action === "act") {
                return {
                    action: "act",
                    reasoning: parsed.reasoning ?? "Model performed an action.",
                    actSummary: parsed.actSummary ?? trimmed,
                    draftAnswer: null,
                    clarifyQuestion: null,
                };
            }
        } catch {
            // Fall back below.
        }
    }

    return {
        action: "act",
        reasoning: "Model acted but returned non-JSON decision text.",
        actSummary: trimmed || "Action attempted with no textual summary.",
        draftAnswer: null,
        clarifyQuestion: null,
    };
}

export async function createPlan(
    ai: Genkit,
    state: AgentLoopState
): Promise<PlanCreation> {

    const response = await ai.generate({
        system: `
            You are the planning component in an agentic loop.
            Build a concise, actionable plan to solve the user's goal. 
            Take as few steps as possible. 
            Regarding tools: 
                - If you have the knowledge to complete the goal without tools, do not use them.
                - If you need to use tools, break down the plan into steps that use them effectively.
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

    return response.output;
}

export async function actOnPlanItem(
    ai: Genkit,
    state: AgentLoopState,
    item: PlanItem,
    itemAttempt: number,
    maxItemAttempts: number
): Promise<PlanItemActDecision> {

    const response = await ai.generate({
        system: `
            You are the acting component for one plan item in an agentic loop.
            Choose exactly one action among: act, finish, clarify.

            - act: do work now, using native tools if useful (only if you need them); provide actSummary.
            - finish: no more work needed; provide final direct answer in draftAnswer.
            - clarify: ask a concise question in clarifyQuestion if critical user information is missing.

            Never invent tool outputs.
                        Your final response MUST be ONLY a JSON object with this exact shape:
                        {
                            "action": "act" | "finish" | "clarify",
                            "reasoning": "string",
                            "actSummary": "string|null",
                            "draftAnswer": "string|null",
                            "clarifyQuestion": "string|null"
                        }
        `,
        prompt: `
            USER_GOAL: ${state.goal}

            ITEM_ATTEMPT: ${itemAttempt}/${maxItemAttempts}

            FULL_PLAN: ${serializePlan(state.plan)}

            CURRENT_PLAN_ITEM: #${item.id} ${item.title} - ${item.description}

            OBSERVATIONS: ${state.observations.join(" | ") || "<none>"}

            Return only JSON. No markdown, no prose before/after.
        `,
        tools: createNativeTools(ai),
    });

    const text = response.text ?? "";

    return normalizeActDecisionFromText(text);
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
            If not completed, provide a concrete correctionInstruction.
        `,
        prompt: `
            USER_GOAL: ${state.goal}

            PLAN_ITEM: #${item.id} ${item.title} - ${item.description}

            LAST_ACT_SUMMARY: ${lastActSummary}

            OBSERVATIONS: ${state.observations.join(" | ") || "<none>"}
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
