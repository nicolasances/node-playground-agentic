import { genkit } from "genkit";
import awsBedrock from "genkitx-aws-bedrock";
import { runAgenticLoopWithGenkitTools } from "./loop";
import { getModel, SupportedModel } from "../util/Models";

async function main(): Promise<void> {
    const model = (process.env.AGENTIC_MODEL ?? "amazon.nova-lite") as SupportedModel;
    const region = process.env.AWS_REGION ?? "eu-north-1";
    const maxIterations = Number(process.env.AGENTIC_MAX_ITERATIONS ?? 6);
    const goal = process.argv.slice(2).join(" ") || "Tell me today's UTC date and explain briefly how you got it.";

    const ai = genkit({
        plugins: [awsBedrock({ region })],
        model: getModel(model, region),
    });

    const result = await runAgenticLoopWithGenkitTools(ai, {
        goal,
        maxIterations,
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
