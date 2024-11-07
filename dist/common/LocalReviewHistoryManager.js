"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalReviewHistoryManager = void 0;
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
const luxon_1 = require("luxon");
class LocalReviewHistoryManager {
    constructor(localReviewHistoryDir, proxyFn) {
        this.localReviewHistoryDir = localReviewHistoryDir;
        this.proxyFn = proxyFn;
        this.tempUpdateData = [];
        this.updateTimer = undefined;
        this.checkLocalReviewHistoryDir();
    }
    checkLocalReviewHistoryDir() {
        if (!fs.existsSync(this.localReviewHistoryDir)) {
            fs.mkdirSync(this.localReviewHistoryDir);
        }
    }
    async getReviewHistoryFiles() {
        const res = [];
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
    async getReviewFileContent(name) {
        let res = [];
        const filePath = path_1.default.join(this.localReviewHistoryDir, name + '_review.json');
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const content = await fs.promises.readFile(filePath, {
            encoding: 'utf-8',
        });
        try {
            const parsedData = JSON.parse(content);
            res = parsedData.items;
        }
        catch (e) {
            this.proxyFn.log('getReviewFileContent error', e).catch();
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
    _saveTempReviewData() {
        if (this.tempUpdateData.length === 0) {
            return;
        }
        let fileParsedContent = {
            date: new Date().valueOf(),
            items: [],
        };
        const now = luxon_1.DateTime.now();
        const nowStr = now.toFormat('yyyy-MM-dd');
        const filePath = path_1.default.join(this.localReviewHistoryDir, nowStr + '_review.json');
        if (fs.existsSync(filePath)) {
            try {
                const fileContent = fs.readFileSync(filePath, {
                    encoding: 'utf-8',
                });
                fileParsedContent = JSON.parse(fileContent);
            }
            catch (e) {
                this.proxyFn.log(`saveReviewItem ${filePath} error1 ${e}`).catch();
            }
        }
        for (let i = 0; i < this.tempUpdateData.length; i++) {
            const item = this.tempUpdateData[i];
            const existItemIndex = fileParsedContent.items.findIndex((i) => i.reviewId === item.reviewId);
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
    async saveReviewItem(item) {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = undefined;
        }
        this.updateTimer = setTimeout(() => {
            this._saveTempReviewData();
        }, 1000);
        const existedIndex = this.tempUpdateData.findIndex((i) => i.reviewId === item.reviewId);
        if (existedIndex !== -1) {
            this.tempUpdateData[existedIndex] = item;
        }
        else {
            this.tempUpdateData.push(item);
        }
        if (this.tempUpdateData.length >= 10) {
            this._saveTempReviewData();
        }
    }
}
exports.LocalReviewHistoryManager = LocalReviewHistoryManager;
