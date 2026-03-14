import { Request } from "express";
import { genkit, z } from "genkit";
import { TotoDelegate, UserContext } from "totoms";
import { vertexAI } from "@genkit-ai/google-genai";
import { AgenticLoop } from '@nicolas.ances/toten'

const list = ["Bread", "Milk"]

export class SuppieAgentLoop extends TotoDelegate<SuppieAgentLoopInput, SuppieAgentLoopOutput> {

    protected async do(req: SuppieAgentLoopInput, userContext?: UserContext): Promise<SuppieAgentLoopOutput> {

        const goal = req.message;

        const ai = genkit({
            plugins: [vertexAI()],
            model: vertexAI.model('gemini-2.0-flash')
            // plugins: [awsBedrock({ region: "eu-north-1" })],
            // model: "amazon.nova-pro",
        });

        const getSupermarketListItems = ai.defineTool(
            {
                name: "getSupermarketListItems",
                description: "Returns current supermarket list items.",
                inputSchema: z.object({}),
                outputSchema: z.object({
                    items: z.array(z.string()).describe("The list of items in the supermarket list."),
                }),
            },
            async () => ({ items: list })
        );

        const addSupermarketListItems = ai.defineTool(
            {
                name: "addSupermarketListItems",
                description: "Adds the provided items to the supermarket list (shopping list).",
                inputSchema: z.object({
                    items: z.array(z.string()).describe("The list of items to add to the supermarket list."),
                }),
                outputSchema: z.object({
                    success: z.boolean().describe("Whether the items were successfully added to the supermarket list."),
                    currentList: z.array(z.string()).describe("The current list of items in the supermarket list after adding the new items."),
                }),
            },
            async ({ items }) => {
                list.push(...items);
                return {
                    success: true,
                    currentList: list,
                }
            }
        )

        const loop = new AgenticLoop({ ai, tools: [getSupermarketListItems, addSupermarketListItems] })

        const result = await loop.loop({
            goal
        })

        console.log("\n=== AGENTIC LOOP RESULT ===");
        console.log(result.finalAnswer);

        return {
            answer: result.finalAnswer,
            iterations: result.state.iterations,
        }
    }

    parseRequest(req: Request): SuppieAgentLoopInput {
        return {
            message: req.body.message
        }
    }


}

interface SuppieAgentLoopInput {
    message: string
}
interface SuppieAgentLoopOutput {
    answer: string
    iterations: number;
}