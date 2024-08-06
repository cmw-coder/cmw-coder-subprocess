import { ReviewData } from '../types/review';
import { ReviewMasterHandler } from '../types/ReviewHandler';
export declare class LocalReviewHistoryManager {
    private readonly localReviewHistoryDir;
    private proxyFn;
    constructor(localReviewHistoryDir: string, proxyFn: ReviewMasterHandler);
    checkLocalReviewHistoryDir(): void;
    getReviewHistoryFiles(): Promise<string[]>;
    getReviewFileContent(name: string): Promise<ReviewData[]>;
    saveReviewItem(name: string, item: ReviewData): Promise<void>;
}
