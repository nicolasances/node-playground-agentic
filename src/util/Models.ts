import { amazonNovaLiteV1, amazonNovaProV1, anthropicClaude37SonnetV1 } from "genkitx-aws-bedrock";

export type SupportedModel = "anthropic.claude-3.7-sonnet" | "amazon.nova-pro" | "amazon.nova-lite";

export function getModel(modeId: SupportedModel, region: string) {

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