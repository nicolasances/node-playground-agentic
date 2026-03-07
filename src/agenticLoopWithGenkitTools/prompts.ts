import { Genkit, z } from "genkit";
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

const PlanItemActionRouteSchema = z.object({
    action: z.enum(["act", "finish", "clarify"]),
    reasoning: z.string(),
    draftAnswer: z.string().nullable().optional(),
    clarifyQuestion: z.string().nullable().optional(),
}).superRefine((value, ctx) => {
    if (value.action === "finish" && !value.draftAnswer) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["draftAnswer"],
            message: "draftAnswer is required when action='finish'.",
        });
    }

    if (value.action === "clarify" && !value.clarifyQuestion) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["clarifyQuestion"],
            message: "clarifyQuestion is required when action='clarify'.",
        });
    }
});

export async function createPlan(
    ai: Genkit,
    state: AgentLoopState
): Promise<PlanCreation> {

    const response = await ai.generate({
        system: `
            You are the planning component in an agentic loop.
            Build a concise, actionable plan to solve the user's goal.
            Use available tools only as capabilities awareness (name+description).
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

    const routeResponse = await ai.generate({
        system: `
            You are a routing component for one plan item in an agentic loop.
            Choose exactly one action among: act, finish, clarify.

            - act: work is needed on this plan item.
            - finish: no more work needed; provide final direct answer to the user goal.
            - clarify: ask a concise question if critical user information is missing.
        `,
        prompt: `
            USER_GOAL: ${state.goal}

            CURRENT_PLAN_ITEM: #${item.id} ${item.title} - ${item.description}

            ITEM_ATTEMPT: ${itemAttempt}/${maxItemAttempts}

            FULL_PLAN: ${serializePlan(state.plan)}

            OBSERVATIONS: ${state.observations.join(" | ") || "<none>"}

            AVAILABLE_TOOLS:
            ${describeToolNamesAndDescriptions()}
        `,
        output: { schema: PlanItemActionRouteSchema },
    });

    if (!routeResponse.output) {
        throw new Error("Act route step returned no structured output.");
    }

    const route = routeResponse.output;

    if (route.action === "finish") {
        return {
            action: "finish",
            reasoning: route.reasoning,
            draftAnswer: route.draftAnswer,
            actSummary: null,
            clarifyQuestion: null,
        };
    }

    if (route.action === "clarify") {
        return {
            action: "clarify",
            reasoning: route.reasoning,
            clarifyQuestion: route.clarifyQuestion,
            actSummary: null,
            draftAnswer: null,
        };
    }

    const actResponse = await ai.generate({
        system: `
            You are the acting component for one plan item in an agentic loop.
            Perform work to complete the plan item, using native tools when useful.
            Return a concise action summary including key tool results.
            Never invent tool outputs.
        `,
        prompt: `
            USER_GOAL: ${state.goal}

            CURRENT_PLAN_ITEM: #${item.id} ${item.title} - ${item.description}

            ITEM_ATTEMPT: ${itemAttempt}/${maxItemAttempts}

            FULL_PLAN: ${serializePlan(state.plan)}

            OBSERVATIONS: ${state.observations.join(" | ") || "<none>"}

            Provide only the action summary text.
        `,
        tools: createNativeTools(ai),
    });

    const actSummary = actResponse.text?.trim() || "Action attempted with no textual summary.";

    return {
        action: "act",
        reasoning: route.reasoning,
        actSummary,
        draftAnswer: null,
        clarifyQuestion: null,
    };
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
