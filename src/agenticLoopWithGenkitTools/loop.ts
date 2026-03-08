import { Genkit } from "genkit";
import { v4 as uuidv4 } from "uuid";
import {
    PLAN_SYSTEM_PROMPT,
    ACT_SYSTEM_PROMPT,
    CRITIC_SYSTEM_PROMPT,
    buildPlanPrompt,
    buildActPrompt,
    buildCriticPrompt,
} from "./prompts";
import { createGenkitTools, getAvailableToolsText } from "./tools";
import { AgentLoopResult, AgentLoopState, CriticDecisionSchema, PlanDecisionSchema } from "./types";
import { ToolAction } from "genkit";
import { Logger } from "totoms";

export interface RunLoopInput {
    goal: string;
    context?: string[];
    maxIterations?: number;
}

export interface AgenticLoopOptions {
    correlationId?: string;
}

export class AgenticLoop {
    private readonly ai: Genkit;
    private readonly tools: ToolAction[];
    private readonly correlationId: string;
    private readonly logger = Logger.getInstance();

    constructor({ ai, tools, correlationId }: { ai: Genkit; tools: ToolAction[]; correlationId?: string }) {
        this.ai = ai;
        this.tools = tools;
        this.correlationId = correlationId ?? uuidv4();
    }

    async loop(input: RunLoopInput): Promise<AgentLoopResult> {

        const availableToolsText = getAvailableToolsText(this.tools);

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

            this.logger.compute(this.correlationId, "----------------------------------------------");
            this.logger.compute(this.correlationId, `Iteration #${iteration}`);

            const planResponse = await this.ai.generate({
                system: PLAN_SYSTEM_PROMPT,
                prompt: buildPlanPrompt(state, availableToolsText),
                output: { schema: PlanDecisionSchema },
            });

            if (!planResponse.output) {
                throw new Error("Planner returned no structured output.");
            }

            const plan = planResponse.output;

            this.logger.compute(this.correlationId, `Plan instruction: ${plan.instruction}`);

            let actOutput = "";
            try {
                const actResponse = await this.ai.generate({
                    system: ACT_SYSTEM_PROMPT,
                    prompt: buildActPrompt(state, plan.instruction),
                    tools: this.tools,
                });

                actOutput = actResponse.text?.trim() || "";
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                actOutput = `ERROR: Act step failed. ${errorMessage}`;
            }

            this.logger.compute(this.correlationId, `Act output: ${actOutput || "<empty>"}`);

            const criticResponse = await this.ai.generate({
                system: CRITIC_SYSTEM_PROMPT,
                prompt: buildCriticPrompt(state, actOutput),
                output: { schema: CriticDecisionSchema },
            });

            if (!criticResponse.output) {
                throw new Error("Critic returned no structured output.");
            }

            const critic = criticResponse.output;
            this.logger.compute(this.correlationId, `Critic fulfilled: ${critic.fulfilled}`);
            this.logger.compute(this.correlationId, `Critic reasoning: ${critic.reasoning}`);
            this.logger.compute(this.correlationId, `Critic observations: ${critic.observations}`);

            state.history.push({
                iteration,
                planInstruction: plan.instruction,
                planReasoning: plan.reasoning,
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

        const timeout = `
        Loop stopped before goal completion.
        Last critic observation: ${state.observations[state.observations.length - 1] ?? "<none>"}
    `;

        state.finalAnswer = timeout;

        return {
            done: false,
            finalAnswer: timeout,
            state,
        };
    }
}
