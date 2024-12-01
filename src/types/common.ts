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
  completionConfigs: any;
}

export class CaretPosition {
  public readonly character: number;
  public readonly line: number;

  constructor(line: number = -1, character: number = -1) {
    this.character = character;
    this.line = line;
  }

  get isValid(): boolean {
    return this.line >= 0 && this.character >= 0;
  }

  compareTo(other: CaretPosition): -1 | 0 | 1 {
    if (this.line < other.line) {
      return -1;
    } else if (this.line > other.line) {
      return 1;
    } else if (this.character < other.character) {
      return -1;
    } else if (this.character > other.character) {
      return 1;
    } else {
      return 0;
    }
  }
}

export class Selection {
  public readonly begin = new CaretPosition();
  public readonly end = new CaretPosition();

  constructor(
    begin: CaretPosition = new CaretPosition(),
    end: CaretPosition = new CaretPosition(),
  ) {
    if (begin.isValid && end.isValid) {
      if (begin.compareTo(end) > 0) {
        this.begin = end;
        this.end = begin;
      } else {
        this.begin = begin;
        this.end = end;
      }
    }
  }

  get isValid(): boolean {
    return this.begin.isValid && this.end.isValid;
  }
}
