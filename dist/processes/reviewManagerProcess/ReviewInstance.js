"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewInstance = void 0;
const review_1 = require("../../types/review");
const luxon_1 = require("luxon");
const uuid_1 = require("uuid");
const REFRESH_TIME = 3000;
class ReviewInstance {
    constructor(selectionData, extraData, proxyFn, localReviewHistoryManager) {
        this.extraData = extraData;
        this.proxyFn = proxyFn;
        this.localReviewHistoryManager = localReviewHistoryManager;
        this.reviewId = (0, uuid_1.v4)();
        this.serverTaskId = '';
        this.state = review_1.ReviewState.Queue;
        this.references = [];
        this.feedback = review_1.Feedback.None;
        this.comment = '';
        this.errorInfo = '';
        // 创建时间
        this.createTime = luxon_1.DateTime.now().valueOf() / 1000;
        // 开始运行时间
        this.startTime = luxon_1.DateTime.now().valueOf() / 1000;
        // 引用查找结束时间
        this.referenceTime = luxon_1.DateTime.now().valueOf() / 1000;
        // 流程终止时间
        this.endTime = luxon_1.DateTime.now().valueOf() / 1000;
        this.isRunning = false;
        this.onStart = () => { };
        this.onUpdate = () => { };
        this.onEnd = () => { };
        this.selectionData = selectionData;
    }
    async start() {
        this.isRunning = true;
        this.state = review_1.ReviewState.Ready;
        this.startTime = luxon_1.DateTime.now().valueOf() / 1000;
        this.onUpdate();
        const appConfig = await this.proxyFn.getConfig();
        this.references = await this.proxyFn.getReferences(this.selectionData);
        this.state = review_1.ReviewState.References;
        this.referenceTime = luxon_1.DateTime.now().valueOf() / 1000;
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
            this.state = review_1.ReviewState.Start;
            this.onUpdate();
            this.timer = setInterval(() => {
                this.refreshReviewState();
            }, REFRESH_TIME);
        }
        catch (e) {
            this.state = review_1.ReviewState.Error;
            this.isRunning = false;
            this.endTime = luxon_1.DateTime.now().valueOf() / 1000;
            this.errorInfo = e.message;
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
            this.state = await this.proxyFn.api_get_code_review_state(this.serverTaskId);
            if (this.state === review_1.ReviewState.Third ||
                this.state === review_1.ReviewState.Finished) {
                clearInterval(this.timer);
                this.isRunning = false;
                await this.getReviewResult();
                this.state = review_1.ReviewState.Finished;
                this.endTime = luxon_1.DateTime.now().valueOf() / 1000;
                this.saveReviewData().catch();
                this.onUpdate();
                this.onEnd();
            }
            if (this.state === review_1.ReviewState.Error) {
                clearInterval(this.timer);
                this.isRunning = false;
                await this.getReviewResult();
                this.endTime = luxon_1.DateTime.now().valueOf() / 1000;
                this.errorInfo = this.result ? this.result.originData : '';
                this.saveReviewData().catch();
                this.onUpdate();
                this.onEnd();
            }
        }
        catch (error) {
            if (this.timer) {
                clearInterval(this.timer);
            }
            this.isRunning = false;
            this.state = review_1.ReviewState.Error;
            this.endTime = luxon_1.DateTime.now().valueOf() / 1000;
            this.errorInfo = error.message;
            this.saveReviewData().catch();
            this.onUpdate();
            this.onEnd();
        }
    }
    async getReviewResult() {
        this.result = await this.proxyFn.api_get_code_review_result(this.serverTaskId);
    }
    async saveReviewData() {
        const reviewData = this.getReviewData();
        return this.localReviewHistoryManager.saveReviewItem(reviewData);
    }
    getReviewData() {
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
            reviewType: review_1.ReviewType.Function,
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
        if (this.state === review_1.ReviewState.Start ||
            this.state === review_1.ReviewState.First ||
            this.state === review_1.ReviewState.Second ||
            this.state === review_1.ReviewState.Third) {
            try {
                await this.proxyFn.api_stop_review(this.serverTaskId);
            }
            catch (e) {
                this.proxyFn.log('stopReview.failed', e).catch();
            }
        }
        this.state = review_1.ReviewState.Error;
        this.errorInfo = 'USER STOPPED REVIEW TASK';
        this.onUpdate();
        this.onEnd();
    }
}
exports.ReviewInstance = ReviewInstance;
