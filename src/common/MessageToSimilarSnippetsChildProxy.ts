import { SimilarSnippetsHandler } from 'types/SimilarSnippetsHandler';
import { MessageToChildProxy } from 'common/MessageProxy';

export class MessageToSimilarSnippetsChildProxy extends MessageToChildProxy<SimilarSnippetsHandler> {
  constructor(scriptPath: string) {
    super(scriptPath, [], 5869);
  }
}
