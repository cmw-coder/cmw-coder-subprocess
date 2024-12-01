import {
  ExtraData,
  Feedback,
  Reference,
  ReviewData,
  ReviewResult,
  ReviewState,
  ReviewType,
  SelectionData,
} from 'types/review';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { ReviewMasterHandler } from 'types/ReviewHandler';
import { LocalReviewHistoryManager } from 'common/LocalReviewHistoryManager';

const REFRESH_TIME = 3000;

export class ReviewInstance {
  selectionData: SelectionData;
  timer?: NodeJS.Timeout;
  reviewId = uuidv4();
  serverTaskId = '';
  state: ReviewState = ReviewState.Queue;
  result?: ReviewResult;
  references: Reference[] = [];
  feedback = Feedback.None;
  comment = '';
  errorInfo = '';
  // 创建时间
  createTime = DateTime.now().valueOf() / 1000;
  // 开始运行时间
  startTime = DateTime.now().valueOf() / 1000;
  // 引用查找结束时间
  referenceTime = DateTime.now().valueOf() / 1000;
  // 流程终止时间
  endTime = DateTime.now().valueOf() / 1000;
  isRunning = false;
  onStart = () => {};
  onUpdate = () => {};
  onEnd = () => {};

  constructor(
    selectionData: SelectionData,
    private extraData: ExtraData,
    private proxyFn: ReviewMasterHandler,
    private localReviewHistoryManager: LocalReviewHistoryManager,
  ) {
    this.selectionData = selectionData;
  }

  async start() {
    this.isRunning = true;
    this.state = ReviewState.Ready;
    this.startTime = DateTime.now().valueOf() / 1000;
    this.onUpdate();
    const appConfig = await this.proxyFn.getConfig();
    this.references = await this.proxyFn.getReferences(this.selectionData);
    this.state = ReviewState.References;
    this.referenceTime = DateTime.now().valueOf() / 1000;
    this.onUpdate();
    try {
      this.serverTaskId = await this.proxyFn.api_code_review({
        productLine: appConfig.activeTemplate,
        profileModel: appConfig.activeModel,
        templateName: 'CodeReviewV1',
        references: this.references,
        target: {
          block: '',
          snippet: this.selectionData.content,
        },
        language: this.selectionData.language,
      });
      this.state = ReviewState.Start;
      this.onUpdate();
      this.timer = setInterval(() => {
        this.refreshReviewState();
      }, REFRESH_TIME);
    } catch (e) {
      this.state = ReviewState.Error;
      this.isRunning = false;
      this.endTime = DateTime.now().valueOf() / 1000;
      this.errorInfo = (e as Error).message;
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = undefined;
      }
      this.onUpdate();
      this.onEnd();
    }
    this.onStart();
  }

  async refreshReviewState() {
    try {
      this.state = await this.proxyFn.api_get_code_review_state(
        this.serverTaskId,
      );
      if (
        this.state === ReviewState.Third ||
        this.state === ReviewState.Finished
      ) {
        clearInterval(this.timer);
        this.isRunning = false;
        await this.getReviewResult();
        this.state = ReviewState.Finished;
        this.endTime = DateTime.now().valueOf() / 1000;
        this.saveReviewData().catch();
        this.onUpdate();
        this.onEnd();
      }
      if (this.state === ReviewState.Error) {
        clearInterval(this.timer);
        this.isRunning = false;
        await this.getReviewResult();
        this.endTime = DateTime.now().valueOf() / 1000;
        this.errorInfo = this.result ? this.result.originData : '';
        this.saveReviewData().catch();
        this.onUpdate();
        this.onEnd();
      }
    } catch (error) {
      if (this.timer) {
        clearInterval(this.timer);
      }
      this.isRunning = false;
      this.state = ReviewState.Error;
      this.endTime = DateTime.now().valueOf() / 1000;
      this.errorInfo = (error as Error).message;
      this.saveReviewData().catch();
      this.onUpdate();
      this.onEnd();
    }
  }

  async getReviewResult() {
    this.result = await this.proxyFn.api_get_code_review_result(
      this.serverTaskId,
    );
  }

  async saveReviewData() {
    const reviewData = this.getReviewData();
    return this.localReviewHistoryManager.saveReviewItem(reviewData);
  }

  getReviewData(): ReviewData {
    return {
      references: this.references,
      selectionData: this.selectionData,
      reviewId: this.reviewId,
      serverTaskId: this.serverTaskId,
      state: this.state,
      result: this.result ?? { parsed: false, data: [], originData: '' },
      feedback: this.feedback,
      errorInfo: this.errorInfo,
      extraData: this.extraData,
      reviewType: ReviewType.Function,
      isRunning: this.isRunning,
      createTime: this.createTime,
      startTime: this.startTime,
      endTime: this.endTime,
      referenceTime: this.referenceTime,
    };
  }

  async stop() {
    this.proxyFn.log('ReviewInstance.stop').catch();
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    if (
      this.state === ReviewState.Start ||
      this.state === ReviewState.First ||
      this.state === ReviewState.Second ||
      this.state === ReviewState.Third
    ) {
      try {
        await this.proxyFn.api_stop_review(this.serverTaskId);
      } catch (e) {
        this.proxyFn.log('stopReview.failed', e).catch();
      }
    }
    this.state = ReviewState.Error;
    this.errorInfo = 'USER STOPPED REVIEW TASK';
    this.onUpdate();
    this.onEnd();
  }
}
