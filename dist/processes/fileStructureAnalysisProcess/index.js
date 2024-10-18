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
        this.initParser();
        this.proxyFn.log(`fileStructureAnalysis process started ${process.pid}`);
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
        const fileBuffer = await (0, promises_1.readFile)(filePath);
        const fileContent = (0, iconv_lite_1.decode)(fileBuffer, 'gb2312');
        const { cppParser, cppParserLanguage } = await this.initParser();
        const parserTree = cppParser.parse(fileContent);
        const query = cppParserLanguage.query('(call_expression (identifier) @function_identifier)');
        return query
            .matches(parserTree.rootNode)
            .map(({ captures }) => fileContent.substring(captures[0].node.startIndex, captures[0].node.endIndex));
    }
    async getGlobals(filePath) {
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
        return (0, utils_1.deleteComments)((0, utils_1.getTruncatedContents)(fileContent, [
            ...functionDefinitionIndices,
            ...includeIndices,
        ]))
            .split(constants_1.NEW_LINE_REGEX)
            .filter((line) => line.trim().length > 0)
            .join('\n');
    }
    async getIncludes(filePath, maxLength) {
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
        return includes
            .slice(0, includes.findIndex((_, i) => includes.slice(0, i).join('\n').trim().length >= maxLength))
            .join('\n')
            .trim();
    }
    async getRelativeDefinitions(symbols) {
        const result = await Promise.all(symbols.map(async ({ path, startLine, endLine }) => {
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
                this.proxyFn.log('getRelativeDefinitions', e);
                return {
                    path,
                    content: '',
                };
            }
        }));
        return result.filter(({ content }) => content.split('\n').length <= 100 && content.length <= 1024);
    }
}
new FileStructureAnalysisProcess();