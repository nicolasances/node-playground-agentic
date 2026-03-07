import { Genkit } from "genkit";
import { criticDecision, planAndActWithNativeTools } from "./prompts";
import { AgentLoopResult, AgentLoopState, ToolExecution } from "./types";

export interface RunLoopInput {
    goal: string;
    context?: string[];
    maxAttempts?: number;
}

/**
 * Runs an iterative agentic loop to solve a goal by using Genkit native tools
 * in a merged plan+act step, then explicit observe and critic phases.
 */
export async function runAgenticLoopWithGenkitTools(ai: Genkit, input: RunLoopInput): Promise<AgentLoopResult> {

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

        let latestToolExecution: ToolExecution | undefined;

        const decision = await planAndActWithNativeTools(ai, state, (execution) => {
            state.toolExecutions.push(execution);
            latestToolExecution = execution;
        });

        state.plan.push(`plan+act: ${decision.action} - ${decision.reasoning}`);

        console.log(`----------------------------------------------`);
        console.log(`Iteration #${state.attempts + 1}... `);
        console.log(`----------------------------------------------`);
        console.log(`Planning+Acting ... `);
        console.log(`${decision.action}: ${decision.reasoning}`);
        console.log(`----------------------------------------------`);

        if (decision.action === "finish") {
            const finalAnswer = decision.draftAnswer ?? "Loop finished without a draft answer.";
            state.finalAnswer = finalAnswer;
            return { done: true, finalAnswer, state, attempts: state.attempts };
        }

        if (decision.action === "clarify") {
            const clarifyQuestion = decision.clarifyQuestion ?? "Could you please provide more information?";
            state.finalAnswer = clarifyQuestion;
            return { done: false, finalAnswer: clarifyQuestion, state, clarifyQuestion, attempts: state.attempts };
        }

        if (!latestToolExecution) {
            throw new Error("Planner selected tool action but no tool was executed.");
        }

        const observation = `${latestToolExecution.toolName} input=${JSON.stringify(latestToolExecution.inputDebug)} -> ${latestToolExecution.output}`;

        console.log(`Observing ... `);
        console.log(observation);
        console.log(`----------------------------------------------`);

        state.observations.push(observation);
        state.attempts += 1;

        const review = await criticDecision(ai, state, observation);

        state.plan.push(`critic: ${review.reasoning} (confidence=${review.confidence})`);

        console.log(`Reviewing ... `);
        console.log(`Reasoning: ${review.reasoning}`);

        const hasToolError = latestToolExecution.output.startsWith("ERROR:");
        if (review.done && hasToolError) {
            state.plan.push("critic-overridden: last tool call returned ERROR, continuing loop.");
            continue;
        }

        if (review.done) {
            const finalAnswer = review.finalAnswer ?? "Goal marked as completed by critic.";
            state.finalAnswer = finalAnswer;
            return { done: true, finalAnswer, state, attempts: state.attempts };
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
        attempts: state.attempts,
    };
}
