import {
  ExtraData,
  Reference,
  ReviewData,
  ReviewFileItem,
  Selection,
} from 'types/review';
import { AppConfig } from 'types/master';

export interface ReviewMasterHandler {
  getConfig(): Promise<AppConfig>;
  getTreeSitterFolder(): Promise<string>;
  log(...payloads: any[]): Promise<void>;
  getReferences(selection: Selection): Promise<Reference[]>;
}

export interface ReviewChildHandler {
  addReview(data: { selection: Selection; extraData: ExtraData }): Promise<any>;
  reviewFile(data: { filePath: string; extraData: ExtraData }): Promise<any>;
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
}
