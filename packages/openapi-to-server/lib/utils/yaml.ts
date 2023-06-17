import fs from 'fs';
import yaml from 'js-yaml';

export function loadYAML<T>(inputFile: string): T {
    const data: string = fs.readFileSync(inputFile, { encoding: 'utf-8' });
    return yaml.load(data) as any;
}

export function isYAML(inputFile: string): boolean {
    return inputFile.search(/\.yaml$/) > 0;
}
