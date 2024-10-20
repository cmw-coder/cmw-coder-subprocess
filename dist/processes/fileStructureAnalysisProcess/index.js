"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MessageProxy_1 = require("../../common/MessageProxy");
const web_tree_sitter_1 = __importDefault(require("web-tree-sitter"));
const iconv_lite_1 = require("iconv-lite");
const promises_1 = require("fs/promises");
const utils_1 = require("../../common/utils");
const constants_1 = require("../../common/constants");
class FileStructureAnalysisProcess extends MessageProxy_1.MessageToMasterProxy {
    constructor() {
        super();
        this._parserInitialized = false;
        this.cppParser = undefined;
        this.cppParserLanguage = undefined;
        this.isRunningGlobals = false;
        this.isRunningIncludes = false;
        this.isRunningRelativeDefinitions = false;
        this.isRunningCalledFunctionIdentifiers = false;
        this.initParser().catch();
        this.proxyFn
            .log(`fileStructureAnalysis process started ${process.pid}`)
            .catch();
    }
    async initParser() {
        if (!this._parserInitialized) {
            await web_tree_sitter_1.default.init();
            this._parserInitialized = true;
        }
        if (this.cppParser === undefined || this.cppParserLanguage === undefined) {
            this.cppParser = new web_tree_sitter_1.default();
            const scriptDir = await this.proxyFn.getScriptDir();
            this.cppParserLanguage = await web_tree_sitter_1.default.Language.load(`${scriptDir}/dist/public/tree-sitter/tree-sitter-c.wasm`);
            this.cppParser.setLanguage(this.cppParserLanguage);
        }
        return {
            cppParser: this.cppParser,
            cppParserLanguage: this.cppParserLanguage,
        };
    }
    async getCalledFunctionIdentifiers(filePath) {
        if (this.isRunningCalledFunctionIdentifiers) {
            return undefined;
        }
        try {
            this.isRunningCalledFunctionIdentifiers = true;
            this.proxyFn.log(`getCalledFunctionIdentifiers ${filePath}`).catch();
            const fileBuffer = await (0, promises_1.readFile)(filePath);
            const fileContent = (0, iconv_lite_1.decode)(fileBuffer, 'gb2312');
            const { cppParser, cppParserLanguage } = await this.initParser();
            const parserTree = cppParser.parse(fileContent);
            const query = cppParserLanguage.query('(call_expression (identifier) @function_identifier)');
            const result = query
                .matches(parserTree.rootNode)
                .map(({ captures }) => fileContent.substring(captures[0].node.startIndex, captures[0].node.endIndex));
            this.proxyFn.log('getCalledFunctionIdentifiers result', result).catch();
            return result;
        }
        catch (e) {
            this.proxyFn.log('getCalledFunctionIdentifiers error', e).catch();
            return [];
        }
        finally {
            this.isRunningCalledFunctionIdentifiers = false;
        }
    }
    async getGlobals(filePath) {
        if (this.isRunningGlobals) {
            return undefined;
        }
        try {
            this.isRunningGlobals = true;
            this.proxyFn.log(`getGlobals ${filePath}`).catch();
            const fileBuffer = await (0, promises_1.readFile)(filePath);
            const fileContent = (0, iconv_lite_1.decode)(fileBuffer, 'gb2312');
            const { cppParser, cppParserLanguage } = await this.initParser();
            const parserTree = cppParser.parse(fileContent);
            const functionDefinitionIndices = cppParserLanguage
                .query('(function_definition) @definition')
                .matches(parserTree.rootNode)
                .map(({ captures }) => ({
                begin: captures[0].node.startIndex,
                end: captures[0].node.endIndex,
            }));
            const includeIndices = cppParserLanguage
                .query('(preproc_include) @include')
                .matches(parserTree.rootNode)
                .map(({ captures }) => ({
                begin: captures[0].node.startIndex,
                end: captures[0].node.endIndex,
            }));
            const result = (0, utils_1.deleteComments)((0, utils_1.getTruncatedContents)(fileContent, [
                ...functionDefinitionIndices,
                ...includeIndices,
            ]))
                .split(constants_1.NEW_LINE_REGEX)
                .filter((line) => line.trim().length > 0)
                .join('\n');
            this.proxyFn.log('getGlobals result', [result]).catch();
            return result;
        }
        catch (e) {
            this.proxyFn.log('getGlobals error', e).catch();
            return '';
        }
        finally {
            this.isRunningGlobals = false;
        }
    }
    async getIncludes(filePath, maxLength) {
        if (this.isRunningIncludes) {
            return undefined;
        }
        try {
            this.isRunningIncludes = true;
            this.proxyFn.log(`getIncludes ${filePath}`).catch();
            const fileBuffer = await (0, promises_1.readFile)(filePath);
            const fileContent = (0, iconv_lite_1.decode)(fileBuffer, 'gb2312');
            const { cppParser, cppParserLanguage } = await this.initParser();
            const parserTree = cppParser.parse(fileContent);
            const includes = cppParserLanguage
                .query('(preproc_include) @include')
                .matches(parserTree.rootNode)
                .map(({ captures }) => fileContent
                .substring(captures[0].node.startIndex, captures[0].node.endIndex)
                .replaceAll('\n', ''));
            const sliceIndex = includes.findIndex((_, i) => includes.slice(0, i).join('\n').trim().length >= maxLength);
            const result = includes
                .slice(0, sliceIndex === -1 ? includes.length : sliceIndex)
                .join('\n')
                .trim();
            this.proxyFn.log('getIncludes result', [result]).catch();
            return result;
        }
        catch (e) {
            this.proxyFn.log('getIncludes error', e).catch();
            return '';
        }
        finally {
            this.isRunningIncludes = false;
        }
    }
    async getRelativeDefinitions(symbols) {
        if (this.isRunningRelativeDefinitions) {
            return undefined;
        }
        try {
            this.isRunningRelativeDefinitions = true;
            this.proxyFn.log(`getRelativeDefinitions ${symbols.length}`).catch();
            const preResult = await Promise.all(symbols.map(async ({ path, startLine, endLine }) => {
                try {
                    return {
                        path,
                        content: (0, iconv_lite_1.decode)(await (0, promises_1.readFile)(path, {
                            flag: 'r',
                        }), 'gb2312')
                            .split(constants_1.NEW_LINE_REGEX)
                            .slice(startLine, endLine + 1)
                            .join('\n'),
                    };
                }
                catch (e) {
                    this.proxyFn.log('getRelativeDefinitions', e).catch();
                    return {
                        path,
                        content: '',
                    };
                }
            }));
            const result = preResult.filter(({ content }) => content.split('\n').length <= 100 && content.length <= 1024);
            this.proxyFn.log('getRelativeDefinitions result', result).catch();
            return result;
        }
        catch (e) {
            this.proxyFn.log('getRelativeDefinitions error', e).catch();
            return [];
        }
        finally {
            this.isRunningRelativeDefinitions = false;
        }
    }
}
new FileStructureAnalysisProcess();
