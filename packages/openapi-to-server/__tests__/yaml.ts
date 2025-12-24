import { read } from 'yaml-import';

export function loadYAML<T>(inputFile: string): T {
  return read(inputFile);
}

export function isYAML(inputFile: string): boolean {
  return inputFile.search(/\.yaml$/) > 0;
}
