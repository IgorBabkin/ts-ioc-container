import fs from 'fs';
import path from 'path';

export class FileRepo {
    constructor(private basePath: string) {}

    save(filename: string, content: string): void {
        fs.writeFileSync(path.resolve(this.basePath, filename), content);
    }
}
