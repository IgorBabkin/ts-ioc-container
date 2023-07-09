import * as fs from 'fs';
import Handlebars from 'handlebars';
import './handlebarsHelpers.ts';

const content = fs.readFileSync('scripts/README.template.md', 'utf8');
const template = Handlebars.compile(content);
fs.writeFileSync('README.md', template({}), 'utf8');
