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
  private isRunningGlobals = false;
  private isRunningIncludes = false;
  private isRunningRelativeDefinitions = false;
  private isRunningCalledFunctionIdentifiers = false;

  constructor() {
    super();
    this.initParser().catch();
    this.proxyFn
      .log(`fileStructureAnalysis process started ${process.pid}`)
      .catch();
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

  async getCalledFunctionIdentifiers(
    filePath: string,
  ): Promise<string[] | undefined> {
    if (this.isRunningCalledFunctionIdentifiers) {
      return undefined;
    }
    try {
      this.isRunningCalledFunctionIdentifiers = true;
      this.proxyFn.log(`getCalledFunctionIdentifiers ${filePath}`).catch();
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

      this.proxyFn.log('getCalledFunctionIdentifiers result', result).catch();
      return result;
    } catch (e) {
      this.proxyFn.log('getCalledFunctionIdentifiers error', e).catch();
      return [];
    } finally {
      this.isRunningCalledFunctionIdentifiers = false;
    }
  }

  async getGlobals(filePath: string): Promise<string | undefined> {
    if (this.isRunningGlobals) {
      return undefined;
    }
    try {
      this.isRunningGlobals = true;
      this.proxyFn.log(`getGlobals ${filePath}`).catch();
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
      this.proxyFn.log('getGlobals result', [result]).catch();
      return result;
    } catch (e) {
      this.proxyFn.log('getGlobals error', e).catch();
      return '';
    } finally {
      this.isRunningGlobals = false;
    }
  }

  async getIncludes(
    filePath: string,
    maxLength: number,
  ): Promise<string | undefined> {
    if (this.isRunningIncludes) {
      return undefined;
    }
    try {
      this.isRunningIncludes = true;
      this.proxyFn.log(`getIncludes ${filePath}`).catch();
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
      const sliceIndex = includes.findIndex(
        (_, i) => includes.slice(0, i).join('\n').trim().length >= maxLength,
      );
      const result = includes
        .slice(0, sliceIndex === -1 ? includes.length : sliceIndex)
        .join('\n')
        .trim();
      this.proxyFn.log('getIncludes result', [result]).catch();
      return result;
    } catch (e) {
      this.proxyFn.log('getIncludes error', e).catch();
      return '';
    } finally {
      this.isRunningIncludes = false;
    }
  }

  async getRelativeDefinitions(
    symbols: SymbolInfo[],
  ): Promise<{ path: string; content: string }[] | undefined> {
    if (this.isRunningRelativeDefinitions) {
      return undefined;
    }
    try {
      this.isRunningRelativeDefinitions = true;
      this.proxyFn.log(`getRelativeDefinitions ${symbols.length}`).catch();
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
            this.proxyFn.log('getRelativeDefinitions', e).catch();
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
      this.proxyFn.log('getRelativeDefinitions result', result).catch();
      return result;
    } catch (e) {
      this.proxyFn.log('getRelativeDefinitions error', e).catch();
      return [];
    } finally {
      this.isRunningRelativeDefinitions = false;
    }
  }
}

new FileStructureAnalysisProcess();
