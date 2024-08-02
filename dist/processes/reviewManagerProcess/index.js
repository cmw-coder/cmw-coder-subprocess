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
        this.localReviewHistoryManager = new LocalReviewHistoryManager_1.LocalReviewHistoryManager(argv.historyDir, this.proxyFn);
        web_tree_sitter_1.default.init().then(() => (this._parserInitialized = true));
    }
    get runningReviewList() {
        return this.activeReviewList.filter((review) => review.isRunning);
    }
    get reviewDataList() {
        return this.activeReviewList.map((review) => review.getReviewData());
    }
    async getReviewData() {
        return this.reviewDataList;
    }
    async getReviewFileList() {
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
    async reviewFile({ filePath, extraData, }) {
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
        const treeSitterFolder = await this.proxyFn.getTreeSitterFolder();
        try {
            const parser = new web_tree_sitter_1.default();
            const language = await web_tree_sitter_1.default.Language.load(`${treeSitterFolder}/tree-sitter-c.wasm`);
            parser.setLanguage(language);
            const functionDefinitionQuery = language.query('(function_definition) @definition');
            const tree = parser.parse(fileContent);
            const matches = functionDefinitionQuery.matches(tree.rootNode);
            const functionDefinitions = matches.map(({ captures }) => ({
                block: fileContent.slice(captures[0].node.startIndex, captures[0].node.endIndex),
                file: filePath,
                content: fileContent.slice(captures[0].node.startIndex, captures[0].node.endIndex),
                range: new master_1.Range(captures[0].node.startPosition.row, captures[0].node.startPosition.column, captures[0].node.endPosition.row, captures[0].node.endPosition.column),
                language: 'c',
            }));
            functionDefinitions.map((functionDefinition) => {
                this.addReview({
                    selection: functionDefinition,
                    extraData: {
                        projectId: extraData.projectId,
                        version: extraData.version,
                    },
                });
            });
        }
        catch (error) {
            this.proxyFn.log(`review file error: ${error}`);
            return;
        }
    }
    async reviewProject({ projectDirPath, extraData, }) {
        const isExist = await fs_1.promises.stat(projectDirPath).catch(() => false);
        if (!isExist) {
            this.proxyFn.log(`project not exist: ${projectDirPath}`);
            return;
        }
        const fileList = await (0, utils_1.getFilesInDirectory)(projectDirPath);
        const cppFileList = fileList.filter((file) => path_1.default.extname(file) === '.c');
        for (let i = 0; i < cppFileList.length; i++) {
            const file = cppFileList[i];
            await (0, utils_1.timeout)(1000);
            await this.reviewFile({
                filePath: file,
                extraData,
            });
        }
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
    async stopReview(reviewId) {
        const review = this.activeReviewList.find((review) => review.reviewId === reviewId);
        if (review) {
            review.stop();
        }
    }
    async delReview(reviewId) {
        const review = this.activeReviewList.find((review) => review.reviewId === reviewId);
        if (review) {
            review.stop();
        }
        this.activeReviewList = this.activeReviewList.filter((review) => review.reviewId !== reviewId);
    }
    async retryReview(reviewId) {
        const review = this.activeReviewList.find((review) => review.reviewId === reviewId);
        if (review) {
            await review.stop();
            review.start();
        }
    }
    async setReviewFeedback(data) {
        this.proxyFn.log(`setReviewFeedback: ${data.reviewId} ${data.feedback} ${data.comment}`);
    }
}
new ReviewProcess();
