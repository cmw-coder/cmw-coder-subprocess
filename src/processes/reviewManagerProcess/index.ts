import { promises } from 'fs';
import { decode } from 'iconv-lite';
import path from 'path';
import Parser from 'web-tree-sitter';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { LocalReviewHistoryManager } from 'common/LocalReviewHistoryManager';
import { MessageToMasterProxy } from 'common/MessageProxy';
import { getFilesInDirectory, timeout } from 'common/utils';
import { ReviewInstance } from 'processes/reviewManagerProcess/ReviewInstance';
import { ReviewProcessArgv } from 'types/argv';
import { CaretPosition, Selection } from 'types/common';
import {
  ExtraData,
  Feedback,
  ReviewData,
  ReviewFileItem,
  ReviewState,
  SelectionData,
} from 'types/review';
import { ReviewChildHandler, ReviewMasterHandler } from 'types/ReviewHandler';

const MAX_RUNNING_REVIEW_COUNT = 10;

const argv = yargs(hideBin(process.argv)).argv as unknown as ReviewProcessArgv;

class ReviewProcess
  extends MessageToMasterProxy<ReviewMasterHandler>
  implements ReviewChildHandler
{
  private _parserInitialized = false;
  private activeReviewList: ReviewInstance[] = [];
  private cppParser: Parser | undefined = undefined;
  private cppParserLanguage: Parser.Language | undefined = undefined;
  private localReviewHistoryManager = new LocalReviewHistoryManager(
    argv.historyDir,
    this.proxyFn,
  );
  private isClearAll = false;
  constructor() {
    super();
    Parser.init().then(() => (this._parserInitialized = true));
    this.proxyFn.log(`review process started ${process.pid}`).catch();
  }

  async getReviewData(): Promise<ReviewData[]> {
    return this.activeReviewList.map((review) => review.getReviewData());
  }

  async getReviewFileList(): Promise<ReviewFileItem[]> {
    const resultMap: Map<string, ReviewFileItem> = new Map();

    for (const review of this.activeReviewList) {
      const filePath = review.selectionData.file;
      let file = resultMap.get(filePath);
      let problemNumber = 0;

      if (review.state === ReviewState.Finished && review.result?.parsed) {
        problemNumber = review.result.data.filter(
          (problemItem) => problemItem.IsProblem,
        ).length;
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
        resultMap.set(filePath, {
          path: filePath,
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

    return Array.from(resultMap.values());
  }

  async getFileReviewList(filePath: string) {
    const reviewDataList = [];
    for (const review of this.activeReviewList) {
      if (review.selectionData.file === filePath) {
        reviewDataList.push(review.getReviewData());
      }
    }
    return reviewDataList;
  }

  async reviewProject({
    projectDirPath,
    extraData,
  }: {
    projectDirPath: string;
    extraData: ExtraData;
  }) {
    this.isClearAll = false;
    const isExist = await promises.stat(projectDirPath).catch(() => false);
    if (!isExist) {
      this.proxyFn.log(`project not exist: ${projectDirPath}`).catch();
      return;
    }
    const fileList = await getFilesInDirectory(projectDirPath);
    const cppFileList = fileList.filter((file) => path.extname(file) === '.c');
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
      await timeout(2000);
    }
  }

  async reviewFile({
    filePath,
    extraData,
  }: {
    filePath: string;
    extraData: ExtraData;
  }): Promise<any> {
    this.isClearAll = false;
    const isExist = await promises.stat(filePath).catch(() => false);
    if (!isExist) {
      this.proxyFn.log(`file not exist: ${filePath}`).catch();
      return;
    }
    if (!this._parserInitialized) {
      this.proxyFn.log('parser not initialized').catch();
      return;
    }
    const fileBuffer = await promises.readFile(filePath);
    const fileContent = decode(fileBuffer, 'gbk');
    try {
      if (!this.cppParser || !this.cppParserLanguage) {
        this.cppParser = new Parser();
        const scriptDir = await this.proxyFn.getScriptDir();
        this.cppParserLanguage = await Parser.Language.load(
          `${scriptDir}/dist/public/tree-sitter/tree-sitter-c.wasm`,
        );
        this.cppParser.setLanguage(this.cppParserLanguage);
      }
      const functionDefinitionQuery = this.cppParserLanguage.query(
        '(function_definition) @definition',
      );
      const tree = this.cppParser.parse(fileContent);
      const matches = functionDefinitionQuery.matches(tree.rootNode);
      const functionDefinitions = matches.map(
        ({ captures }): SelectionData => ({
          block: fileContent.slice(
            captures[0].node.startIndex,
            captures[0].node.endIndex,
          ),
          file: filePath,
          content: fileContent.slice(
            captures[0].node.startIndex,
            captures[0].node.endIndex,
          ),
          range: new Selection(
            new CaretPosition(
              captures[0].node.startPosition.row,
              captures[0].node.startPosition.column,
            ),
            new CaretPosition(
              captures[0].node.endPosition.row,
              captures[0].node.endPosition.column,
            ),
          ),
          language: 'c',
        }),
      );
      this.proxyFn
        .log(
          `review file: ${filePath} [Function number]: ${functionDefinitions.length}`,
        )
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
        } catch (e) {
          this.proxyFn.log(`review file error: ${e}`).catch();
        }
      }
    } catch (error) {
      this.proxyFn.log(`review file error: ${error}`).catch();
      return;
    }
  }

  async addReview(data: {
    selectionData: SelectionData;
    extraData: ExtraData;
  }) {
    this.isClearAll = false;
    const review = new ReviewInstance(
      data.selectionData,
      data.extraData,
      this.proxyFn,
      this.localReviewHistoryManager,
    );
    this.activeReviewList.push(review);
    review.onStart = () => {
      this.proxyFn.reviewDataUpdated(review.reviewId);
    };
    review.onUpdate = () => {
      this.proxyFn.reviewDataUpdated(review.reviewId);
    };
    review.onEnd = () => {
      this.proxyFn.reviewDataUpdated(review.reviewId);
      const runningReviewList = this.activeReviewList.filter(
        (review) => review.isRunning,
      );
      if (runningReviewList.length < MAX_RUNNING_REVIEW_COUNT) {
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
    const runningReviewList = this.activeReviewList.filter(
      (review) => review.isRunning,
    );
    if (runningReviewList.length < MAX_RUNNING_REVIEW_COUNT) {
      review.start().catch();
    }
    this.proxyFn.reviewFileListUpdated().catch();
  }

  async stopReview(reviewId: string) {
    this.proxyFn.log(`stop review: ${reviewId}`).catch();
    const review = this.activeReviewList.find(
      (review) => review.reviewId === reviewId,
    );
    if (review) {
      review.stop().catch();
    }
  }

  async delReview(reviewId: string) {
    this.proxyFn.log(`del review: ${reviewId}`).catch();
    const reviewIndex = this.activeReviewList.findIndex(
      (review) => review.reviewId === reviewId,
    );
    if (reviewIndex !== -1) {
      await this.activeReviewList[reviewIndex].stop();
    }
    this.activeReviewList.splice(reviewIndex, 1);
  }

  async delReviewByFile(filePath: string): Promise<any> {
    this.proxyFn.log(`del review by file: ${filePath}`).catch();
    const fileReviewList = this.activeReviewList.filter(
      (review) => review.selectionData.file === filePath,
    );
    this.activeReviewList = this.activeReviewList.filter(
      (review) => review.selectionData.file !== filePath,
    );

    for (let i = 0; i < fileReviewList.length; i++) {
      const review = fileReviewList[i];
      if (review.isRunning) {
        review.stop().catch();
      }
    }
  }

  async retryReview(reviewId: string): Promise<any> {
    this.proxyFn.log(`retry review: ${reviewId}`).catch();
    const review = this.activeReviewList.find(
      (review) => review.reviewId === reviewId,
    );
    if (review) {
      await review.stop();
      review.start().catch();
    }
  }

  async setReviewFeedback(data: {
    serverTaskId: string;
    userId: string;
    feedback: Feedback;
    timestamp: number;
    comment: string;
  }): Promise<any> {
    this.proxyFn.api_feedback_review(data).catch();
    const review = this.activeReviewList.find(
      (review) => review.serverTaskId === data.serverTaskId,
    );
    if (review) {
      review.feedback = data.feedback;
      review.comment = data.comment;
      review.saveReviewData().catch();
      review.onUpdate();
    }
  }

  async clearReview(): Promise<any> {
    this.proxyFn.log(`clear review`).catch();
    const runningReviewList = this.activeReviewList.filter(
      (review) => review.isRunning,
    );
    for (let i = 0; i < runningReviewList.length; i++) {
      const review = runningReviewList[i];
      if (review.isRunning) {
        await review.stop();
      }
    }
    this.activeReviewList = [];
    this.isClearAll = true;
  }

  async getReviewFileContent(name: string): Promise<ReviewData[]> {
    return this.localReviewHistoryManager.getReviewFileContent(name);
  }

  async getReviewHistoryFiles(): Promise<string[]> {
    return this.localReviewHistoryManager.getReviewHistoryFiles();
  }
}

new ReviewProcess();
