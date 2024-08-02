import { ReviewRequestParams, ReviewResult, Feedback, ReviewState } from '../types/review';
export declare const api_code_review: (data: ReviewRequestParams) => Promise<string>;
export declare const api_get_code_review_state: (serverTaskId: string) => Promise<ReviewState>;
export declare const api_get_code_review_result: (serverTaskId: string) => Promise<ReviewResult>;
export declare const api_feedback_review: (serverTaskId: string, userId: string, feedback: Feedback, timestamp: number, comment: string) => Promise<string>;
export declare const api_stop_review: (serverTaskId: string) => Promise<string>;
