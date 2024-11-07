import { SimilarSnippetsHandler } from '../types/SimilarSnippetsHandler';
import { MessageToChildProxy } from './MessageProxy';
export declare class MessageToSimilarSnippetsChildProxy extends MessageToChildProxy<SimilarSnippetsHandler> {
    constructor(scriptPath: string);
}
