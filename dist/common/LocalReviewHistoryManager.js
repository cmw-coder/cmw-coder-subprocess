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
class LocalReviewHistoryManager {
    constructor(localReviewHistoryDir, proxyFn) {
        this.localReviewHistoryDir = localReviewHistoryDir;
        this.proxyFn = proxyFn;
        this.checkLocalReviewHistoryDir();
    }
    checkLocalReviewHistoryDir() {
        if (!fs.existsSync(this.localReviewHistoryDir)) {
            fs.mkdirSync(this.localReviewHistoryDir);
        }
    }
    getReviewHistoryFiles() {
        const res = [];
        const allFiles = fs.readdirSync(this.localReviewHistoryDir);
        for (let i = 0; i < allFiles.length; i++) {
            const file = allFiles[i];
            if (file.endsWith('_review.json')) {
                const name = file.replace('_review.json', '');
                res.push(name);
            }
        }
        return res;
    }
    getReviewFileContent(name) {
        let res = [];
        const filePath = path_1.default.join(this.localReviewHistoryDir, name + '_review.json');
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const content = fs.readFileSync(filePath, 'utf8');
        try {
            const parsedData = JSON.parse(content);
            res = parsedData.items;
        }
        catch (e) {
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
    saveReviewItem(name, item) {
        let fileParsedContent = {
            date: new Date().valueOf(),
            items: [],
        };
        const filePath = path_1.default.join(this.localReviewHistoryDir, name + '_review.json');
        if (fs.existsSync(filePath)) {
            try {
                fileParsedContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
            catch (e) {
                this.proxyFn.log('saveReviewItem error', e);
            }
        }
        const existItemIndex = fileParsedContent.items.findIndex((i) => i.reviewId === item.reviewId);
        if (existItemIndex !== -1) {
            // delete
            fileParsedContent.items.splice(existItemIndex, 1);
        }
        fileParsedContent.items.push(item);
        fs.writeFileSync(filePath, JSON.stringify(fileParsedContent));
    }
}
exports.LocalReviewHistoryManager = LocalReviewHistoryManager;
