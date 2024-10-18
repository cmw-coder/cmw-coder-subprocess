import { SymbolInfo } from "./FileStructureAnalysisHandler";
export interface FileStructureAnalysisChildHandler {
    getGlobals(filePath: string): Promise<string>;
    getIncludes(filePath: string, maxLength: number): Promise<string>;
    getCalledFunctionIdentifiers(filePath: string): Promise<string[]>;
    getRelativeDefinitions(symbols: SymbolInfo[]): Promise<{
        path: string;
        content: string;
    }[]>;
}
export interface FileStructureAnalysisMasterHandler {
    getScriptDir(): Promise<string>;
    log(...payloads: any[]): Promise<void>;
}
