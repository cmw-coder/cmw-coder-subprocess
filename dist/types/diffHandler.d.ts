import { DiffCharResult, DiffLineResult } from './diff';
export interface DiffMasterHandler {
    log(...payloads: any[]): Promise<void>;
}
export interface DiffChildHandler {
    diffLine(text1: string, text2: string): Promise<DiffLineResult | undefined>;
    diffChar(text1: string, text2: string): Promise<DiffCharResult | undefined>;
    test(name: string, text1: string, text2: string): Promise<{
        greet: string;
        diffResult: string;
    }>;
}
