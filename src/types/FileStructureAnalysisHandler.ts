import { SymbolType } from 'types/review';

export interface SymbolInfo {
  endLine: number;
  name: string;
  path: string;
  startLine: number;
  type: SymbolType;
}
