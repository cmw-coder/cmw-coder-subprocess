import { MessageToChildProxy } from './MessageProxy';
import { DiffChildHandler } from '../types/diffHandler';
export declare class MessageToDiffChildProxy extends MessageToChildProxy<DiffChildHandler> {
    constructor(scriptPath: string);
}
