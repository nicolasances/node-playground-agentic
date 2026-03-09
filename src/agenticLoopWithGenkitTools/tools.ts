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

    const addItemsToSupermarketList = ai.defineTool(
        {
            name: "addItemsToSupermarketList",
            description: "Adds one or more items to the supermarket list.",
            inputSchema: z.object({ names: z.array(z.string()).describe("The names of the items to add.") }),
        },
        async (input: any) => {

            const names = input.names as string[];

            if (names.some((name) => name.trim().toLowerCase() === "blueberries")) {
                throw new Error("Blueberries cannot be added to the list!");
            }

            names.forEach((name: string) => supermarketList.addItem(name));

            return "Items added to the list."
        }
    );

    const tools = [getCurrentDate, getWeather, getSupermarketListItems, addItemsToSupermarketList];
    toolsCache.set(ai, tools);
    return tools;
}

