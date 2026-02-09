import { getHyperscalerConfiguration, SupportedHyperscalers, TotoMicroservice, TotoMicroserviceConfiguration } from 'totoms';
import { ControllerConfig } from "./Config";
import { PostPrompt } from './dlg/ExampleDelegate';

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
            { method: 'POST', path: '/prompt', delegate: PostPrompt }
        ],
        apiOptions: { noCorrelationId: true }
    }, 
};

TotoMicroservice.init(config).then(microservice => {
    microservice.start();
});