import { Genkit, ToolAction, z } from "genkit";

const toolsCache = new WeakMap<Genkit, ToolAction[]>();

export function createGenkitTools(ai: Genkit): ToolAction[] {
    const cached = toolsCache.get(ai);
    if (cached) return cached;

    const getCurrentDate = ai.defineTool(
        {
            name: "getCurrentDate",
            description: "Returns the current UTC date-time as an ISO string.",
            inputSchema: z.object({}),
        },
        async () => new Date().toISOString()
    );

    const getWeather = ai.defineTool(
        {
            name: "getWeather",
            description: "Returns mock weather data for a given location.",
            inputSchema: z.object({
                location: z.string().min(1),
            }),
        },
        async (input) => `Weather in ${input.location}: sunny, 25°C.`
    );

    const getSupermarketListItems = ai.defineTool(
        {
            name: "getSupermarketListItems",
            description: "Returns current supermarket list items.",
            inputSchema: z.object({}),
        },
        async () => JSON.stringify(["Bread", "Butter", "Eggs", "Greek yogurt"])
    );

    const tools = [getCurrentDate, getWeather, getSupermarketListItems];
    toolsCache.set(ai, tools);
    return tools;
}

export const AVAILABLE_TOOLS_TEXT = [
    "- getCurrentDate: Returns the current UTC date-time as an ISO string.",
    "- getWeather: Returns mock weather data for a given location.",
    "- getSupermarketListItems: Returns current supermarket list items.",
].join("\n");
