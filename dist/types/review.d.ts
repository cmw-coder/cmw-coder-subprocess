import { Range } from './master';
export declare enum SymbolType {
    Enum = "Enum",
    Function = "Function",
    Macro = "Macro",
    Reference = "Reference",
    Struct = "Struct",
    Unknown = "Unknown",
    Variable = "Variable"
}
export interface ExtraData {
    projectId: string;
    version: string;
}
export interface SelectionData {
    block: string;
    file: string;
    content: string;
    range: Range;
    language: string;
}
export interface Reference {
    name: string;
    type: SymbolType;
    content: string;
    depth: number;
    path: string;
    range: {
        startLine: number;
        endLine: number;
    };
}
export interface ReviewRequestParams {
    productLine: string;
    profileModel: string;
    templateName: string;
    references: Reference[];
    language: string;
    target: {
        block: string;
        snippet: string;
    };
}
export declare enum ReviewState {
    Queue = "Queue",
    Ready = "Ready",
    References = 0,
    Start = 1,
    /**
     * @deprecated
     */
    First = 2,
    /**
     * @deprecated
     */
    Second = 3,
    /**
     * @deprecated
     */
    Third = 4,
    Finished = 100,
    Error = -1
}
export declare const reviewStateIconMap: Record<ReviewState, {
    color: string;
    icon: string;
}>;
export declare enum ReviewType {
    File = "File",
    Function = "Function"
}
export interface ReviewTypeMapping {
    [ReviewType.File]: ReviewData[];
    [ReviewType.Function]: ReviewData | undefined;
}
export declare enum Feedback {
    None = "None",
    Helpful = "Helpful",
    NotHelpful = "NotHelpful"
}
export interface ReviewParsedResult {
    Type: string;
    IsProblem: string;
    Number: number;
    ProblemCodeSnippet: string;
    Description: string;
}
export interface ReviewResult {
    parsed: boolean;
    data: ReviewParsedResult[];
    originData: string;
}
export interface ReviewData {
    references: Reference[];
    selectionData: SelectionData;
    reviewId: string;
    serverTaskId: string;
    state: ReviewState;
    result: ReviewResult;
    feedback: Feedback;
    errorInfo: string;
    extraData: ExtraData;
    reviewType: ReviewType;
    isRunning: boolean;
    createTime: number;
    startTime: number;
    endTime: number;
    referenceTime: number;
    comment?: string;
}
export interface ReviewFileData {
    date: number;
    items: ReviewData[];
}
export interface ReviewFileItem {
    path: string;
    total: number;
    done: number;
    problemNumber: number;
}
