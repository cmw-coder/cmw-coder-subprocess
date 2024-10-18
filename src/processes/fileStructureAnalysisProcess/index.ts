import { MessageToMasterProxy } from 'common/MessageProxy';
import {
  FileStructureAnalysisChildHandler,
  FileStructureAnalysisMasterHandler,
} from 'types/fileStructureAnalysis';
import Parser from 'web-tree-sitter';
import { decode } from 'iconv-lite';
import { readFile } from 'fs/promises';
import { deleteComments, getTruncatedContents } from 'common/utils';
import { NEW_LINE_REGEX } from 'common/constants';
import { SymbolInfo } from 'types/FileStructureAnalysisHandler';

class FileStructureAnalysisProcess
  extends MessageToMasterProxy<FileStructureAnalysisMasterHandler>
  implements FileStructureAnalysisChildHandler
{
  private _parserInitialized = false;
  private cppParser: Parser | undefined = undefined;
  private cppParserLanguage: Parser.Language | undefined = undefined;

  constructor() {
    super();
    this.initParser();
    this.proxyFn.log(`fileStructureAnalysis process started ${process.pid}`);
  }

  async initParser() {
    if (!this._parserInitialized) {
      await Parser.init();
      this._parserInitialized = true;
    }
    if (this.cppParser === undefined || this.cppParserLanguage === undefined) {
      this.cppParser = new Parser();
      const scriptDir = await this.proxyFn.getScriptDir();
      this.cppParserLanguage = await Parser.Language.load(
        `${scriptDir}/dist/public/tree-sitter/tree-sitter-c.wasm`,
      );
      this.cppParser.setLanguage(this.cppParserLanguage);
    }
    return {
      cppParser: this.cppParser,
      cppParserLanguage: this.cppParserLanguage,
    };
  }

  async getCalledFunctionIdentifiers(filePath: string): Promise<string[]> {
    try {
      this.proxyFn.log(`getCalledFunctionIdentifiers ${filePath}`);
      const fileBuffer = await readFile(filePath);
      const fileContent = decode(fileBuffer, 'gb2312');
      const { cppParser, cppParserLanguage } = await this.initParser();
      const parserTree = cppParser.parse(fileContent);
      const query = cppParserLanguage.query(
        '(call_expression (identifier) @function_identifier)',
      );
      const result = query
        .matches(parserTree.rootNode)
        .map(({ captures }) =>
          fileContent.substring(
            captures[0].node.startIndex,
            captures[0].node.endIndex,
          ),
        );

      this.proxyFn.log('getCalledFunctionIdentifiers result', result);
      return result;
    } catch (e) {
      this.proxyFn.log('getCalledFunctionIdentifiers error', e);
      return [];
    }
  }

  async getGlobals(filePath: string): Promise<string> {
    try {
      this.proxyFn.log(`getGlobals ${filePath}`);
      const fileBuffer = await readFile(filePath);
      const fileContent = decode(fileBuffer, 'gb2312');
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
      const result = deleteComments(
        getTruncatedContents(fileContent, [
          ...functionDefinitionIndices,
          ...includeIndices,
        ]),
      )
        .split(NEW_LINE_REGEX)
        .filter((line) => line.trim().length > 0)
        .join('\n');
      this.proxyFn.log('getGlobals result', [result]);
      return result;
    } catch (e) {
      this.proxyFn.log('getGlobals error', e);
      return '';
    }
  }

  async getIncludes(filePath: string, maxLength: number): Promise<string> {
    try {
      this.proxyFn.log(`getIncludes ${filePath}`);
      const fileBuffer = await readFile(filePath);
      const fileContent = decode(fileBuffer, 'gb2312');
      const { cppParser, cppParserLanguage } = await this.initParser();
      const parserTree = cppParser.parse(fileContent);
      const includes = cppParserLanguage
        .query('(preproc_include) @include')
        .matches(parserTree.rootNode)
        .map(({ captures }) =>
          fileContent
            .substring(captures[0].node.startIndex, captures[0].node.endIndex)
            .replaceAll('\n', ''),
        );
      const result = includes
        .slice(
          0,
          includes.findIndex(
            (_, i) =>
              includes.slice(0, i).join('\n').trim().length >= maxLength,
          ),
        )
        .join('\n')
        .trim();
      this.proxyFn.log('getIncludes result', [result]);
      return result;
    } catch (e) {
      this.proxyFn.log('getIncludes error', e);
      return '';
    }
  }

  async getRelativeDefinitions(
    symbols: SymbolInfo[],
  ): Promise<{ path: string; content: string }[]> {
    try {
      this.proxyFn.log(`getRelativeDefinitions ${symbols.length}`);
      const preResult = await Promise.all(
        symbols.map(async ({ path, startLine, endLine }) => {
          try {
            return {
              path,
              content: decode(
                await readFile(path, {
                  flag: 'r',
                }),
                'gb2312',
              )
                .split(NEW_LINE_REGEX)
                .slice(startLine, endLine + 1)
                .join('\n'),
            };
          } catch (e) {
            this.proxyFn.log('getRelativeDefinitions', e);
            return {
              path,
              content: '',
            };
          }
        }),
      );

      const result = preResult.filter(
        ({ content }) =>
          content.split('\n').length <= 100 && content.length <= 1024,
      );
      this.proxyFn.log('getRelativeDefinitions result', result);
      return result;
    } catch (e) {
      this.proxyFn.log('getRelativeDefinitions error', e);
      return [];
    }
  }
}

new FileStructureAnalysisProcess();
