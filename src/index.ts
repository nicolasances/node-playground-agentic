import { getHyperscalerConfiguration, SupportedHyperscalers, TotoMicroservice, TotoMicroserviceConfiguration } from 'totoms';
import { ControllerConfig } from "./Config";
import { AnswerWithMCPTools } from './dlg/AnswerWithMCPTools';
import { TranscriptionGrounding } from './dlg/TranscriptionGrounding';
import { SuppieAgentLoop } from './dlg/SuppieAgentLoop';

const config: TotoMicroserviceConfiguration = {
    serviceName: "playground",
    basePath: '/playground',
    environment: {
        hyperscaler: process.env.HYPERSCALER as SupportedHyperscalers || "aws",
        hyperscalerConfiguration: getHyperscalerConfiguration()
    },
    customConfiguration: ControllerConfig,
    apiConfiguration: {
        apiEndpoints: [
            { method: 'POST', path: '/prompt/mcp', delegate: AnswerWithMCPTools },
            { method: 'POST', path: '/prompt/transcriptGrounding', delegate: TranscriptionGrounding}, 
            { method: 'POST', path: '/agent/messages', delegate: SuppieAgentLoop}
        ],
        apiOptions: { noCorrelationId: true }
    }, 
};

TotoMicroservice.init(config).then(microservice => {
    microservice.start();
});