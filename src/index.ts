import { getHyperscalerConfiguration, SupportedHyperscalers, TotoMicroservice, TotoMicroserviceConfiguration } from 'totoms';
import { ControllerConfig } from "./Config";
import { AnswerWithMCPTools } from './dlg/AnswerWithMCPTools';
import { TranscriptionGrounding } from './dlg/TranscriptionGrounding';

const config: TotoMicroserviceConfiguration = {
    serviceName: "toto-ms-ex1",
    basePath: '/ex1',
    environment: {
        hyperscaler: process.env.HYPERSCALER as SupportedHyperscalers || "aws",
        hyperscalerConfiguration: getHyperscalerConfiguration()
    },
    customConfiguration: ControllerConfig,
    apiConfiguration: {
        apiEndpoints: [
            { method: 'POST', path: '/prompt/mcp', delegate: AnswerWithMCPTools },
            { method: 'POST', path: '/prompt/transcriptGrounding', delegate: TranscriptionGrounding}
        ],
        apiOptions: { noCorrelationId: true }
    }, 
};

TotoMicroservice.init(config).then(microservice => {
    microservice.start();
});