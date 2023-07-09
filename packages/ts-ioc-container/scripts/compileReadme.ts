import * as fs from 'fs';
import Handlebars from 'handlebars';
import './handlebarsHelpers.ts';

const content = fs.readFileSync('./README.template.md', 'utf8');
const template = Handlebars.compile(content);
fs.writeFileSync('./README.md', template({}), 'utf8');
