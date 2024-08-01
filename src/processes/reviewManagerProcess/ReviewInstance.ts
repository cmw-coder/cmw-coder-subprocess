import {
  api_code_review,
  api_get_code_review_result,
  api_get_code_review_state,
  api_stop_review,
} from 'request/review';
import {
  ExtraData,
  Selection,
  Feedback,
  Reference,
  ReviewData,
  ReviewResult,
  ReviewState,
  ReviewType,
} from 'types/review';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { ReviewMasterHandlerMap } from 'types/ReviewHandlerMap';

const REFRESH_TIME = 3000;

export class ReviewInstance {
  timer?: NodeJS.Timeout;
  reviewId = uuidv4();
  serverTaskId = '';
  state: ReviewState = ReviewState.Queue;
  result?: ReviewResult;
  references: Reference[] = [];
  feedback = Feedback.None;
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
    private selection: Selection,
    private extraData: ExtraData,
    private proxyFn: ReviewMasterHandlerMap,
  ) {}

  async start() {
    this.isRunning = true;
    this.state = ReviewState.Ready;
    this.startTime = DateTime.now().valueOf() / 1000;
    this.onUpdate();
    const appConfig = await this.proxyFn.getConfig();
    this.references = await this.proxyFn.getReferences(this.selection);
    this.state = ReviewState.References;
    this.referenceTime = DateTime.now().valueOf() / 1000;
    this.onUpdate();
    try {
      this.serverTaskId = await api_code_review({
        productLine: appConfig.activeTemplate,
        profileModel: appConfig.activeModel,
        templateName: 'CodeReviewV1',
        references: this.references,
        target: {
          block: '',
          snippet: this.selection.content,
        },
        language: this.selection.language,
      });
      this.state = ReviewState.Start;
      this.onUpdate();
      this.timer = setInterval(() => {
        this.refreshReviewState();
      }, REFRESH_TIME);
    } catch (e) {
      log.error(e);
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
      this.state = await api_get_code_review_state(this.serverTaskId);
      if (
        this.state === ReviewState.Third ||
        this.state === ReviewState.Finished
      ) {
        clearInterval(this.timer);
        this.isRunning = false;
        await this.getReviewResult();
        this.state = ReviewState.Finished;
        this.endTime = DateTime.now().valueOf() / 1000;
        this.saveReviewData();
        this.onUpdate();
        this.onEnd();
      }
      if (this.state === ReviewState.Error) {
        clearInterval(this.timer);
        this.isRunning = false;
        await this.getReviewResult();
        this.endTime = DateTime.now().valueOf() / 1000;
        this.errorInfo = this.result ? this.result.originData : '';
        this.saveReviewData();
        this.onUpdate();
        this.onEnd();
      }
    } catch (error) {
      log.error(error);
      if (this.timer) {
        clearInterval(this.timer);
      }
      this.isRunning = false;
      this.state = ReviewState.Error;
      this.endTime = DateTime.now().valueOf() / 1000;
      this.errorInfo = (error as Error).message;
      this.saveReviewData();
      this.onUpdate();
      this.onEnd();
    }
  }

  async getReviewResult() {
    this.result = await api_get_code_review_result(this.serverTaskId);
  }

  saveReviewData() {
    const reviewData = this.getReviewData();
    const dataStoreService = container.get<DataStoreService>(
      ServiceType.DATA_STORE,
    );
    const now = DateTime.now();
    const nowStr = now.toFormat('yyyy-MM-dd');
    dataStoreService.localReviewHistoryManager.saveReviewItem(
      nowStr,
      reviewData,
    );
  }

  getReviewData() {
    return {
      reviewId: this.reviewId,
      serverTaskId: this.serverTaskId,
      state: this.state,
      result: this.result,
      references: this.references,
      selection: this.selection,
      feedback: this.feedback,
      errorInfo: this.errorInfo,
      extraData: this.extraData,
      createTime: this.createTime,
      startTime: this.startTime,
      endTime: this.endTime,
      referenceTime: this.referenceTime,
      isRunning: this.isRunning,
    } as ReviewData;
  }

  async stop() {
    clearInterval(this.timer);
    if (this.state === ReviewState.Start) {
      try {
        await api_stop_review(this.serverTaskId);
      } catch (e) {
        log.error('stopReview.failed', e);
      }
    }
    this.state = ReviewState.Error;
    this.errorInfo = 'USER STOPPED REVIEW TASK';
    this.onUpdate();
    this.onEnd();
  }
}
