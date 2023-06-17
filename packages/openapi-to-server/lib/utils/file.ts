import fs from 'fs';

export function saveFile(outputFile: string, content: string): void {
    fs.writeFileSync(outputFile, content, { encoding: 'utf-8' });
}

export function getFilenameWithoutPath(path: string): string {
    return path.split('/').pop() as string;
}

export function getPathToFileWithoutFileName(path: string) {
    return path.split('/').slice(0, -1).join('/');
}
