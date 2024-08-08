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
const fs_1 = require("fs");
const web_tree_sitter_1 = __importDefault(require("web-tree-sitter"));
const iconv_lite_1 = require("iconv-lite");
const master_1 = require("../../types/master");
const utils_1 = require("../../common/utils");
const path_1 = __importDefault(require("path"));
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
        this.proxyFn.log(`review process started ${process.pid}`);
    }
    async getReviewData() {
        return this.activeReviewList.map((review) => review.getReviewData());
    }
    async getReviewFileList() {
        const resultMap = new Map();
        for (const review of this.activeReviewList) {
            const filePath = review.selection.file;
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
            if (review.selection.file === filePath) {
                reviewDataList.push(review.getReviewData());
            }
        }
        return reviewDataList;
    }
    async reviewProject({ projectDirPath, extraData, }) {
        this.isClearAll = false;
        const isExist = await fs_1.promises.stat(projectDirPath).catch(() => false);
        if (!isExist) {
            this.proxyFn.log(`project not exist: ${projectDirPath}`);
            return;
        }
        const fileList = await (0, utils_1.getFilesInDirectory)(projectDirPath);
        const cppFileList = fileList.filter((file) => path_1.default.extname(file) === '.c');
        this.proxyFn.log(`review project file num: ${cppFileList.length}`);
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
            this.proxyFn.log(`file not exist: ${filePath}`);
            return;
        }
        if (!this._parserInitialized) {
            this.proxyFn.log('parser not initialized');
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
                range: new master_1.Range(captures[0].node.startPosition.row, captures[0].node.startPosition.column, captures[0].node.endPosition.row, captures[0].node.endPosition.column),
                language: 'c',
            }));
            this.proxyFn.log(`review file: ${filePath} [Function number]: ${functionDefinitions.length}`);
            for (let i = 0; i < functionDefinitions.length; i++) {
                const functionDefinition = functionDefinitions[i];
                try {
                    await this.addReview({
                        selection: functionDefinition,
                        extraData: {
                            projectId: extraData.projectId,
                            version: extraData.version,
                        },
                    });
                }
                catch (e) {
                    this.proxyFn.log(`review file error: ${e}`);
                }
            }
        }
        catch (error) {
            this.proxyFn.log(`review file error: ${error}`);
            return;
        }
    }
    async addReview(data) {
        this.isClearAll = false;
        const review = new ReviewInstance_1.ReviewInstance(data.selection, data.extraData, this.proxyFn, this.localReviewHistoryManager);
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
            review.start();
        }
        this.proxyFn.reviewFileListUpdated();
    }
    async stopReview(reviewId) {
        this.proxyFn.log(`stop review: ${reviewId}`);
        const review = this.activeReviewList.find((review) => review.reviewId === reviewId);
        if (review) {
            review.stop();
        }
    }
    async delReview(reviewId) {
        this.proxyFn.log(`del review: ${reviewId}`);
        const reviewIndex = this.activeReviewList.findIndex((review) => review.reviewId === reviewId);
        if (reviewIndex !== -1) {
            await this.activeReviewList[reviewIndex].stop();
        }
        this.activeReviewList.splice(reviewIndex, 1);
    }
    async delReviewByFile(filePath) {
        this.proxyFn.log(`del review by file: ${filePath}`);
        const fileReviewList = this.activeReviewList.filter((review) => review.selection.file === filePath);
        this.activeReviewList = this.activeReviewList.filter((review) => review.selection.file !== filePath);
        for (let i = 0; i < fileReviewList.length; i++) {
            const review = fileReviewList[i];
            if (review.isRunning) {
                review.stop();
            }
        }
    }
    async retryReview(reviewId) {
        this.proxyFn.log(`retry review: ${reviewId}`);
        const review = this.activeReviewList.find((review) => review.reviewId === reviewId);
        if (review) {
            await review.stop();
            review.start();
        }
    }
    async setReviewFeedback(data) {
        this.proxyFn.api_feedback_review(data);
        const review = this.activeReviewList.find((review) => review.serverTaskId === data.serverTaskId);
        if (review) {
            review.feedback = data.feedback;
            review.comment = data.comment;
            review.saveReviewData();
            review.onUpdate();
        }
    }
    async clearReview() {
        this.proxyFn.log(`clear review`);
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
