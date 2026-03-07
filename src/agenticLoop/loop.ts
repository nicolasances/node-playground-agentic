import { Genkit } from "genkit";
import { criticDecision, planNextAction } from "./prompts";
import { executeTool } from "./tools";
import { AgentLoopResult, AgentLoopState } from "./types";

export interface RunLoopInput {
    goal: string;
    context?: string[];
    maxAttempts?: number;
}

function serializeWithUndefined(value: unknown): unknown {
    if (value === undefined) return "__undefined__";
    if (value === null) return null;
    if (Array.isArray(value)) return value.map((item) => serializeWithUndefined(item));
    if (typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
            out[key] = serializeWithUndefined(child);
        }
        return out;
    }
    return value;
}

/**
 * Runs an iterative agentic loop to solve a goal by planning, using tools,
 * and validating progress until completion or max attempts is reached.
 *
 * Main steps of the Agentic Loop:
 * 1) Initialize state: build loop memory (goal, context, plan, observations, attempts).
 * 2) Plan: ask the planner for the next best action (`planNextAction`).
 * 3) Act: execute the selected tool (`executeTool`) when a tool action is returned.
 * 4) Observe: record tool outputs as observations and update loop progress.
 * 5) Reflect & decide: run critic review (`criticDecision`) to either finish or continue.
 *
 * If the planner requests `finish`, or the critic marks `done`, the function returns
 * a final answer. If max attempts is hit first, it returns a timeout-style summary.
 */
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

        // 1. Plan - define what the next action should be
        const action = await planNextAction(ai, state);

        state.plan.push(`${action.action}: ${action.reasoning}`);

        console.log(`----------------------------------------------`);
        console.log(`Iteration #${state.attempts + 1}... `);
        console.log(`----------------------------------------------`);
        console.log(`Planning ... `);
        console.log(`${action.action}: ${action.reasoning}`);
        console.log(`----------------------------------------------`);

        if (action.action === "finish") {
            const finalAnswer = action.draftAnswer ?? "Loop finished without a draft answer.";
            state.finalAnswer = finalAnswer;
            return { done: true, finalAnswer, state };
        }

        if (action.action === "clarify") {
            const clarifyQuestion = action.clarifyQuestion ?? "Could you please provide more information?"
            state.finalAnswer = clarifyQuestion;
            return { done: false, finalAnswer: clarifyQuestion, state, clarifyQuestion };
        }

        if (!action.toolName) {
            throw new Error("Planner selected tool action without toolName.");
        }

        // 2. Act - use a tool
        const toolInput = action.toolInput ?? {};
        const toolInputDebug = serializeWithUndefined(action.toolInput);

        let toolOutput: string;
        try {
            toolOutput = await executeTool(action.toolName, toolInput);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            toolOutput = `ERROR: ${errorMessage}`;
        }

        console.log(`Acting ... `);
        console.log(`Executing tool ${action.toolName} with input ${JSON.stringify(toolInputDebug)} -> output: ${toolOutput}`);
        console.log(`----------------------------------------------`);
        
        state.toolExecutions.push({
            toolName: action.toolName,
            input: toolInput,
            inputDebug: toolInputDebug,
            output: toolOutput,
        });

        // 3. Observe - read the tool result (including errors, so the agent can recover)
        const observation = `${action.toolName} input=${JSON.stringify(toolInputDebug)} -> ${toolOutput}`;

        console.log(`Observing ... `);
        console.log(observation);
        console.log(`----------------------------------------------`);

        state.observations.push(observation);

        state.attempts += 1;

        // 4. Reflect - critic the decision, review, decide if more should be done
        const review = await criticDecision(ai, state, observation);

        state.plan.push(`critic: ${review.reasoning} (confidence=${review.confidence})`);

        console.log(`Reviewing ... `);
        console.log(`Reasoning: ${review.reasoning}`);

        const hasToolError = toolOutput.startsWith("ERROR:");
        if (review.done && hasToolError) {
            state.plan.push("critic-overridden: last tool call returned ERROR, continuing loop.");
            continue;
        }

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
