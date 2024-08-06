import path from 'path';
import * as fs from 'fs';
import { ReviewFileData, ReviewData } from 'types/review';
import { ReviewMasterHandler } from 'types/ReviewHandler';

export class LocalReviewHistoryManager {
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
    const content = await fs.promises.readFile(filePath, 'utf8');
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

  async saveReviewItem(name: string, item: ReviewData) {
    let fileParsedContent: ReviewFileData = {
      date: new Date().valueOf(),
      items: [],
    };
    const filePath = path.join(
      this.localReviewHistoryDir,
      name + '_review.json',
    );
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        fileParsedContent = JSON.parse(fileContent);
      } catch (e) {
        this.proxyFn.log(`saveReviewItem ${filePath} error ${e}`);
      }
    }
    const existItemIndex = fileParsedContent.items.findIndex(
      (i) => i.reviewId === item.reviewId,
    );
    if (existItemIndex !== -1) {
      // delete
      fileParsedContent.items.splice(existItemIndex, 1);
    }
    fileParsedContent.items.push(item);
    fs.promises
      .writeFile(filePath, JSON.stringify(fileParsedContent))
      .catch((e) => {
        this.proxyFn.log(`saveReviewItem ${filePath} error ${e}`);
      });
  }
}
