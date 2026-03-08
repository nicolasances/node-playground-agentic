import { Request } from "express";
import { genkit } from "genkit";
import { TotoDelegate, UserContext } from "totoms";
import { vertexAI } from "@genkit-ai/google-genai";
import { runAgenticLoop } from "../agenticLoop/loop";
import { runAgenticLoopWithGenkitTools } from "../agenticLoopWithGenkitTools/loop";

export class SuppieAgentLoop extends TotoDelegate<SuppieAgentLoopInput, SuppieAgentLoopOutput> {

    protected async do(req: SuppieAgentLoopInput, userContext?: UserContext): Promise<SuppieAgentLoopOutput> {

        const goal = req.message;

        const ai = genkit({
            plugins: [vertexAI()],
            model: vertexAI.model('gemini-2.0-flash-lite')
            // plugins: [awsBedrock({ region: "eu-north-1" })],
            // model: "amazon.nova-pro",
        });
        const result = await runAgenticLoopWithGenkitTools(ai, {
            goal,
            maxIterations: 6,
        });

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