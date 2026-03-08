import { Genkit } from "genkit";
import {
    ACT_SYSTEM_PROMPT,
    CRITIC_SYSTEM_PROMPT,
    buildActPrompt,
    buildCriticPrompt,
} from "./prompts";
import { createGenkitTools } from "./tools";
import { AgentLoopResult, AgentLoopState, CriticDecisionSchema } from "./types";

export interface RunLoopInput {
    goal: string;
    context?: string[];
    maxIterations?: number;
}

export async function runAgenticLoopWithGenkitTools(
    ai: Genkit,
    input: RunLoopInput
): Promise<AgentLoopResult> {
    
    const state: AgentLoopState = {
        goal: input.goal,
        context: input.context ?? [],
        maxIterations: input.maxIterations ?? 6,
        iterations: 0,
        observations: [],
        history: [],
    };

    while (state.iterations < state.maxIterations) {
        const iteration = state.iterations + 1;
        console.log(`----------------------------------------------`);
        console.log(`Iteration #${iteration}`);

        const actResponse = await ai.generate({
            system: ACT_SYSTEM_PROMPT,
            prompt: buildActPrompt(state),
            tools: createGenkitTools(ai),
        });

        const actOutput = actResponse.text?.trim() || "";
        console.log(`Act output: ${actOutput || "<empty>"}`);

        const criticResponse = await ai.generate({
            system: CRITIC_SYSTEM_PROMPT,
            prompt: buildCriticPrompt(state.goal, actOutput),
            output: { schema: CriticDecisionSchema },
        });

        if (!criticResponse.output) {
            throw new Error("Critic returned no structured output.");
        }

        const critic = criticResponse.output;
        console.log(`Critic fulfilled: ${critic.fulfilled}`);
        console.log(`Critic reasoning: ${critic.reasoning}`);

        state.history.push({
            iteration,
            actOutput,
            criticReasoning: critic.reasoning,
            criticFulfilled: critic.fulfilled,
            criticObservations: critic.observations,
        });

        state.iterations += 1;

        if (critic.fulfilled) {
            const finalAnswer = critic.finalAnswer ?? (actOutput || "Goal fulfilled.");
            state.finalAnswer = finalAnswer;
            return {
                done: true,
                finalAnswer,
                state,
            };
        }

        const observation = critic.observations ?? "Goal not fulfilled yet.";
        state.observations.push(observation);
    }

    const timeout = [
        "Loop stopped before goal completion.",
        `Last critic observation: ${state.observations[state.observations.length - 1] ?? "<none>"}`,
    ].join(" ");

    state.finalAnswer = timeout;
    return {
        done: false,
        finalAnswer: timeout,
        state,
    };
}
