import fs from 'fs';
import path from 'path';
import { decode } from 'iconv-lite';

import { NEW_LINE_REGEX, REGEXP_WORD } from 'common/constants';
import { CaretPosition } from 'types/common';

export const timeout = (time = 0) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};

export async function getFilesInDirectory(dir: string): Promise<string[]> {
  const files: string[] = [];
  const stack: string[] = [dir];

  while (stack.length > 0) {
    const currentDir = stack.pop()!;
    const entries = await fs.promises.readdir(currentDir, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  return files;
}

export const deleteComments = (content: string): string => {
  return content.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
};

export const separateTextByLine = (
  rawText: string,
  removeComments = false,
): string[] => {
  if (removeComments) {
    rawText = deleteComments(rawText);
  }
  return rawText
    .split(NEW_LINE_REGEX)
    .filter((tabContentLine) => tabContentLine.trim().length > 0);
};

export const getAllOtherTabContents = async (
  filePathList: string[],
): Promise<{ path: string; content: string }[]> => {
  const res = [] as {
    path: string;
    content: string;
  }[];
  for (const filePath of filePathList) {
    if (fs.existsSync(filePath)) {
      const tabContent = await fs.promises.readFile(filePath);
      res.push({
        path: filePath,
        content: decode(tabContent, 'gb2312'),
      });
    }
  }
  return res;
};

export const getPositionOffset = (fileContent: string, caretPosition: CaretPosition) => {
  return (
    fileContent.split('\n').slice(0, caretPosition.line).join('\n').length +
    caretPosition.character +
    1
  );
};

export const getRemainedCodeContents = async ({
  file,
  position,
  functionPrefix,
  functionSuffix,
}: {
  file: string;
  position: CaretPosition;
  functionPrefix: string;
  functionSuffix: string;
}): Promise<{
  before: string[];
  after: string[];
}> => {
  const fileBuffer = await fs.promises.readFile(file);
  const fileContent = decode(fileBuffer, 'gb2312');
  return {
    before: separateTextByLine(
      fileContent.substring(
        0,
        getPositionOffset(fileContent, position) - functionPrefix.length,
      ),
      true,
    ),
    after: separateTextByLine(
      fileContent.substring(
        getPositionOffset(fileContent, position) + functionSuffix.length,
      ),
      true,
    ),
  };
};

export const tokenize = (
  rawText: string,
  ignoreRules: Array<Set<string>>,
  splitPattern: RegExp = REGEXP_WORD,
): Set<string> => {
  let tokens = rawText.split(splitPattern).filter((token) => token.length > 0);
  ignoreRules.forEach(
    (ignoreRule) => (tokens = tokens.filter((token) => !ignoreRule.has(token))),
  );
  return new Set(tokens);
};

export const getMostSimilarSnippetStartLine = (
  candidateTokens: Array<Set<string>>,
  referenceTokens: Set<string>,
  windowSize: number,
): {
  startLine: number;
  score: number;
} => {
  const currentMostSimilar = {
    startLine: 0,
    score: 0,
  };

  for (
    let startLineIndex = 0;
    startLineIndex + windowSize < candidateTokens.length;
    startLineIndex++
  ) {
    const windowedCandidateTokens = new Set(
      candidateTokens
        .slice(startLineIndex, startLineIndex + windowSize)
        .reduce(
          (accumulatedTokens, targetLineTokens) =>
            accumulatedTokens.concat([...targetLineTokens]),
          Array<string>(),
        ),
    );

    const intersectionTokens = new Set(
      [...windowedCandidateTokens].filter((targetToken) =>
        referenceTokens.has(targetToken),
      ),
    );

    const currentScore =
      intersectionTokens.size /
      (windowedCandidateTokens.size +
        referenceTokens.size -
        intersectionTokens.size);
    if (currentScore > currentMostSimilar.score) {
      currentMostSimilar.startLine = startLineIndex;
      currentMostSimilar.score = currentScore;
    }
  }
  return currentMostSimilar;
};

export function getTruncatedContents(
  content: string,
  indices: { begin: number; end: number }[],
): string {
  // Sort indices in descending order based on startIndex
  indices.sort((a, b) => a.begin - b.begin);
  let offset = 0;
  // Remove substrings from the string
  for (const { begin, end } of indices) {
    content =
      content.substring(0, begin - offset) + content.substring(end - offset);
    offset += end - begin;
  }

  return content;
}
