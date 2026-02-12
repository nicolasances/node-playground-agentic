import { Request } from "express";
import { Logger, TotoDelegate, UserContext } from "totoms";
import { genkit, z } from "genkit";
import { amazonNovaLiteV1, amazonNovaProV1, anthropicClaude37SonnetV1, awsBedrock } from "genkitx-aws-bedrock";
import { createMcpHost } from '@genkit-ai/mcp';

export class AnswerWithMCPTools extends TotoDelegate<AnswerWithMCPToolsRequest, AnswerWithMCPToolsResponse> {

    async do(req: AnswerWithMCPToolsRequest, userContext?: UserContext): Promise<AnswerWithMCPToolsResponse> {
        
        const logger = Logger.getInstance()

        // Extract the token from the request (adjust based on your auth setup)
        const mcpHost = createMcpHost({
            name: 'Toto MCP Host', // A unique name for this host instance
            mcpServers: {
                greetServer: {
                    url: 'http://localhost:9000/tometopics/mcp', // URL of the MCP server
                    requestInit: {
                        headers: {
                            'Authorization': req.userToken,
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
            model: getModel(req.model, "eu"),
        });

        const expectedOutputSchema = z.object({
            answer: z.string().describe("The answer to the question in plain text")
        });

        const response = await ai.generate({ 
            prompt: req.prompt, 
            tools: await mcpHost.getActiveTools(ai),
            output: { schema: expectedOutputSchema } 
        });

        await mcpHost.close();

        return { response: response.output, usage: response.usage, fullResponse: response };

    }
    
    parseRequest(req: Request): AnswerWithMCPToolsRequest {

        return {
            userToken: String(req.headers.authorization || req.headers.Authorization), 
            model: req.body.model || "amazon.nova-pro",
            prompt: req.body.prompt
        }
    }

}

interface AnswerWithMCPToolsRequest {
    userToken: string; 
    model: string; 
    prompt: string;
}

interface AnswerWithMCPToolsResponse {
    response: { answer: string; } | null; 
    usage: any; 
    fullResponse: any;
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