import { z } from "genkit";

export function buildAgentActionSchema(
    toolNames: [string, ...string[]],
    toolInputSchemas: Record<string, z.ZodObject<any>>
) {
    return z.object({
        action: z.enum(["tool", "finish", "clarify"]),
        reasoning: z.string().describe("Why this is the best next step."),
        toolName: z.enum(toolNames).optional(),
        toolInput: z.record(z.unknown()).describe("The input to the tool, as a JSON object. Must include all required fields for the selected tool."),
        draftAnswer: z.string().optional(),
        clarifyQuestion: z.string().optional().describe("The question to ask the user when critical information is missing and no tool can supply it."),
    }).superRefine((value, ctx) => {
        if (value.action === "tool") {
            if (!value.toolName) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["toolName"],
                    message: "toolName is required when action='tool'.",
                });
                return;
            }

            if (value.toolInput === undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["toolInput"],
                    message: "toolInput is required when action='tool'.",
                });
                return;
            }

            const toolSchema = toolInputSchemas[value.toolName];
            if (!toolSchema) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["toolName"],
                    message: `Unknown tool schema for '${value.toolName}'.`,
                });
                return;
            }

            const parsedToolInput = toolSchema.safeParse(value.toolInput);
            if (!parsedToolInput.success) {
                for (const issue of parsedToolInput.error.issues) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["toolInput", ...issue.path],
                        message: issue.message,
                    });
                }
            }
        }

        if (value.action === "clarify" && !value.clarifyQuestion) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["clarifyQuestion"],
                message: "clarifyQuestion is required when action='clarify'.",
            });
        }

        if (value.action === "finish" && !value.draftAnswer) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["draftAnswer"],
                message: "draftAnswer is required when action='finish'.",
            });
        }
    });
}

export interface AgentAction {
    action: "tool" | "finish" | "clarify";
    reasoning: string;
    toolName?: string;
    toolInput: Record<string, unknown>;
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
