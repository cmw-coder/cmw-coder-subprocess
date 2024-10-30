import { MessageToMasterProxy } from 'common/MessageProxy';
import { DiffChildHandler, DiffMasterHandler } from 'types/diffHandler';
import DiffMatchPatch from 'diff-match-patch';

class DiffProcess
  extends MessageToMasterProxy<DiffMasterHandler>
  implements DiffChildHandler
{
  private dmp = new DiffMatchPatch();
  private isRunning = false;
  constructor() {
    super();
    this.dmp.Diff_Timeout = 0;
  }

  async diffLine(
    text1: string,
    text2: string,
  ): Promise<DiffMatchPatch.Diff[] | undefined> {
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
    } catch {
      return [];
    } finally {
      this.isRunning = false;
    }
  }

  async diffChar(
    text1: string,
    text2: string,
  ): Promise<DiffMatchPatch.Diff[] | undefined> {
    if (this.isRunning) {
      return undefined;
    }
    try {
      this.isRunning = true;
      const charDiffs = this.dmp.diff_main(text1, text2, false);
      return charDiffs;
    } catch {
      return [];
    } finally {
      this.isRunning = false;
    }
  }
}

new DiffProcess();
