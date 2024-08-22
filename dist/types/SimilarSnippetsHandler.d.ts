import { SimilarSnippet } from './similarSnippets';
import { Position } from './master';
export interface SimilarSnippetsMasterHandler {
    log(data: string): Promise<void>;
}
export interface SimilarSnippetsHandler {
    getSimilarSnippets(data: {
        file: string;
        position: Position;
        functionPrefix: string;
        functionSuffix: string;
        recentFiles: string[];
    }): Promise<SimilarSnippet[]>;
}
