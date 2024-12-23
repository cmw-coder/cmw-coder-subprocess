"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MessageProxy_1 = require("../../common/MessageProxy");
const diff_match_patch_1 = __importDefault(require("diff-match-patch"));
// import { Differ } from 'diff-match-patch-wasm-node';
class DiffProcess extends MessageProxy_1.MessageToMasterProxy {
    constructor() {
        super();
        this.dmp = new diff_match_patch_1.default();
        // private wasmDmp = new Differ();
        this.isRunning = false;
        this.dmp.Diff_Timeout = 0;
    }
    async diffLine(text1, text2) {
        if (this.isRunning) {
            return undefined;
        }
        const result = {
            added: 0,
            deleted: 0,
        };
        try {
            this.proxyFn
                .log('diffLine', {
                text1Length: text1.length,
                text2Length: text2.length,
            })
                .catch();
            this.isRunning = true;
            const a = this.dmp.diff_linesToChars_(text1, text2);
            const lineText1 = a.chars1;
            const lineText2 = a.chars2;
            const lineArray = a.lineArray;
            const lineDiffs = this.dmp.diff_main(lineText1, lineText2);
            this.dmp.diff_charsToLines_(lineDiffs, lineArray);
            this.dmp.diff_cleanupSemantic(lineDiffs);
            for (let i = 0; i < lineDiffs.length; i++) {
                const lineDiff = lineDiffs[i];
                if (lineDiff[0] === 1) {
                    this.proxyFn.log('diffLine added', lineDiff).catch();
                    const lines = lineDiff[1]
                        .split(/\r\n|\n/)
                        .filter((line) => line.trim() !== '');
                    result.added += lines.length;
                }
                if (lineDiff[0] === -1) {
                    this.proxyFn.log('diffLine deleted', lineDiff).catch();
                    const lines = lineDiff[1]
                        .split(/\r\n|\n/)
                        .filter((line) => line.trim() !== '');
                    result.deleted += lines.length;
                }
            }
            return result;
        }
        catch (e) {
            this.proxyFn.log('diffLine error', e.message || e).catch();
            return result;
        }
        finally {
            this.isRunning = false;
        }
    }
    async diffChar(text1, text2) {
        if (this.isRunning) {
            return undefined;
        }
        const result = {
            added: 0,
            deleted: 0,
        };
        try {
            this.isRunning = true;
            const charDiffs = this.dmp.diff_main(text1, text2);
            for (let i = 0; i < charDiffs.length; i++) {
                const charDiff = charDiffs[i];
                if (charDiff[0] === 1) {
                    result.added += charDiff[1].replaceAll('\r\n', '\n').length;
                }
                if (charDiff[0] === -1) {
                    result.deleted += charDiff[1].replaceAll('\r\n', '\n').length;
                }
            }
            return result;
        }
        catch (e) {
            this.proxyFn.log('diffChar error', e).catch();
            return result;
        }
        finally {
            this.isRunning = false;
        }
    }
}
new DiffProcess();
