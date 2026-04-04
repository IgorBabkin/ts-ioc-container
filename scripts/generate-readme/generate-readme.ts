#!/usr/bin/env tsx

import * as fs from 'fs';
import Handlebars from 'handlebars';
import './handlebars-helpers';
import * as console from 'node:console';

const content = fs.readFileSync('./.readme.hbs.md', 'utf8');
const template = Handlebars.compile(content);
fs.writeFileSync(
  'README.md',
  template({})
    .replace(/from '\.\.\/\.\.\/lib'/g, "from 'ts-ioc-container'")
    .replace(/from '\.\.\/lib'/g, "from 'ts-ioc-container'"),
  'utf8',
);
const timestamp = new Date().toLocaleString();

console.log('\n┌───────────────────────────────────────────────┐');
console.log('│                                               │');
console.log('│   📚 README.md Generated Successfully! 📚    │');
console.log('│                                               │');
console.log('└───────────────────────────────────────────────┘');
console.log('\n✨ Generation Details:');
console.log(`  📝 File: README.md`);
console.log(`  🕒 Time: ${timestamp}`);
console.log(`  ✅ Status: Complete\n`);
console.log('───────────────────────────────────────────────────\n');
