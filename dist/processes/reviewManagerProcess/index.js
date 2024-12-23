"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const iconv_lite_1 = require("iconv-lite");
const path_1 = __importDefault(require("path"));
const web_tree_sitter_1 = __importDefault(require("web-tree-sitter"));
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const LocalReviewHistoryManager_1 = require("../../common/LocalReviewHistoryManager");
const MessageProxy_1 = require("../../common/MessageProxy");
const utils_1 = require("../../common/utils");
const ReviewInstance_1 = require("../reviewManagerProcess/ReviewInstance");
const common_1 = require("../../types/common");
const review_1 = require("../../types/review");
const MAX_RUNNING_REVIEW_COUNT = 10;
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv)).argv;
class ReviewProcess extends MessageProxy_1.MessageToMasterProxy {
    constructor() {
        super();
        this._parserInitialized = false;
        this.activeReviewList = [];
        this.cppParser = undefined;
        this.cppParserLanguage = undefined;
        this.localReviewHistoryManager = new LocalReviewHistoryManager_1.LocalReviewHistoryManager(argv.historyDir, this.proxyFn);
        this.isClearAll = false;
        web_tree_sitter_1.default.init().then(() => (this._parserInitialized = true));
        this.proxyFn.log(`review process started ${process.pid}`).catch();
    }
    async getReviewData() {
        return this.activeReviewList.map((review) => review.getReviewData());
    }
    async getReviewFileList() {
        const resultMap = new Map();
        for (const review of this.activeReviewList) {
            const filePath = review.selectionData.file;
            let file = resultMap.get(filePath);
            let problemNumber = 0;
            if (review.state === review_1.ReviewState.Finished && review.result?.parsed) {
                problemNumber = review.result.data.filter((problemItem) => problemItem.IsProblem).length;
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
                resultMap.set(filePath, {
                    path: filePath,
                    total: 1,
                    done: review.state === review_1.ReviewState.Finished ||
                        review.state === review_1.ReviewState.Error
                        ? 1
                        : 0,
                    problemNumber,
                });
            }
        }
        return Array.from(resultMap.values());
    }
    async getFileReviewList(filePath) {
        const reviewDataList = [];
        for (const review of this.activeReviewList) {
            if (review.selectionData.file === filePath) {
                reviewDataList.push(review.getReviewData());
            }
        }
        return reviewDataList;
    }
    async reviewProject({ projectDirPath, extraData, }) {
        this.isClearAll = false;
        const isExist = await fs_1.promises.stat(projectDirPath).catch(() => false);
        if (!isExist) {
            this.proxyFn.log(`project not exist: ${projectDirPath}`).catch();
            return;
        }
        const fileList = await (0, utils_1.getFilesInDirectory)(projectDirPath);
        const cppFileList = fileList.filter((file) => path_1.default.extname(file) === '.c');
        this.proxyFn.log(`review project file num: ${cppFileList.length}`).catch();
        for (let i = 0; i < cppFileList.length; i++) {
            if (this.isClearAll) {
                break;
            }
            const file = cppFileList[i];
            await this.reviewFile({
                filePath: file,
                extraData,
            });
            await (0, utils_1.timeout)(2000);
        }
    }
    async reviewFile({ filePath, extraData, }) {
        this.isClearAll = false;
        const isExist = await fs_1.promises.stat(filePath).catch(() => false);
        if (!isExist) {
            this.proxyFn.log(`file not exist: ${filePath}`).catch();
            return;
        }
        if (!this._parserInitialized) {
            this.proxyFn.log('parser not initialized').catch();
            return;
        }
        const fileBuffer = await fs_1.promises.readFile(filePath);
        const fileContent = (0, iconv_lite_1.decode)(fileBuffer, 'gbk');
        try {
            if (!this.cppParser || !this.cppParserLanguage) {
                this.cppParser = new web_tree_sitter_1.default();
                const scriptDir = await this.proxyFn.getScriptDir();
                this.cppParserLanguage = await web_tree_sitter_1.default.Language.load(`${scriptDir}/dist/public/tree-sitter/tree-sitter-c.wasm`);
                this.cppParser.setLanguage(this.cppParserLanguage);
            }
            const functionDefinitionQuery = this.cppParserLanguage.query('(function_definition) @definition');
            const tree = this.cppParser.parse(fileContent);
            const matches = functionDefinitionQuery.matches(tree.rootNode);
            const functionDefinitions = matches.map(({ captures }) => ({
                block: fileContent.slice(captures[0].node.startIndex, captures[0].node.endIndex),
                file: filePath,
                content: fileContent.slice(captures[0].node.startIndex, captures[0].node.endIndex),
                range: new common_1.Selection(new common_1.CaretPosition(captures[0].node.startPosition.row, captures[0].node.startPosition.column), new common_1.CaretPosition(captures[0].node.endPosition.row, captures[0].node.endPosition.column)),
                language: 'c',
            }));
            this.proxyFn
                .log(`review file: ${filePath} [Function number]: ${functionDefinitions.length}`)
                .catch();
            for (let i = 0; i < functionDefinitions.length; i++) {
                const functionDefinition = functionDefinitions[i];
                try {
                    await this.addReview({
                        selectionData: functionDefinition,
                        extraData: {
                            projectId: extraData.projectId,
                            version: extraData.version,
                        },
                    });
                }
                catch (e) {
                    this.proxyFn.log(`review file error: ${e}`).catch();
                }
            }
        }
        catch (error) {
            this.proxyFn.log(`review file error: ${error}`).catch();
            return;
        }
    }
    async addReview(data) {
        this.isClearAll = false;
        const review = new ReviewInstance_1.ReviewInstance(data.selectionData, data.extraData, this.proxyFn, this.localReviewHistoryManager);
        this.activeReviewList.push(review);
        review.onStart = () => {
            this.proxyFn.reviewDataUpdated(review.reviewId);
        };
        review.onUpdate = () => {
            this.proxyFn.reviewDataUpdated(review.reviewId);
        };
        review.onEnd = () => {
            this.proxyFn.reviewDataUpdated(review.reviewId);
            const runningReviewList = this.activeReviewList.filter((review) => review.isRunning);
            if (runningReviewList.length < MAX_RUNNING_REVIEW_COUNT) {
                // 跑下一个任务
                const queueReviewList = this.activeReviewList.filter((_review) => _review.state === review_1.ReviewState.Queue);
                if (queueReviewList.length > 0) {
                    const nextReview = queueReviewList[0];
                    nextReview.start();
                }
            }
        };
        const runningReviewList = this.activeReviewList.filter((review) => review.isRunning);
        if (runningReviewList.length < MAX_RUNNING_REVIEW_COUNT) {
            review.start().catch();
        }
        this.proxyFn.reviewFileListUpdated().catch();
    }
    async stopReview(reviewId) {
        this.proxyFn.log(`stop review: ${reviewId}`).catch();
        const review = this.activeReviewList.find((review) => review.reviewId === reviewId);
        if (review) {
            review.stop().catch();
        }
    }
    async delReview(reviewId) {
        this.proxyFn.log(`del review: ${reviewId}`).catch();
        const reviewIndex = this.activeReviewList.findIndex((review) => review.reviewId === reviewId);
        if (reviewIndex !== -1) {
            await this.activeReviewList[reviewIndex].stop();
        }
        this.activeReviewList.splice(reviewIndex, 1);
    }
    async delReviewByFile(filePath) {
        this.proxyFn.log(`del review by file: ${filePath}`).catch();
        const fileReviewList = this.activeReviewList.filter((review) => review.selectionData.file === filePath);
        this.activeReviewList = this.activeReviewList.filter((review) => review.selectionData.file !== filePath);
        for (let i = 0; i < fileReviewList.length; i++) {
            const review = fileReviewList[i];
            if (review.isRunning) {
                review.stop().catch();
            }
        }
    }
    async retryReview(reviewId) {
        this.proxyFn.log(`retry review: ${reviewId}`).catch();
        const review = this.activeReviewList.find((review) => review.reviewId === reviewId);
        if (review) {
            await review.stop();
            review.start().catch();
        }
    }
    async setReviewFeedback(data) {
        this.proxyFn.api_feedback_review(data).catch();
        const review = this.activeReviewList.find((review) => review.serverTaskId === data.serverTaskId);
        if (review) {
            review.feedback = data.feedback;
            review.comment = data.comment;
            review.saveReviewData().catch();
            review.onUpdate();
        }
    }
    async clearReview() {
        this.proxyFn.log(`clear review`).catch();
        const runningReviewList = this.activeReviewList.filter((review) => review.isRunning);
        for (let i = 0; i < runningReviewList.length; i++) {
            const review = runningReviewList[i];
            if (review.isRunning) {
                await review.stop();
            }
        }
        this.activeReviewList = [];
        this.isClearAll = true;
    }
    async getReviewFileContent(name) {
        return this.localReviewHistoryManager.getReviewFileContent(name);
    }
    async getReviewHistoryFiles() {
        return this.localReviewHistoryManager.getReviewHistoryFiles();
    }
}
new ReviewProcess();
