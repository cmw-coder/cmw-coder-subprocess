import { ReviewData } from '../types/review';
import { ReviewMasterHandler } from '../types/ReviewHandler';
export declare class LocalReviewHistoryManager {
    private readonly localReviewHistoryDir;
    private proxyFn;
    private tempUpdateData;
    private updateTimer;
    constructor(localReviewHistoryDir: string, proxyFn: ReviewMasterHandler);
    checkLocalReviewHistoryDir(): void;
    getReviewHistoryFiles(): Promise<string[]>;
    getReviewFileContent(name: string): Promise<ReviewData[]>;
    private _saveTempReviewData;
    saveReviewItem(item: ReviewData): Promise<void>;
}
