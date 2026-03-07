import { genkit } from "genkit";
import awsBedrock from "genkitx-aws-bedrock";
import { runAgenticLoopWithGenkitTools } from "./loop";
import { getModel, SupportedModel } from "../util/Models";
import { vertexAI } from "@genkit-ai/google-genai";

async function main(): Promise<void> {
    const model = (process.env.AGENTIC_MODEL ?? "amazon.nova-lite") as SupportedModel;
    const region = process.env.AWS_REGION ?? "eu-north-1";
    const goal = process.argv.slice(2).join(" ") || "Tell me today's UTC date and explain what tool was used.";

        const ai = genkit({
            plugins: [vertexAI()],
            model: vertexAI.model('gemini-2.0-flash-lite')
            // plugins: [awsBedrock({ region: "eu-north-1" })],
            // model: "amazon.nova-pro",
        });

    const result = await runAgenticLoopWithGenkitTools(ai, {
        goal,
        maxAttempts: 6,
    });

    console.log("\n=== AGENTIC LOOP (GENKIT TOOLS) RESULT ===");
    console.log(result.finalAnswer);
    console.log("\n=== TRACE ===");
    console.log(JSON.stringify(result.state, null, 2));
}

main().catch((error) => {
    console.error("Agentic loop (Genkit tools) failed:", error);
    process.exit(1);
});
