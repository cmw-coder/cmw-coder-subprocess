"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MessageProxy_1 = require("../../common/MessageProxy");
const diff_match_patch_1 = __importDefault(require("diff-match-patch"));
class DiffProcess extends MessageProxy_1.MessageToMasterProxy {
    constructor() {
        super();
        this.dmp = new diff_match_patch_1.default();
        this.isRunning = false;
        this.dmp.Diff_Timeout = 0;
    }
    async diffLine(text1, text2) {
        if (this.isRunning) {
            return undefined;
        }
        try {
            this.isRunning = true;
            const a = this.dmp.diff_linesToChars_(text1, text2);
            const lineText1 = a.chars1;
            const lineText2 = a.chars2;
            const lineArray = a.lineArray;
            const lineDiffs = this.dmp.diff_main(lineText1, lineText2, false);
            this.dmp.diff_charsToLines_(lineDiffs, lineArray);
            return lineDiffs;
        }
        catch {
            return [];
        }
        finally {
            this.isRunning = false;
        }
    }
    async diffChar(text1, text2) {
        if (this.isRunning) {
            return undefined;
        }
        try {
            this.isRunning = true;
            const charDiffs = this.dmp.diff_main(text1, text2, false);
            return charDiffs;
        }
        catch {
            return [];
        }
        finally {
            this.isRunning = false;
        }
    }
}
new DiffProcess();
