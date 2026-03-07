import { z } from "genkit";

export function buildAgentActionSchema(toolNames: [string, ...string[]]) {
    return z.object({
        action: z.enum(["tool", "finish", "clarify"]),
        reasoning: z.string().describe("Why this is the best next step."),
        toolName: z.enum(toolNames).optional(),
        toolInput: z.record(z.unknown()).optional(),
        draftAnswer: z.string().optional(),
        clarifyQuestion: z.string().optional().describe("The question to ask the user when critical information is missing and no tool can supply it."),
    });
}

export interface AgentAction {
    action: "tool" | "finish" | "clarify";
    reasoning: string;
    toolName?: string;
    toolInput?: Record<string, unknown>;
    draftAnswer?: string;
    clarifyQuestion?: string;
}

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
}
