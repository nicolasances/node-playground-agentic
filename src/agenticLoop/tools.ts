import { z } from "genkit";

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

function zodTypeName(type: z.ZodTypeAny): string {
    const name: string = type._def.typeName ?? "";
    const map: Record<string, string> = {
        ZodString: "string",
        ZodNumber: "number",
        ZodBoolean: "boolean",
        ZodArray: "array",
        ZodObject: "object",
        ZodOptional: "optional",
    };
    return map[name] ?? name;
}

function describeSchema(schema: z.ZodObject<any>): string {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const fields = Object.entries(shape);
    if (fields.length === 0) return "no input required";
    return "input: { " + fields.map(([key, type]) => `${key}: ${zodTypeName(type)}`).join(", ") + " }";
}

export function describeAvailableTools(): string {
    return Object.entries(toolRegistry)
        .map(([name, def]) => `- ${name}: ${def.description} [${describeSchema(def.schema)}]`)
        .join("\n");
}

export function getToolNames(): [string, ...string[]] {
    return Object.keys(toolRegistry) as [string, ...string[]];
}

export async function executeTool(toolName: string, input: Record<string, unknown>): Promise<string> {
    const tool = toolRegistry[toolName];
    const validated = tool.schema.parse(input ?? {});
    return tool.run(validated);
}
