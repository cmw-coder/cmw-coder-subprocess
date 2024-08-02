import { MessageToMasterProxy } from 'common/MessageProxy';
import {
  ReviewChildHandler,
  ReviewMasterHandler,
} from 'types/ReviewHandler';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ProcessArgv } from 'types/argv';
import { LocalReviewHistoryManager } from 'common/LocalReviewHistoryManager';
import { ReviewInstance } from 'processes/reviewManagerProcess/ReviewInstance';
import { ReviewData, ReviewFileItem, ReviewState } from 'types/review';

const MAX_RUNNING_REVIEW_COUNT = 10;

const argv = yargs(hideBin(process.argv)).argv as unknown as ProcessArgv;

class ReviewProcess
  extends MessageToMasterProxy<ReviewMasterHandler>
  implements ReviewChildHandler
{
  private activeReviewList: ReviewInstance[] = [];
  private localReviewHistoryManager = new LocalReviewHistoryManager(
    argv.historyDir,
    this.proxyFn,
  );
  constructor() {
    super();
  }

  get runningReviewList() {
    return this.activeReviewList.filter((review) => review.isRunning);
  }

  get reviewDataList() {
    return this.activeReviewList.map((review) => review.getReviewData());
  }

  stopReview(reviewId: string) {
    const review = this.activeReviewList.find(
      (review) => review.reviewId === reviewId,
    );
    if (review) {
      review.stop();
    }
  }

  delReview(reviewId: string) {
    const review = this.activeReviewList.find(
      (review) => review.reviewId === reviewId,
    );
    if (review) {
      review.stop();
    }
    this.activeReviewList = this.activeReviewList.filter(
      (review) => review.reviewId !== reviewId,
    );
  }

  async addReview(data: ReviewData) {
    const review = new ReviewInstance(
      data.selection,
      data.extraData,
      this.proxyFn,
      this.localReviewHistoryManager,
    );
    // const windowService = container.get<WindowService>(ServiceType.WINDOW);
    // const mainWindow = windowService.getWindow(WindowType.Main);
    this.activeReviewList.push(review);
    review.onStart = () => {
      // mainWindow.sendMessageToRenderer(
      //   new ReviewDataUpdateActionMessage(review.reviewId),
      // );
    };
    review.onUpdate = () => {
      // mainWindow.sendMessageToRenderer(
      //   new ReviewDataUpdateActionMessage(review.reviewId),
      // );
    };
    review.onEnd = () => {
      // mainWindow.sendMessageToRenderer(
      //   new ReviewDataUpdateActionMessage(review.reviewId),
      // );
      if (this.runningReviewList.length < MAX_RUNNING_REVIEW_COUNT) {
        // 跑下一个任务
        const queueReviewList = this.activeReviewList.filter(
          (_review) => _review.state === ReviewState.Queue,
        );
        if (queueReviewList.length > 0) {
          const nextReview = queueReviewList[0];
          nextReview.start();
        }
      }
    };
    if (this.runningReviewList.length < MAX_RUNNING_REVIEW_COUNT) {
      review.start();
    }
    // mainWindow.sendMessageToRenderer(new ReviewFileListUpdateActionMessage());
  }

  async getReviewFileDetailList() {
    const result: ReviewFileItem[] = [];
    for (let i = 0; i < this.reviewDataList.length; i++) {
      const review = this.reviewDataList[i];
      const file = result.find((item) => item.path === review.selection.file);
      let problemNumber = 0;
      if (review.state === ReviewState.Finished) {
        if (review.result.parsed) {
          review.result.data.forEach((problemItem) => {
            if (problemItem.IsProblem) {
              problemNumber++;
            }
          });
        }
      }

      if (file) {
        file.total++;
        if (
          review.state === ReviewState.Finished ||
          review.state === ReviewState.Error
        ) {
          file.done++;
        }
        if (review.state === ReviewState.Finished) {
          file.problemNumber += problemNumber;
        }
      } else {
        result.push({
          path: review.selection.file,
          total: 1,
          done:
            review.state === ReviewState.Finished ||
            review.state === ReviewState.Error
              ? 1
              : 0,
          problemNumber,
        });
      }
    }
    return result;
  }

  async getFileReviewList(filePath: string) {
    return this.reviewDataList.filter(
      (review) => review.selection.file === filePath,
    );
  }
}

new ReviewProcess();
