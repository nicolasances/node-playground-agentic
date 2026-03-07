import { Genkit, ToolAction, z } from "genkit";
import { zodToJsonSchema } from "zod-to-json-schema";

const toolMetadata = {
    getWeather: {
        description: "Returns the current weather for a given location.",
        schema: z.object({
            location: z.string().describe("The location to get the weather for, e.g. 'Copenhagen'. Mandatory"),
        }),
    },
    getCurrentDate: {
        description: "Returns the current UTC date/time in ISO format.",
        schema: z.object({}).describe("Input schema for getCurrentDate tool"),
    },
    getSupermarketListItems: {
        description: "Returns the list of items in the supermarket shopping list.",
        schema: z.object({}).describe("Input schema for getSupermarketListItems tool"),
    },
} as const;

const nativeToolsCache = new WeakMap<Genkit, ToolAction[]>();

function describeSchema(schema: z.ZodObject<any>): string {
    const jsonSchema = (zodToJsonSchema as any)(schema, {
        $refStrategy: "none",
    });
    return JSON.stringify(jsonSchema);
}

export function describeAvailableTools(): string {
    return Object.entries(toolMetadata)
        .map(([name, def]) => `- ${name}: ${def.description}\n  toolInput schema: ${describeSchema(def.schema)}`)
        .join("\n");
}

export function describeToolNamesAndDescriptions(): string {
    return Object.entries(toolMetadata)
        .map(([name, def]) => `- ${name}: ${def.description}`)
        .join("\n");
}

export function getAvailableToolNames(): string[] {
    return Object.keys(toolMetadata);
}

export function createNativeTools(ai: Genkit): ToolAction[] {
    const cached = nativeToolsCache.get(ai);
    if (cached) {
        return cached;
    }

    const getWeather = ai.defineTool(
        {
            name: "getWeather",
            description: toolMetadata.getWeather.description,
            inputSchema: toolMetadata.getWeather.schema,
        },
        async (input) => `The current weather in ${input.location} is sunny with a temperature of 25°C.`
    );

    const getCurrentDate = ai.defineTool(
        {
            name: "getCurrentDate",
            description: toolMetadata.getCurrentDate.description,
            inputSchema: toolMetadata.getCurrentDate.schema,
        },
        async () => new Date().toISOString()
    );

    const getSupermarketListItems = ai.defineTool(
        {
            name: "getSupermarketListItems",
            description: toolMetadata.getSupermarketListItems.description,
            inputSchema: toolMetadata.getSupermarketListItems.schema,
        },
        async () => JSON.stringify(["Bread C", "Butter", "Leverpostej", "Bacon", "Eggs", "Greek Yogurt"])
    );

    const tools = [getWeather, getCurrentDate, getSupermarketListItems];
    nativeToolsCache.set(ai, tools);
    return tools;
}
