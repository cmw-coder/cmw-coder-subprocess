import { ExtraData, Feedback, Reference, ReviewData, ReviewFileItem, ReviewRequestParams, ReviewResult, ReviewState, Selection } from 'types/review';
import { AppConfig } from 'types/master';
export interface ReviewMasterHandler {
    getConfig(): Promise<AppConfig>;
    getScriptDir(): Promise<string>;
    log(...payloads: any[]): Promise<void>;
    getReferences(selection: Selection): Promise<Reference[]>;
    reviewDataUpdated(reviewId: string): Promise<void>;
    reviewFileListUpdated(): Promise<void>;
    api_code_review: (data: ReviewRequestParams) => Promise<string>;
    api_get_code_review_state: (serverTaskId: string) => Promise<ReviewState>;
    api_get_code_review_result: (serverTaskId: string) => Promise<ReviewResult>;
    api_feedback_review: (data: {
        serverTaskId: string;
        userId: string;
        feedback: Feedback;
        timestamp: number;
        comment: string;
    }) => Promise<unknown>;
    api_stop_review: (serverTaskId: string) => Promise<unknown>;
}
export interface ReviewChildHandler {
    addReview(data: {
        selection: Selection;
        extraData: ExtraData;
    }): Promise<any>;
    reviewFile(data: {
        filePath: string;
        extraData: ExtraData;
    }): Promise<any>;
    reviewProject(data: {
        projectDirPath: string;
        extraData: ExtraData;
    }): Promise<any>;
    getReviewData(): Promise<ReviewData[]>;
    delReview(reviewId: string): Promise<any>;
    setReviewFeedback(data: {
        reviewId: string;
        feedback: string;
        comment?: string;
    }): Promise<any>;
    retryReview(reviewId: string): Promise<any>;
    stopReview(reviewId: string): Promise<any>;
    getReviewFileList(): Promise<ReviewFileItem[]>;
    getFileReviewList(filePath: string): Promise<ReviewData[]>;
    clearReview(): Promise<any>;
}
