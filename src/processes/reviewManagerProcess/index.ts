import { MessageToMasterProxy } from 'common/MessageProxy';
import { ReviewChildHandler, ReviewMasterHandler } from 'types/ReviewHandler';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ReviewProcessArgv } from 'types/argv';
import { LocalReviewHistoryManager } from 'common/LocalReviewHistoryManager';
import { ReviewInstance } from 'processes/reviewManagerProcess/ReviewInstance';
import {
  ExtraData,
  Feedback,
  ReviewData,
  ReviewFileItem,
  ReviewState,
  Selection,
} from 'types/review';
import { promises } from 'fs';
import Parser from 'web-tree-sitter';
import { decode } from 'iconv-lite';
import { Range } from 'types/master';
import { getFilesInDirectory, timeout } from 'common/utils';
import path from 'path';

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
    this.proxyFn.log(`review process started ${process.pid}`);
  }

  get runningReviewList() {
    return this.activeReviewList.filter((review) => review.isRunning);
  }

  get reviewDataList() {
    return this.activeReviewList.map((review) => review.getReviewData());
  }

  async getReviewData(): Promise<ReviewData[]> {
    return this.reviewDataList;
  }

  async getReviewFileList(): Promise<ReviewFileItem[]> {
    const resultMap: Map<string, ReviewFileItem> = new Map();

    for (const review of this.reviewDataList) {
      const filePath = review.selection.file;
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
    return this.reviewDataList.filter(
      (review) => review.selection.file === filePath,
    );
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
      this.proxyFn.log(`project not exist: ${projectDirPath}`);
      return;
    }
    const fileList = await getFilesInDirectory(projectDirPath);
    const cppFileList = fileList.filter((file) => path.extname(file) === '.c');
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
      this.proxyFn.log(`file not exist: ${filePath}`);
      return;
    }
    if (!this._parserInitialized) {
      this.proxyFn.log('parser not initialized');
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
        ({ captures }): Selection => ({
          block: fileContent.slice(
            captures[0].node.startIndex,
            captures[0].node.endIndex,
          ),
          file: filePath,
          content: fileContent.slice(
            captures[0].node.startIndex,
            captures[0].node.endIndex,
          ),
          range: new Range(
            captures[0].node.startPosition.row,
            captures[0].node.startPosition.column,
            captures[0].node.endPosition.row,
            captures[0].node.endPosition.column,
          ),
          language: 'c',
        }),
      );
      this.proxyFn.log(
        `review file: ${filePath} [Function number]: ${functionDefinitions.length}`,
      );
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
        } catch (e) {
          this.proxyFn.log(`review file error: ${e}`);
        }
      }
    } catch (error) {
      this.proxyFn.log(`review file error: ${error}`);
      return;
    }
  }

  async addReview(data: { selection: Selection; extraData: ExtraData }) {
    this.isClearAll = false;
    const review = new ReviewInstance(
      data.selection,
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
    this.proxyFn.reviewFileListUpdated();
  }

  async stopReview(reviewId: string) {
    this.proxyFn.log(`stop review: ${reviewId}`);
    const review = this.activeReviewList.find(
      (review) => review.reviewId === reviewId,
    );
    if (review) {
      review.stop();
    }
  }

  async delReview(reviewId: string) {
    this.proxyFn.log(`del review: ${reviewId}`);
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

  async retryReview(reviewId: string): Promise<any> {
    this.proxyFn.log(`retry review: ${reviewId}`);
    const review = this.activeReviewList.find(
      (review) => review.reviewId === reviewId,
    );
    if (review) {
      await review.stop();
      review.start();
    }
  }

  async setReviewFeedback(data: {
    reviewId: string;
    feedback: Feedback;
    comment?: string;
  }): Promise<any> {
    this.proxyFn.log(
      `setReviewFeedback: ${data.reviewId} ${data.feedback} ${data.comment}`,
    );
  }

  async clearReview(): Promise<any> {
    this.proxyFn.log(`clear review`);
    for (let i = 0; i < this.runningReviewList.length; i++) {
      const review = this.runningReviewList[i];
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
