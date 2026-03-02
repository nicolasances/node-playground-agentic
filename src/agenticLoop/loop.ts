import { Genkit } from "genkit";
import { criticDecision, planNextAction } from "./prompts";
import { executeTool } from "./tools";
import { AgentLoopResult, AgentLoopState } from "./types";

export interface RunLoopInput {
    goal: string;
    context?: string[];
    maxAttempts?: number;
}

export async function runAgenticLoop(ai: Genkit, input: RunLoopInput): Promise<AgentLoopResult> {
    const state: AgentLoopState = {
        goal: input.goal,
        context: input.context ?? [],
        attempts: 0,
        maxAttempts: input.maxAttempts ?? 6,
        plan: [],
        observations: [],
        toolExecutions: [],
    };

    while (state.attempts < state.maxAttempts) {
        const action = await planNextAction(ai, state);
        state.plan.push(`${action.action}: ${action.reasoning}`);

        if (action.action === "finish") {
            const finalAnswer = action.draftAnswer ?? "Loop finished without a draft answer.";
            state.finalAnswer = finalAnswer;
            return { done: true, finalAnswer, state };
        }

        if (!action.toolName) {
            throw new Error("Planner selected tool action without toolName.");
        }

        const toolInput = action.toolInput ?? {};
        const toolOutput = await executeTool(action.toolName, toolInput);
        state.toolExecutions.push({
            toolName: action.toolName,
            input: toolInput,
            output: toolOutput,
        });

        const observation = `${action.toolName} -> ${toolOutput}`;
        state.observations.push(observation);
        state.attempts += 1;

        const review = await criticDecision(ai, state, observation);
        state.plan.push(`critic: ${review.reasoning} (confidence=${review.confidence})`);

        if (review.done) {
            const finalAnswer = review.finalAnswer ?? "Goal marked as completed by critic.";
            state.finalAnswer = finalAnswer;
            return { done: true, finalAnswer, state };
        }
    }

    const timeoutAnswer = [
        "Loop stopped due to max attempts.",
        `Last observation: ${state.observations[state.observations.length - 1] ?? "<none>"}`,
    ].join(" ");

    state.finalAnswer = timeoutAnswer;
    return {
        done: false,
        finalAnswer: timeoutAnswer,
        state,
    };
}
