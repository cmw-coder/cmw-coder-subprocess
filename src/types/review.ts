import { Range } from "types/master";

export enum SymbolType {
  Enum = 'Enum',
  Function = 'Function',
  Macro = 'Macro',
  Reference = 'Reference',
  Struct = 'Struct',
  Unknown = 'Unknown',
  Variable = 'Variable',
}

type BundledLanguage = string;

export interface ExtraData {
  projectId: string;
  version: string;
}


export interface Selection {
  block: string;
  file: string;
  content: string;
  range: Range;
  language: BundledLanguage;
}

export interface Reference {
  name: string;
  type: SymbolType;
  content: string;
  depth: number; // Depth of call hierarchy, start from 0
  path: string;
  range: {
    startLine: number;
    endLine: number;
  };
}

export interface ReviewRequestParams {
  productLine: string;
  profileModel: string;
  templateName: string;
  references: Reference[];
  language: string;
  target: {
    block: string;
    snippet: string;
  };
}

export enum ReviewState {
  Queue = 'Queue',
  Ready = 'Ready',
  References = 0,
  Start = 1,
  /**
   * @deprecated
   */
  First = 2,
  /**
   * @deprecated
   */
  Second = 3,
  /**
   * @deprecated
   */
  Third = 4,
  Finished = 100,
  Error = -1,
}

export const reviewStateIconMap: Record<
  ReviewState,
  {
    color: string;
    icon: string;
  }
> = {
  [ReviewState.Queue]: {
    color: 'gray-6',
    icon: 'mdi-human-queue',
  },
  [ReviewState.Ready]: {
    color: 'blue-6',
    icon: 'mdi-comment-text-outline',
  },
  [ReviewState.References]: {
    color: 'cyan-6',
    icon: 'mdi-robot-mower-outline',
  },
  [ReviewState.Start]: {
    color: 'blue-6',
    icon: 'mdi-clock-outline',
  },
  [ReviewState.Finished]: {
    color: 'green-8',
    icon: 'mdi-check-circle-outline',
  },
  [ReviewState.Error]: {
    color: 'red-8',
    icon: 'mdi-alert-circle-outline',
  },
  [ReviewState.First]: {
    color: 'blue-6',
    icon: 'mdi-comment-text-outline',
  },
  [ReviewState.Second]: {
    color: 'blue-6',
    icon: 'mdi-comment-text-outline',
  },
  [ReviewState.Third]: {
    color: 'blue-6',
    icon: 'mdi-comment-text-outline',
  },
};

export enum ReviewType {
  File = 'File',
  Function = 'Function',
}

export interface ReviewTypeMapping {
  [ReviewType.File]: ReviewData[];
  [ReviewType.Function]: ReviewData | undefined;
}

export enum Feedback {
  None = 'None',
  Helpful = 'Helpful',
  NotHelpful = 'NotHelpful',
}

export interface ReviewParsedResult {
  Type: string;
  IsProblem: string;
  Number: number;
  ProblemCodeSnippet: string;
  Description: string;
}

export interface ReviewResult {
  parsed: boolean;
  data: ReviewParsedResult[];
  originData: string;
}

export interface ReviewData {
  references: Reference[];
  selection: Selection;
  reviewId: string;
  serverTaskId: string;
  state: ReviewState;
  result: ReviewResult;
  feedback: Feedback;
  errorInfo: string;
  extraData: ExtraData;
  reviewType: ReviewType;
  isRunning: boolean;
  createTime: number;
  startTime: number;
  endTime: number;
  referenceTime: number;
}

export interface ReviewFileData {
  date: number;
  items: ReviewData[];
}

export interface ReviewFileItem {
  path: string;
  total: number;
  done: number;
  problemNumber: number;
}
