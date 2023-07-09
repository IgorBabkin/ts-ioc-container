import Handlebars from 'handlebars';
import * as fs from 'fs';

Handlebars.registerHelper('include_file', (path: string) => {
    return fs.readFileSync(path, 'utf8');
});
