import { z } from "genkit";

export const PlanItemDraftSchema = z.object({
    title: z.string().min(3).describe("Short plan item title."),
    description: z.string().min(5).describe("What this step should achieve."),
});

export const PlanCreationSchema = z.object({
    reasoning: z.string(),
    items: z.array(PlanItemDraftSchema).min(1).max(8),
});
export type PlanCreation = z.infer<typeof PlanCreationSchema>;

export const PlanItemActDecisionSchema = z.object({
    action: z.enum(["act", "finish", "clarify"]),
    reasoning: z.string().describe("Why this is the best next step for this plan item."),
    actSummary: z.string().nullable().optional().describe("Summary of actions performed and key tool results for this plan item."),
    draftAnswer: z.string().nullable().optional().describe("Direct final answer when action='finish'."),
    clarifyQuestion: z.string().nullable().optional().describe("Question to ask the user when action='clarify'."),
}).superRefine((value, ctx) => {
    if (value.action === "finish" && !value.draftAnswer) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["draftAnswer"],
            message: "draftAnswer is required when action='finish'.",
        });
    }

    if (value.action === "clarify" && !value.clarifyQuestion) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["clarifyQuestion"],
            message: "clarifyQuestion is required when action='clarify'.",
        });
    }
});
export type PlanItemActDecision = z.infer<typeof PlanItemActDecisionSchema>;

export const PlanItemCriticDecisionSchema = z.object({
    completed: z.boolean(),
    reasoning: z.string(),
    confidence: z.number().min(0).max(1),
    correctionInstruction: z.string().nullable().optional().describe("If not completed, what should be improved in the next act attempt."),
});
export type PlanItemCriticDecision = z.infer<typeof PlanItemCriticDecisionSchema>;

export const GoalCriticDecisionSchema = z.object({
    done: z.boolean(),
    reasoning: z.string(),
    confidence: z.number().min(0).max(1),
    finalAnswer: z.string().nullable().optional(),
});
export type GoalCriticDecision = z.infer<typeof GoalCriticDecisionSchema>;

export interface PlanItem {
    id: number;
    title: string;
    description: string;
    completed: boolean;
    completionNotes?: string;
}

export interface AgentLoopState {
    goal: string;
    context: string[];
    attempts: number;
    maxAttempts: number;
    goalIteration: number;
    maxGoalIterations: number;
    plan: PlanItem[];
    observations: string[];
    finalAnswer?: string;
}

export interface AgentLoopResult {
    done: boolean;
    finalAnswer: string;
    state: AgentLoopState;
    clarifyQuestion?: string;
    attempts: number;
}
