import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

export class HandlebarsCompiler {
    constructor(private dirname: string) {}

    compile<T>(filename: string): (context: T, options?: RuntimeOptions) => string {
        return Handlebars.compile<T>(fs.readFileSync(path.resolve(this.dirname, filename), 'utf8'));
    }
}
