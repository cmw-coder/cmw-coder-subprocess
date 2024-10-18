import { FileStructureAnalysisChildHandler } from "../types/fileStructureAnalysis";
import { MessageToChildProxy } from "./MessageProxy";
export declare class MessageToFileStructureAnalysisChildProxy extends MessageToChildProxy<FileStructureAnalysisChildHandler> {
    constructor(scriptPath: string);
}
