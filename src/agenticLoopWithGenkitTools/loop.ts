import { Genkit } from "genkit";
import { actOnPlanItem, createPlan, criticGoalCompletion, criticPlanItemCompletion } from "./prompts";
import { AgentLoopResult, AgentLoopState, PlanItem } from "./types";

export interface RunLoopInput {
    goal: string;
    context?: string[];
    maxAttempts?: number;
    maxGoalIterations?: number;
    maxItemAttempts?: number;
}

/**
 * Runs a nested agentic loop:
 * 1) Plan loop: build a plan with completion-tracked items.
 * 2) Act loop: execute first non-completed item (Genkit native tool usage).
 * 3) Critic loops: validate item completion, then validate goal completion.
 */
export async function runAgenticLoopWithGenkitTools(ai: Genkit, input: RunLoopInput): Promise<AgentLoopResult> {

    const maxGoalIterations = input.maxGoalIterations ?? input.maxAttempts ?? 4;
    const maxTotalActs = input.maxAttempts ?? 12;
    const maxItemAttempts = input.maxItemAttempts ?? 3;

    const state: AgentLoopState = {
        goal: input.goal,
        context: input.context ?? [],
        attempts: 0,
        maxAttempts: maxTotalActs,
        goalIteration: 0,
        maxGoalIterations,
        plan: [],
        observations: [],
    };

    while (state.goalIteration < state.maxGoalIterations && state.attempts < state.maxAttempts) {

        const planResult = await createPlan(ai, state);
        state.plan = planResult.items.map((item, index) => ({
            id: index + 1,
            title: item.title,
            description: item.description,
            completed: false,
        }));

        state.observations.push(`planner: ${planResult.reasoning}`);

        console.log(`----------------------------------------------`);
        console.log(`Goal iteration #${state.goalIteration + 1}...`);
        console.log(`Planning ...`);
        console.log(`Plan created: `);
        state.plan.forEach((item) => {
            console.log(`  #${item.id} ${item.title} - ${item.description}`);
        });
        console.log(`----------------------------------------------`);

        let lastStepSummary = `Plan created with ${state.plan.length} items.`;

        for (const item of state.plan) {
            let itemAttempt = 0;

            while (!item.completed && itemAttempt < maxItemAttempts && state.attempts < state.maxAttempts) {
                itemAttempt += 1;

                const decision = await actOnPlanItem(ai, state, item, itemAttempt, maxItemAttempts);

                console.log(`Acting on item #${item.id} ...`);
                console.log(`${decision.action}: ${decision.reasoning}`);

                if (decision.action === "clarify") {
                    const clarifyQuestion = decision.clarifyQuestion ?? "Could you please provide more information?";
                    state.finalAnswer = clarifyQuestion;
                    return { done: false, finalAnswer: clarifyQuestion, state, clarifyQuestion, attempts: state.attempts };
                }

                if (decision.action === "finish") {
                    const candidateAnswer = decision.draftAnswer ?? "Agent produced a finish decision without draft answer.";
                    state.observations.push(`act-finish: ${candidateAnswer}`);
                    lastStepSummary = candidateAnswer;

                    const goalReviewFromFinish = await criticGoalCompletion(ai, state, lastStepSummary);
                    state.observations.push(`goal-critic: ${goalReviewFromFinish.reasoning}`);

                    if (goalReviewFromFinish.done) {
                        const finalAnswer = goalReviewFromFinish.finalAnswer ?? candidateAnswer;
                        state.finalAnswer = finalAnswer;
                        return { done: true, finalAnswer, state, attempts: state.attempts };
                    }

                    break;
                }

                const stepSummary = decision.actSummary?.trim() || decision.reasoning;
                state.observations.push(`act item #${item.id}: ${stepSummary}`);
                state.attempts += 1;
                lastStepSummary = stepSummary;

                const itemReview = await criticPlanItemCompletion(ai, state, item, stepSummary);
                state.observations.push(`item-critic #${item.id}: ${itemReview.reasoning}`);

                if (itemReview.completed) {
                    item.completed = true;
                    item.completionNotes = itemReview.reasoning;
                    console.log(`Item #${item.id} completed.`);
                } else {
                    const feedback = itemReview.correctionInstruction?.trim() || itemReview.reasoning;
                    state.observations.push(`item-feedback #${item.id}: ${feedback}`);
                    console.log(`Item #${item.id} not completed: ${feedback}`);
                }
            }

            if (!item.completed && state.attempts >= state.maxAttempts) {
                break;
            }
        }

        const goalReview = await criticGoalCompletion(ai, state, lastStepSummary);
        state.observations.push(`goal-critic: ${goalReview.reasoning}`);

        console.log(`Goal review ...`);
        console.log(`Reasoning: ${goalReview.reasoning}`);

        if (goalReview.done) {
            const finalAnswer = goalReview.finalAnswer ?? "Goal marked as completed by critic.";
            state.finalAnswer = finalAnswer;
            return { done: true, finalAnswer, state, attempts: state.attempts };
        }

        state.goalIteration += 1;
    }

    const timeoutAnswer = [
        "Loop stopped before goal completion.",
        `Last observation: ${state.observations[state.observations.length - 1] ?? "<none>"}`,
    ].join(" ");

    state.finalAnswer = timeoutAnswer;
    return {
        done: false,
        finalAnswer: timeoutAnswer,
        state,
        attempts: state.attempts,
    };
}
