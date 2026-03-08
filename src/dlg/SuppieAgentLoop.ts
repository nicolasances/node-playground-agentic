import { Request } from "express";
import { genkit } from "genkit";
import { TotoDelegate, UserContext } from "totoms";
import { vertexAI } from "@genkit-ai/google-genai";
import { AgenticLoop } from "../agenticLoopWithGenkitTools/loop";
import { createGenkitTools } from "../agenticLoopWithGenkitTools/tools";

export class SuppieAgentLoop extends TotoDelegate<SuppieAgentLoopInput, SuppieAgentLoopOutput> {

    protected async do(req: SuppieAgentLoopInput, userContext?: UserContext): Promise<SuppieAgentLoopOutput> {

        const goal = req.message;

        const ai = genkit({
            plugins: [vertexAI()],
            model: vertexAI.model('gemini-2.0-flash-lite')
            // plugins: [awsBedrock({ region: "eu-north-1" })],
            // model: "amazon.nova-pro",
        });

        const result = await new AgenticLoop({ ai, tools: createGenkitTools(ai), correlationId: this.cid }).loop({
            goal
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