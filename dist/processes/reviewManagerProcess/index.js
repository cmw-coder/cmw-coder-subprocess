"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MessageProxy_1 = require("../../common/MessageProxy");
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const LocalReviewHistoryManager_1 = require("../../common/LocalReviewHistoryManager");
const ReviewInstance_1 = require("../reviewManagerProcess/ReviewInstance");
const review_1 = require("../../types/review");
const MAX_RUNNING_REVIEW_COUNT = 10;
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv)).argv;
class ReviewProcess extends MessageProxy_1.MessageToMasterProxy {
    constructor() {
        super();
        this.activeReviewList = [];
        this.localReviewHistoryManager = new LocalReviewHistoryManager_1.LocalReviewHistoryManager(argv.historyDir, this.proxyFn);
    }
    get runningReviewList() {
        return this.activeReviewList.filter((review) => review.isRunning);
    }
    get reviewDataList() {
        return this.activeReviewList.map((review) => review.getReviewData());
    }
    stopReview(reviewId) {
        const review = this.activeReviewList.find((review) => review.reviewId === reviewId);
        if (review) {
            review.stop();
        }
    }
    delReview(reviewId) {
        const review = this.activeReviewList.find((review) => review.reviewId === reviewId);
        if (review) {
            review.stop();
        }
        this.activeReviewList = this.activeReviewList.filter((review) => review.reviewId !== reviewId);
    }
    async addReview(data) {
        const review = new ReviewInstance_1.ReviewInstance(data.selection, data.extraData, this.proxyFn, this.localReviewHistoryManager);
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
                const queueReviewList = this.activeReviewList.filter((_review) => _review.state === review_1.ReviewState.Queue);
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
        const result = [];
        for (let i = 0; i < this.reviewDataList.length; i++) {
            const review = this.reviewDataList[i];
            const file = result.find((item) => item.path === review.selection.file);
            let problemNumber = 0;
            if (review.state === review_1.ReviewState.Finished) {
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
                if (review.state === review_1.ReviewState.Finished ||
                    review.state === review_1.ReviewState.Error) {
                    file.done++;
                }
                if (review.state === review_1.ReviewState.Finished) {
                    file.problemNumber += problemNumber;
                }
            }
            else {
                result.push({
                    path: review.selection.file,
                    total: 1,
                    done: review.state === review_1.ReviewState.Finished ||
                        review.state === review_1.ReviewState.Error
                        ? 1
                        : 0,
                    problemNumber,
                });
            }
        }
        return result;
    }
    async getFileReviewList(filePath) {
        return this.reviewDataList.filter((review) => review.selection.file === filePath);
    }
}
new ReviewProcess();
