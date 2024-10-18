import { SymbolInfo } from 'types/FileStructureAnalysisHandler';

export interface FileStructureAnalysisChildHandler {
  getGlobals(filePath: string): Promise<string | undefined>;
  getIncludes(filePath: string, maxLength: number): Promise<string | undefined>;
  getCalledFunctionIdentifiers(filePath: string): Promise<string[] | undefined>;
  getRelativeDefinitions(symbols: SymbolInfo[]): Promise<
    | {
        path: string;
        content: string;
      }[]
    | undefined
  >;
}

export interface FileStructureAnalysisMasterHandler {
  getScriptDir(): Promise<string>;
  log(...payloads: any[]): Promise<void>;
}
