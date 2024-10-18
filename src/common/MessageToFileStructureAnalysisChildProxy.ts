import { FileStructureAnalysisChildHandler } from 'types/fileStructureAnalysis';
import { MessageToChildProxy } from './MessageProxy';

export class MessageToFileStructureAnalysisChildProxy extends MessageToChildProxy<FileStructureAnalysisChildHandler> {
  constructor(scriptPath: string) {
    super(scriptPath, [], 5871);
  }
}
