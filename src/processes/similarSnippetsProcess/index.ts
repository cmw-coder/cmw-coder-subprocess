import {
  IGNORE_RESERVED_KEYWORDS,
  IGNORE_COMMON_WORD,
  IGNORE_COMWARE_INTERNAL,
} from 'common/constants';
import { MessageToMasterProxy } from 'common/MessageProxy';
import {
  getAllOtherTabContents,
  getMostSimilarSnippetStartLine,
  getRemainedCodeContents,
  separateTextByLine,
  tokenize,
} from 'common/utils';
import { Position } from 'types/master';
import { SimilarSnippet } from 'types/similarSnippets';
import {
  SimilarSnippetsMasterHandler,
  SimilarSnippetsHandler,
} from 'types/SimilarSnippetsHandler';

class SimilarSnippetsProcess
  extends MessageToMasterProxy<SimilarSnippetsMasterHandler>
  implements SimilarSnippetsHandler
{
  private _slowRecentFiles?: string[];

  constructor() {
    super();
    this.proxyFn.log(`similarSnippets process started ${process.pid}`);
  }

  enableSimilarSnippet() {
    this._slowRecentFiles = undefined;
    this.proxyFn.log('PromptExtractor.getSimilarSnippets.enable');
  }

  async getSimilarSnippets({
    file,
    position,
    functionPrefix,
    functionSuffix,
    recentFiles,
  }: {
    file: string;
    position: Position;
    functionPrefix: string;
    functionSuffix: string;
    recentFiles: string[];
  }): Promise<SimilarSnippet[]> {
    this.proxyFn.log(
      `getSimilarSnippets: file: ${file}, recentFiles: ${recentFiles.join(',')}`,
    );
    if (this._slowRecentFiles) {
      if (
        !this._slowRecentFiles.some(
          (slowFile) => !recentFiles.includes(slowFile),
        )
      ) {
        return [];
      }
      this.enableSimilarSnippet();
    }
    const startTime = Date.now();
    const tabContentsWithoutComments = (
      await getAllOtherTabContents(recentFiles)
    ).map((tabContent) => ({
      path: tabContent.path,
      lines: separateTextByLine(tabContent.content, true),
    }));

    const remainedCodeContents = await getRemainedCodeContents({
      file,
      position,
      functionPrefix,
      functionSuffix,
    });
    tabContentsWithoutComments.push(
      {
        path: file,
        lines: remainedCodeContents.before,
      },
      {
        path: file,
        lines: remainedCodeContents.after,
      },
    );

    const similarSnippets = Array<SimilarSnippet>();
    const referenceSnippetLines = separateTextByLine(
      functionPrefix + functionSuffix,
    );
    this.proxyFn.log(
      `PromptExtractor.getSimilarSnippets.referenceSnippetLines: ${referenceSnippetLines.join('\n')}`,
    );

    tabContentsWithoutComments.forEach(({ path, lines }) => {
      const { score, startLine } = getMostSimilarSnippetStartLine(
        lines.map((line) =>
          tokenize(line, [
            IGNORE_RESERVED_KEYWORDS,
            IGNORE_COMMON_WORD,
            IGNORE_COMWARE_INTERNAL,
          ]),
        ),
        tokenize(referenceSnippetLines.join('\n'), [
          IGNORE_RESERVED_KEYWORDS,
          IGNORE_COMMON_WORD,
          IGNORE_COMWARE_INTERNAL,
        ]),
        referenceSnippetLines.length,
      );
      const currentMostSimilarSnippet: SimilarSnippet = {
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
      this.proxyFn.log(
        `PromptExtractor.getSimilarSnippets.disable: ${endTime - startTime}`,
      );
      this._slowRecentFiles = recentFiles;
    }

    return similarSnippets
      .filter((mostSimilarSnippet) => mostSimilarSnippet.score > 0)
      .sort((first, second) => first.score - second.score)
      .reverse();
  }
}

new SimilarSnippetsProcess();
