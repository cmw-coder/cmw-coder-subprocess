import { Reference, ReviewData, Selection } from 'types/review';

export interface ReviewMasterHandlerMap {
  getConfig(): Promise<{
    user: string;
    token: string;
    reToken: string;
    productLine: string;
    model: string;
    projectId: string;
  }>;
  getReferences(selection: Selection): Promise<Reference[]>;
}

export interface ReviewChildHandlerMap {
  addReview(review: ReviewData): Promise<any>;
}
