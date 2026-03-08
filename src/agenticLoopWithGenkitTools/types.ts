import { z } from "genkit";

export const PlanDecisionSchema = z.object({
    instruction: z.string().min(1),
    reasoning: z.string(),
});

export type PlanDecision = z.infer<typeof PlanDecisionSchema>;

export const CriticDecisionSchema = z.object({
    fulfilled: z.boolean(),
    observations: z.string().optional(),
    finalAnswer: z.string().optional(),
    reasoning: z.string(),
}).superRefine((value, ctx) => {
    if (value.fulfilled && !value.finalAnswer) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["finalAnswer"],
            message: "finalAnswer is required when fulfilled=true.",
        });
    }

    if (!value.fulfilled && !value.observations) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["observations"],
            message: "observations is required when fulfilled=false.",
        });
    }
});

export type CriticDecision = z.infer<typeof CriticDecisionSchema>;

export interface LoopIteration {
    iteration: number;
    planInstruction: string;
    planReasoning: string;
    actOutput: string;
    criticReasoning: string;
    criticFulfilled: boolean;
    criticObservations?: string;
}

export interface AgentLoopState {
    goal: string;
    context: string[];
    maxIterations: number;
    iterations: number;
    observations: string[];
    history: LoopIteration[];
    finalAnswer?: string;
}

export interface AgentLoopResult {
    done: boolean;
    finalAnswer: string;
    state: AgentLoopState;
}
