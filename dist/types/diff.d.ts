import DiffMatchPatch from 'diff-match-patch';
export default DiffMatchPatch;
export interface DiffLineResult {
    added: number;
    deleted: number;
}
export interface DiffCharResult {
    added: number;
    deleted: number;
}
