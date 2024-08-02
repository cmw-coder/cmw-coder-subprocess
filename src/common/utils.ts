import { promises } from 'fs';
import path from 'path';

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
    const entries = await promises.readdir(currentDir, { withFileTypes: true });

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
