import { Request } from "express";
import { genkit } from "genkit";
import { TotoDelegate, UserContext } from "totoms";
import { vertexAI } from "@genkit-ai/google-genai";
import { runAgenticLoop } from "../agenticLoop/loop";

export class SuppieAgentLoop extends TotoDelegate<SuppieAgentLoopInput, SuppieAgentLoopOutput> {

    protected async do(req: SuppieAgentLoopInput, userContext?: UserContext): Promise<SuppieAgentLoopOutput> {

        const goal = req.message;

        const ai = genkit({
            plugins: [vertexAI()],
            model: vertexAI.model('gemini-2.0-flash')
            // plugins: [awsBedrock({ region: "eu-north-1" })],
            // model: "amazon.nova-pro",
        });
        const result = await runAgenticLoop(ai, {
            goal,
            maxAttempts: 6,
        });

        console.log("\n=== AGENTIC LOOP RESULT ===");
        console.log(result.finalAnswer);
        console.log("\n=== TRACE ===");
        console.log(JSON.stringify(result.state, null, 2));
        
        return {
            answer: result.finalAnswer
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
}