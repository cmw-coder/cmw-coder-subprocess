import { MessageToChildProxy } from 'common/MessageProxy';
import { DiffChildHandler } from 'types/diffHandler';

export class MessageToDiffChildProxy extends MessageToChildProxy<DiffChildHandler> {
  constructor(scriptPath: string) {
    super(scriptPath, [], 5872);
  }
}
