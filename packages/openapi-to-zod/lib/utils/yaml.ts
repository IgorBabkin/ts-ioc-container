import { read } from 'yaml-import';

export function loadYAML<T>(inputFile: string): T {
  return read(inputFile) as T;
}

export function isYAML(inputFile: string): boolean {
  return /\.ya?ml$/.test(inputFile);
}
