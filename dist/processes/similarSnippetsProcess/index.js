"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../common/constants");
const MessageProxy_1 = require("../../common/MessageProxy");
const utils_1 = require("../../common/utils");
class SimilarSnippetsProcess extends MessageProxy_1.MessageToMasterProxy {
    constructor() {
        super();
        this.proxyFn.log(`similarSnippets process started ${process.pid}`);
    }
    enableSimilarSnippet() {
        this._slowRecentFiles = undefined;
        this.proxyFn.log('getSimilarSnippets.enable');
    }
    async getSimilarSnippets({ file, position, functionPrefix, functionSuffix, recentFiles, }) {
        this.proxyFn.log('getSimilarSnippets: file', file);
        this.proxyFn.log('getSimilarSnippets: recentFiles', recentFiles);
        if (this._slowRecentFiles) {
            if (!this._slowRecentFiles.some((slowFile) => !recentFiles.includes(slowFile))) {
                return [];
            }
            this.enableSimilarSnippet();
        }
        const startTime = Date.now();
        const tabContentsWithoutComments = (await (0, utils_1.getAllOtherTabContents)(recentFiles)).map((tabContent) => ({
            path: tabContent.path,
            lines: (0, utils_1.separateTextByLine)(tabContent.content, true),
        }));
        const remainedCodeContents = await (0, utils_1.getRemainedCodeContents)({
            file,
            position,
            functionPrefix,
            functionSuffix,
        });
        tabContentsWithoutComments.push({
            path: file,
            lines: remainedCodeContents.before,
        }, {
            path: file,
            lines: remainedCodeContents.after,
        });
        const similarSnippets = Array();
        const referenceSnippetLines = (0, utils_1.separateTextByLine)(functionPrefix + functionSuffix);
        this.proxyFn.log('getSimilarSnippets.referenceSnippetLines:', referenceSnippetLines);
        tabContentsWithoutComments.forEach(({ path, lines }) => {
            const { score, startLine } = (0, utils_1.getMostSimilarSnippetStartLine)(lines.map((line) => (0, utils_1.tokenize)(line, [
                constants_1.IGNORE_RESERVED_KEYWORDS,
                constants_1.IGNORE_COMMON_WORD,
                constants_1.IGNORE_COMWARE_INTERNAL,
            ])), (0, utils_1.tokenize)(referenceSnippetLines.join('\n'), [
                constants_1.IGNORE_RESERVED_KEYWORDS,
                constants_1.IGNORE_COMMON_WORD,
                constants_1.IGNORE_COMWARE_INTERNAL,
            ]), referenceSnippetLines.length);
            const currentMostSimilarSnippet = {
                path,
                score: score,
                content: lines
                    .slice(startLine, startLine + referenceSnippetLines.length + 10)
                    .join('\n'),
            };
            similarSnippets.push(currentMostSimilarSnippet);
        });
        const endTime = Date.now();
        if (endTime - startTime > 1000) {
            this.proxyFn.log(`getSimilarSnippets.disable: ${endTime - startTime}`);
            this._slowRecentFiles = recentFiles;
        }
        this.proxyFn.log(`getSimilarSnippets.end: ${endTime - startTime}`);
        return similarSnippets
            .filter((mostSimilarSnippet) => mostSimilarSnippet.score > 0)
            .sort((first, second) => first.score - second.score)
            .reverse();
    }
}
new SimilarSnippetsProcess();
