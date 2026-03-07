import { z } from "genkit";

export const PlanActDecisionSchema = z.object({
    action: z.enum(["tool", "finish", "clarify"]),
    reasoning: z.string().describe("Why this is the best next step."),
    draftAnswer: z.string().optional(),
    clarifyQuestion: z.string().optional().describe("The question to ask the user when critical information is missing."),
});

export type PlanActDecision = z.infer<typeof PlanActDecisionSchema>;

export const CriticDecisionSchema = z.object({
    done: z.boolean(),
    reasoning: z.string(),
    confidence: z.number().min(0).max(1),
    finalAnswer: z.string().optional(),
});
export type CriticDecision = z.infer<typeof CriticDecisionSchema>;

export interface ToolExecution {
    toolName: string;
    input: Record<string, unknown>;
    inputDebug: unknown;
    output: string;
}

export interface AgentLoopState {
    goal: string;
    context: string[];
    attempts: number;
    maxAttempts: number;
    plan: string[];
    observations: string[];
    toolExecutions: ToolExecution[];
    finalAnswer?: string;
}

export interface AgentLoopResult {
    done: boolean;
    finalAnswer: string;
    state: AgentLoopState;
    clarifyQuestion?: string;
    attempts: number;
}
