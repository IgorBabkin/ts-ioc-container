import fs from 'fs';

export function loadJSON<T>(inputFile: string): T {
  const data: string = fs.readFileSync(inputFile, { encoding: 'utf-8' });
  return JSON.parse(data);
}
