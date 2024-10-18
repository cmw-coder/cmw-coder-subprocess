import { SymbolType } from './review';
export interface SymbolInfo {
    endLine: number;
    name: string;
    path: string;
    startLine: number;
    type: SymbolType;
}
