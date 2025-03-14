import * as fs from 'fs';
import Handlebars from 'handlebars';
import './handlebarsHelpers';
import * as console from 'node:console';

const content = fs.readFileSync('scripts/generateReadme/README.hbs.md', 'utf8');
const template = Handlebars.compile(content);
fs.writeFileSync(
  'README.md',
  template({})
    .replace(/from '\.\.\/\.\.\/lib'/g, "from 'ts-ioc-container'")
    .replace(/from '\.\.\/lib'/g, "from 'ts-ioc-container'"),
  'utf8',
);
console.log('README.md generated successfully');
