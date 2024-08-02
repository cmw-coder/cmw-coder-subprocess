import { Reference, ReviewData, Selection } from './review';
import { AppConfig } from './master';
export interface ReviewMasterHandler {
    getConfig(): Promise<AppConfig>;
    log(...payloads: any[]): Promise<void>;
    getReferences(selection: Selection): Promise<Reference[]>;
}
export interface ReviewChildHandler {
    addReview(review: ReviewData): Promise<any>;
}
