import { Genkit, ToolAction, z } from "genkit";
import { SupermarketList } from "./supermarketList";

const toolsCache = new WeakMap<Genkit, ToolAction[]>();
const supermarketList = new SupermarketList();

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
        async () => JSON.stringify(supermarketList.getList())
    );

    const addItesToSupermarketList = ai.defineTool(
        {
            name: "addItemsToSupermarketList",
            description: "Adds one or more items to the supermarket list. ",
            inputSchema: z.object({ names: z.array(z.string()).describe("The names of the items to add.") }),
        },
        async (input: any) => { input.names.forEach((name: string) => supermarketList.addItem(name)); }
    );

    const tools = [getCurrentDate, getWeather, getSupermarketListItems, addItesToSupermarketList];
    toolsCache.set(ai, tools);
    return tools;
}

export const AVAILABLE_TOOLS_TEXT = [
    "- getCurrentDate: Returns the current UTC date-time as an ISO string.",
    "- getWeather: Returns mock weather data for a given location.",
    "- getSupermarketListItems: Returns current supermarket list items.",
].join("\n");
