import { ReviewChildHandler } from 'types/ReviewHandler';
import { MessageToChildProxy } from './MessageProxy';
import { ReviewProcessArgv } from 'types/argv';

export class MessageToReviewChildProxy extends MessageToChildProxy<ReviewChildHandler> {
  constructor(scriptPath: string, argv: ReviewProcessArgv) {
    super(scriptPath, [`--historyDir=${argv.historyDir}`], 5870);
  }
}
