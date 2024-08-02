export enum NetworkZone {
  // 红区
  Normal = 'Normal',
  // 黄、绿区
  Public = 'Public',
  // 路由红区
  Secure = 'Secure',
  // 未知 -- 默认值
  Unknown = 'Unknown',
}


export interface AppConfig {
  networkZone: NetworkZone;
  baseServerUrl: string;
  username: string;
  token: string;
  refreshToken: string;
  activeTemplate: string;
  activeModel: string;
  activeModelKey: string;
  activeChat: string;
  locale: string;
  useMultipleChat: boolean;
  useEnterSend: boolean;
  darkMode: boolean;
  developerMode: boolean;
  showSelectedTipsWindow: boolean;
  completionConfigs: any
}

export class Position {
  public readonly line: number;

  public readonly character: number;

  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }

  /**
   * Create a new position from this position.
   *
   * @param newLineNumber new line number
   * @param newColumn new character
   */
  with(
    newLineNumber: number = this.line,
    newColumn: number = this.character,
  ): Position {
    if (newLineNumber === this.line && newColumn === this.character) {
      return this;
    } else {
      return new Position(newLineNumber, newColumn);
    }
  }

  /**
   * Convert to a human-readable representation.
   */
  public toString(): string {
    return '(' + this.line + ',' + this.character + ')';
  }
}

export class Range {
  public readonly start: Position;
  public readonly end: Position;

  constructor(
    startLine: number,
    startCharacter: number,
    endLine: number,
    endCharacter: number,
  ) {
    if (
      startLine > endLine ||
      (startLine === endLine && startCharacter > endCharacter)
    ) {
      this.start = new Position(endLine, endCharacter);
      this.end = new Position(startLine, startCharacter);
    } else {
      this.start = new Position(startLine, startCharacter);
      this.end = new Position(endLine, endCharacter);
    }
  }
}

