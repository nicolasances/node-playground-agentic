import { z } from "genkit";

export const ToolNameSchema = z.enum(["echo", "getCurrentDate", "getSupermarketListItems"]);
export type ToolName = z.infer<typeof ToolNameSchema>;

export const AgentActionSchema = z.object({
    action: z.enum(["tool", "finish"]),
    reasoning: z.string().describe("Why this is the best next step."),
    toolName: ToolNameSchema.optional(),
    toolInput: z.record(z.unknown()).optional(),
    draftAnswer: z.string().optional(),
});
export type AgentAction = z.infer<typeof AgentActionSchema>;

export const CriticDecisionSchema = z.object({
    done: z.boolean(),
    reasoning: z.string(),
    confidence: z.number().min(0).max(1),
    finalAnswer: z.string().optional(),
});
export type CriticDecision = z.infer<typeof CriticDecisionSchema>;

export interface ToolExecution {
    toolName: ToolName;
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
}
