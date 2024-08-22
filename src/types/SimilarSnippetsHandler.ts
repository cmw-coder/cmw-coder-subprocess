import { SimilarSnippet } from 'types/similarSnippets';
import { Position } from 'types/master';

export interface SimilarSnippetsMasterHandler {
  log(...data: any[]): Promise<void>;
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
