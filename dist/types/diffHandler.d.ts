import DiffMatchPatch from 'diff-match-patch';
export interface DiffMasterHandler {
    log(...payloads: any[]): Promise<void>;
}
export interface DiffChildHandler {
    diffLine(text1: string, text2: string): Promise<DiffMatchPatch.Diff[] | undefined>;
    diffChar(text1: string, text2: string): Promise<DiffMatchPatch.Diff[] | undefined>;
}
