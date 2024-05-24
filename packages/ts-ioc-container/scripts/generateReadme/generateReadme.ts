import * as fs from 'fs';
import Handlebars from 'handlebars';
import './handlebarsHelpers';

const content = fs.readFileSync('scripts/generateReadme/README.hbs.md', 'utf8');
const template = Handlebars.compile(content);
fs.writeFileSync(
  'README.md',
  template({})
    .replace(/from '\.\.\/\.\.\/lib'/g, "from 'ts-ioc-container'")
    .replace(/from '\.\.\/lib'/g, "from 'ts-ioc-container'"),
  'utf8',
);
