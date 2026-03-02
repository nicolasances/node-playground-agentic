import { z } from "genkit";
import { ToolName } from "./types";

type ToolDefinition = {
    description: string;
    schema: z.ZodObject<any>;
    run: (input: Record<string, unknown>) => Promise<string>;
};

const toolRegistry: Record<ToolName, ToolDefinition> = {
    echo: {
        description: "Echoes the provided text back to the agent.",
        schema: z.object({
            text: z.string(),
        }),
        run: async (input) => String(input.text ?? ""),
    },
    getCurrentDate: {
        description: "Returns the current UTC date/time in ISO format.",
        schema: z.object({}),
        run: async () => new Date().toISOString(),
    },
};

export function describeAvailableTools(): string {
    return Object.entries(toolRegistry)
        .map(([name, def]) => `- ${name}: ${def.description}`)
        .join("\n");
}

export async function executeTool(toolName: ToolName, input: Record<string, unknown>): Promise<string> {
    const tool = toolRegistry[toolName];
    const validated = tool.schema.parse(input ?? {});
    return tool.run(validated);
}
