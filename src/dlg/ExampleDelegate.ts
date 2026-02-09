import { Request } from "express";
import { Logger, TotoDelegate, UserContext } from "totoms";
import { genkit, z } from "genkit";
import { amazonNovaLiteV1, amazonNovaProV1, anthropicClaude37SonnetV1, awsBedrock } from "genkitx-aws-bedrock";
import { createMcpHost } from '@genkit-ai/mcp';

export class PostPrompt extends TotoDelegate {

    async do(req: Request, userContext?: UserContext): Promise<any> {
        
        const logger = Logger.getInstance()

        // Extract the token from the request (adjust based on your auth setup)
        const authHeader = req.headers.authorization || req.headers.Authorization;

        const mcpHost = createMcpHost({
            name: 'Toto MCP Host', // A unique name for this host instance
            mcpServers: {
                tomeTopics: {
                    url: 'http://localhost:8081/mcp', // URL of the MCP server
                    requestInit: {
                        headers: {
                            'Authorization': authHeader,
                            'Content-Type': 'application/json',
                        }
                    }
                }
            }
        });

        const ai = genkit({
            plugins: [
                awsBedrock({ region: "eu-north-1" }),
            ],
            model: getModel(req.body.model || "amazon.nova-pro", "eu"),
        });

        const expectedOutputSchema = z.object({
            answer: z.string().describe("The answer to the question in plain text")
        });

        const response = await ai.generate({ 
            prompt: req.body.prompt, 
            tools: await mcpHost.getActiveTools(ai),
            output: { schema: expectedOutputSchema } 
        });

        await mcpHost.close();

        return { response: response.output, usage: response.usage, fullResponse: response };

    }

}

function getModel(modeId: string, region: string) {

    switch (modeId) {
        case "anthropic.claude-3.7-sonnet":
            return anthropicClaude37SonnetV1(region);
        case "amazon.nova-pro":
            return amazonNovaProV1(region);
        case "amazon.nova-lite":
            return amazonNovaLiteV1;
        default:
            throw new Error(`Unsupported model id: ${modeId}`);
    }
}