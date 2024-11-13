import { MessageToMasterProxy } from 'common/MessageProxy';
import { DiffChildHandler, DiffMasterHandler } from 'types/diffHandler';
import DiffMatchPatch, { Diff } from 'diff-match-patch';
import { DiffCharResult, DiffLineResult } from 'types/diff';
import { Differ } from 'diff-match-patch-wasm-node';

class DiffProcess
  extends MessageToMasterProxy<DiffMasterHandler>
  implements DiffChildHandler
{
  private dmp = new DiffMatchPatch();
  private wasmDmp = new Differ();
  private isRunning = false;
  constructor() {
    super();
    this.dmp.Diff_Timeout = 0;
  }

  async diffLine(
    text1: string,
    text2: string,
  ): Promise<DiffLineResult | undefined> {
    if (this.isRunning) {
      return undefined;
    }
    const result = {
      added: 0,
      deleted: 0,
    };
    try {
      this.isRunning = true;
      const a = this.dmp.diff_linesToChars_(text1, text2);
      const lineText1 = a.chars1;
      const lineText2 = a.chars2;
      const lineArray = a.lineArray;
      const lineDiffs: Diff[] = this.wasmDmp.diff_main(lineText1, lineText2);
      this.dmp.diff_charsToLines_(lineDiffs, lineArray);
      this.dmp.diff_cleanupSemantic(lineDiffs);
      for (let i = 0; i < lineDiffs.length; i++) {
        const lineDiff = lineDiffs[i];
        if (lineDiff[0] === 1) {
          this.proxyFn.log('diffLine added', lineDiff[1]).catch();
          const lines = lineDiff[1].split(/\r\n|\n/).filter(line => line.trim() !== '');
          result.added += lines.length - 1;
        }
        if (lineDiff[0] === -1) {
          this.proxyFn.log('diffLine deleted', lineDiff[1]).catch();
          // 通过 trim 去除空换行
          const lines = lineDiff[1].split(/\r\n|\n/).filter(line => line.trim() !== '');
          result.deleted += lines.length - 1;
        }
      }
      return result;
    } catch (e) {
      this.proxyFn.log('diffLine error', (e as Error).message || e).catch();
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  async diffChar(
    text1: string,
    text2: string,
  ): Promise<DiffCharResult | undefined> {
    if (this.isRunning) {
      return undefined;
    }
    const result = {
      added: 0,
      deleted: 0,
    };
    try {
      this.isRunning = true;
      const charDiffs = this.wasmDmp.diff_main(text1, text2);
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
    } catch (e) {
      this.proxyFn.log('diffChar error', e).catch();
      return result;
    } finally {
      this.isRunning = false;
    }
  }
}

new DiffProcess();
