import { ReviewChildHandler } from '../types/ReviewHandler';
import { MessageToChildProxy } from './MessageProxy';
import { ReviewProcessArgv } from '../types/argv';
export declare class MessageToReviewChildProxy extends MessageToChildProxy<ReviewChildHandler> {
    constructor(scriptPath: string, argv: ReviewProcessArgv);
}
