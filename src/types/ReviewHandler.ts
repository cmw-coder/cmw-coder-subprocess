import { Reference, ReviewData, Selection } from 'types/review';
import { AppConfig } from 'types/master';

export interface ReviewMasterHandler {
  getConfig(): Promise<AppConfig>;
  log(...payloads: any[]): Promise<void>;
  getReferences(selection: Selection): Promise<Reference[]>;
}

export interface ReviewChildHandler {
  addReview(review: ReviewData): Promise<any>;
}
