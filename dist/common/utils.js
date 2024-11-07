"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMostSimilarSnippetStartLine = exports.tokenize = exports.getRemainedCodeContents = exports.getPositionOffset = exports.getAllOtherTabContents = exports.separateTextByLine = exports.deleteComments = exports.timeout = void 0;
exports.getFilesInDirectory = getFilesInDirectory;
exports.getTruncatedContents = getTruncatedContents;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const constants_1 = require("./constants");
const iconv_lite_1 = require("iconv-lite");
const timeout = (time = 0) => {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
};
exports.timeout = timeout;
async function getFilesInDirectory(dir) {
    const files = [];
    const stack = [dir];
    while (stack.length > 0) {
        const currentDir = stack.pop();
        const entries = await fs_1.default.promises.readdir(currentDir, {
            withFileTypes: true,
        });
        for (const entry of entries) {
            const fullPath = path_1.default.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
            }
            else {
                files.push(fullPath);
            }
        }
    }
    return files;
}
const deleteComments = (content) => {
    return content.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
};
exports.deleteComments = deleteComments;
const separateTextByLine = (rawText, removeComments = false) => {
    if (removeComments) {
        rawText = (0, exports.deleteComments)(rawText);
    }
    return rawText
        .split(constants_1.NEW_LINE_REGEX)
        .filter((tabContentLine) => tabContentLine.trim().length > 0);
};
exports.separateTextByLine = separateTextByLine;
const getAllOtherTabContents = async (filePathList) => {
    const res = [];
    for (const filePath of filePathList) {
        if (fs_1.default.existsSync(filePath)) {
            const tabContent = await fs_1.default.promises.readFile(filePath);
            res.push({
                path: filePath,
                content: (0, iconv_lite_1.decode)(tabContent, 'gb2312'),
            });
        }
    }
    return res;
};
exports.getAllOtherTabContents = getAllOtherTabContents;
const getPositionOffset = (fileContent, position) => {
    return (fileContent.split('\n').slice(0, position.line).join('\n').length +
        position.character +
        1);
};
exports.getPositionOffset = getPositionOffset;
const getRemainedCodeContents = async ({ file, position, functionPrefix, functionSuffix, }) => {
    const fileBuffer = await fs_1.default.promises.readFile(file);
    const fileContent = (0, iconv_lite_1.decode)(fileBuffer, 'gb2312');
    return {
        before: (0, exports.separateTextByLine)(fileContent.substring(0, (0, exports.getPositionOffset)(fileContent, position) - functionPrefix.length), true),
        after: (0, exports.separateTextByLine)(fileContent.substring((0, exports.getPositionOffset)(fileContent, position) + functionSuffix.length), true),
    };
};
exports.getRemainedCodeContents = getRemainedCodeContents;
const tokenize = (rawText, ignoreRules, splitPattern = constants_1.REGEXP_WORD) => {
    let tokens = rawText.split(splitPattern).filter((token) => token.length > 0);
    ignoreRules.forEach((ignoreRule) => (tokens = tokens.filter((token) => !ignoreRule.has(token))));
    return new Set(tokens);
};
exports.tokenize = tokenize;
const getMostSimilarSnippetStartLine = (candidateTokens, referenceTokens, windowSize) => {
    const currentMostSimilar = {
        startLine: 0,
        score: 0,
    };
    for (let startLineIndex = 0; startLineIndex + windowSize < candidateTokens.length; startLineIndex++) {
        const windowedCandidateTokens = new Set(candidateTokens
            .slice(startLineIndex, startLineIndex + windowSize)
            .reduce((accumulatedTokens, targetLineTokens) => accumulatedTokens.concat([...targetLineTokens]), Array()));
        const intersectionTokens = new Set([...windowedCandidateTokens].filter((targetToken) => referenceTokens.has(targetToken)));
        const currentScore = intersectionTokens.size /
            (windowedCandidateTokens.size +
                referenceTokens.size -
                intersectionTokens.size);
        if (currentScore > currentMostSimilar.score) {
            currentMostSimilar.startLine = startLineIndex;
            currentMostSimilar.score = currentScore;
        }
    }
    return currentMostSimilar;
};
exports.getMostSimilarSnippetStartLine = getMostSimilarSnippetStartLine;
function getTruncatedContents(content, indices) {
    // Sort indices in descending order based on startIndex
    indices.sort((a, b) => a.begin - b.begin);
    let offset = 0;
    // Remove substrings from the string
    for (const { begin, end } of indices) {
        content =
            content.substring(0, begin - offset) + content.substring(end - offset);
        offset += end - begin;
    }
    return content;
}
