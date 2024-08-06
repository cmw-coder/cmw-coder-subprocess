import path from 'path';
import * as fs from 'fs';
import { ReviewFileData, ReviewData } from 'types/review';
import { ReviewMasterHandler } from 'types/ReviewHandler';
import { DateTime } from 'luxon';

export class LocalReviewHistoryManager {
  private tempUpdateData: ReviewData[] = [];
  private updateTimer: NodeJS.Timeout | undefined = undefined;
  constructor(
    private readonly localReviewHistoryDir: string,
    private proxyFn: ReviewMasterHandler,
  ) {
    this.checkLocalReviewHistoryDir();
  }

  checkLocalReviewHistoryDir() {
    if (!fs.existsSync(this.localReviewHistoryDir)) {
      fs.mkdirSync(this.localReviewHistoryDir);
    }
  }

  async getReviewHistoryFiles(): Promise<string[]> {
    const res: string[] = [];
    const allFiles = await fs.promises.readdir(this.localReviewHistoryDir);
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      if (file.endsWith('_review.json')) {
        const name = file.replace('_review.json', '');
        res.push(name);
      }
    }
    return res;
  }

  async getReviewFileContent(name: string): Promise<ReviewData[]> {
    let res: ReviewData[] = [];
    const filePath = path.join(
      this.localReviewHistoryDir,
      name + '_review.json',
    );
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = await fs.promises.readFile(filePath, {
      encoding: 'utf-8',
    });
    try {
      const parsedData = JSON.parse(content) as unknown as ReviewFileData;
      res = parsedData.items;
    } catch (e) {
      this.proxyFn.log('getReviewFileContent error', e);
    }
    // 整理格式
    res.forEach((item) => {
      if (!item.createTime) {
        item.createTime = 0;
      }
      if (!item.startTime) {
        item.startTime = 0;
      }
      if (!item.endTime) {
        item.endTime = 0;
      }
      if (!item.referenceTime) {
        item.referenceTime = 0;
      }
    });
    return res;
  }

  private _saveTempReviewData() {
    if (this.tempUpdateData.length === 0) {
      return;
    }
    let fileParsedContent: ReviewFileData = {
      date: new Date().valueOf(),
      items: [],
    };
    const now = DateTime.now();
    const nowStr = now.toFormat('yyyy-MM-dd');
    const filePath = path.join(
      this.localReviewHistoryDir,
      nowStr + '_review.json',
    );
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, {
          encoding: 'utf-8',
        });
        fileParsedContent = JSON.parse(fileContent);
      } catch (e) {
        this.proxyFn.log(`saveReviewItem ${filePath} error1 ${e}`);
      }
    }
    for (let i = 0; i < this.tempUpdateData.length; i++) {
      const item = this.tempUpdateData[i];
      const existItemIndex = fileParsedContent.items.findIndex(
        (i) => i.reviewId === item.reviewId,
      );
      if (existItemIndex !== -1) {
        // delete
        fileParsedContent.items.splice(existItemIndex, 1);
      }
      fileParsedContent.items.push(item);
    }
    fs.writeFileSync(filePath, JSON.stringify(fileParsedContent), {
      encoding: 'utf-8',
    });
    this.tempUpdateData = [];
  }

  async saveReviewItem(item: ReviewData) {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = undefined;
    }
    this.updateTimer = setTimeout(() => {
      this._saveTempReviewData();
    }, 1000);
    const existedIndex = this.tempUpdateData.findIndex(
      (i) => i.reviewId === item.reviewId,
    );
    if (existedIndex !== -1) {
      this.tempUpdateData[existedIndex] = item;
    } else {
      this.tempUpdateData.push(item);
    }
    if (this.tempUpdateData.length >= 10) {
      this._saveTempReviewData();
    }
  }
}
