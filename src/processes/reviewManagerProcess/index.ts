import { MessageToMasterProxy } from 'common/MasterMessage';
import { ReviewManager } from 'processes/reviewManagerProcess/ReviewManager';
import { ChildHandlerMap, MasterHandlerMap } from 'types/MasterHandlerMap';
import { ReviewData } from 'types/review';
import { ReviewInstance } from './ReviewInstance';

class ReviewProcess
  extends MessageToMasterProxy<MasterHandlerMap>
  implements ChildHandlerMap
{
  private reviewManager = new ReviewManager();
  constructor() {
    super();
  }

  async addReview(data: {
    selection: ReviewData['selection'];
    extraData: ReviewData['extraData'];
    reviewType: ReviewData['reviewType'];
  }) {
    const review = new ReviewInstance(
      data.selection,
      data.extraData,
      this.proxyFn
    );
    this.reviewManager.addReview(review);
  }
}

new ReviewProcess();
