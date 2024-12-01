import { SimilarSnippet } from './similarSnippets';
import { CaretPosition } from './common';
export interface SimilarSnippetsMasterHandler {
    log(...data: any[]): Promise<void>;
}
export interface SimilarSnippetsHandler {
    getSimilarSnippets(data: {
        file: string;
        position: CaretPosition;
        functionPrefix: string;
        functionSuffix: string;
        recentFiles: string[];
    }): Promise<SimilarSnippet[]>;
}
