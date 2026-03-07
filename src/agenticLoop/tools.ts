import { z } from "genkit";
import { zodToJsonSchema } from "zod-to-json-schema";

type ToolDefinition = {
    description: string;
    schema: z.ZodObject<any>;
    run: (input: Record<string, unknown>) => Promise<string>;
};

const toolRegistry: Record<string, ToolDefinition> = {
    getWeather: {
       description: "Returns the current weather for a given location.",
       schema: z.object({ location: z.string() }),
       run: async (input) => {
           const location = input.location as string;
           // Mocked weather response
           return `The current weather in ${location} is sunny with a temperature of 25°C.`;
       }, 
    }, 
    getCurrentDate: {
        description: "Returns the current UTC date/time in ISO format.",
        schema: z.object({}),
        run: async () => new Date().toISOString(),
    },
    getSupermarketListItems: {
        description: "Returns the list of items in the supermarket shopping list.", 
        schema: z.object({}), 
        run: async () => {
            return JSON.stringify(["Bread C", "Butter", "Leverpostej", "Bacon", "Eggs", "Greek Yogurt"])
        }
    }, 
};

function describeSchema(schema: z.ZodObject<any>): string {
    const jsonSchema = (zodToJsonSchema as any)(schema, {
        $refStrategy: "none",
    });
    return JSON.stringify(jsonSchema);
}

export function describeAvailableTools(): string {
    return Object.entries(toolRegistry)
        .map(([name, def]) => `- ${name}: ${def.description}\n  toolInput schema: ${describeSchema(def.schema)}`)
        .join("\n");
}

export function getToolNames(): [string, ...string[]] {
    return Object.keys(toolRegistry) as [string, ...string[]];
}

export function getToolInputSchemas(): Record<string, z.ZodObject<any>> {
    return Object.fromEntries(
        Object.entries(toolRegistry).map(([name, def]) => [name, def.schema])
    ) as Record<string, z.ZodObject<any>>;
}

export async function executeTool(toolName: string, input: Record<string, unknown>): Promise<string> {
    const tool = toolRegistry[toolName];
    const validated = tool.schema.parse(input ?? {});
    return tool.run(validated);
}
