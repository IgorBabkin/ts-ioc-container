export function getFilenameWithoutPath(path: string): string {
    return path.split('/').pop() as string;
}

export function getPathToFileWithoutFileName(path: string) {
    return path.split('/').slice(0, -1).join('/');
}
