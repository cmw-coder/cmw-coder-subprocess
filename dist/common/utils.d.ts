import { CaretPosition } from '../types/common';
export declare const timeout: (time?: number) => Promise<unknown>;
export declare function getFilesInDirectory(dir: string): Promise<string[]>;
export declare const deleteComments: (content: string) => string;
export declare const separateTextByLine: (rawText: string, removeComments?: boolean) => string[];
export declare const getAllOtherTabContents: (filePathList: string[]) => Promise<{
    path: string;
    content: string;
}[]>;
export declare const getPositionOffset: (fileContent: string, caretPosition: CaretPosition) => number;
export declare const getRemainedCodeContents: ({ file, position, functionPrefix, functionSuffix, }: {
    file: string;
    position: CaretPosition;
    functionPrefix: string;
    functionSuffix: string;
}) => Promise<{
    before: string[];
    after: string[];
}>;
export declare const tokenize: (rawText: string, ignoreRules: Array<Set<string>>, splitPattern?: RegExp) => Set<string>;
export declare const getMostSimilarSnippetStartLine: (candidateTokens: Array<Set<string>>, referenceTokens: Set<string>, windowSize: number) => {
    startLine: number;
    score: number;
};
export declare function getTruncatedContents(content: string, indices: {
    begin: number;
    end: number;
}[]): string;
