import { Genkit, ToolAction, z } from "genkit";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ToolExecution } from "./types";

export type ToolExecutionCallback = (execution: ToolExecution) => void;

function serializeWithUndefined(value: unknown): unknown {
    if (value === undefined) return "__undefined__";
    if (value === null) return null;
    if (Array.isArray(value)) return value.map((item) => serializeWithUndefined(item));
    if (typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
            out[key] = serializeWithUndefined(child);
        }
        return out;
    }
    return value;
}

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

export function createNativeTools(ai: Genkit, onExecution: ToolExecutionCallback): ToolAction[] {
    const getWeather = ai.defineTool(
        {
            name: "getWeather",
            description: toolMetadata.getWeather.description,
            inputSchema: toolMetadata.getWeather.schema,
        },
        async (input) => {
            const inputDebug = serializeWithUndefined(input);

            let output: string;
            try {
                output = `The current weather in ${input.location} is sunny with a temperature of 25°C.`;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                output = `ERROR: ${errorMessage}`;
            }

            onExecution({
                toolName: "getWeather",
                input,
                inputDebug,
                output,
            });

            return output;
        }
    );

    const getCurrentDate = ai.defineTool(
        {
            name: "getCurrentDate",
            description: toolMetadata.getCurrentDate.description,
            inputSchema: toolMetadata.getCurrentDate.schema,
        },
        async (input) => {
            const inputDebug = serializeWithUndefined(input);

            let output: string;
            try {
                output = new Date().toISOString();
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                output = `ERROR: ${errorMessage}`;
            }

            onExecution({
                toolName: "getCurrentDate",
                input,
                inputDebug,
                output,
            });

            return output;
        }
    );

    const getSupermarketListItems = ai.defineTool(
        {
            name: "getSupermarketListItems",
            description: toolMetadata.getSupermarketListItems.description,
            inputSchema: toolMetadata.getSupermarketListItems.schema,
        },
        async (input) => {
            const inputDebug = serializeWithUndefined(input);

            let output: string;
            try {
                output = JSON.stringify(["Bread C", "Butter", "Leverpostej", "Bacon", "Eggs", "Greek Yogurt"]);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                output = `ERROR: ${errorMessage}`;
            }

            onExecution({
                toolName: "getSupermarketListItems",
                input,
                inputDebug,
                output,
            });

            return output;
        }
    );

    return [getWeather, getCurrentDate, getSupermarketListItems];
}
