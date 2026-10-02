#!/usr/bin/env node
// Writes tic.schema.json from the compiled zod config schema, so editors and code
// agents validate *.bundle.json / *.bundle.yaml against exactly what `tic build` accepts.
const { writeFileSync } = require('node:fs');
const path = require('node:path');
const { ticConfigJsonSchema } = require('../cjm/schema/ticConfigSchema');

const file = path.resolve(__dirname, '../tic.schema.json');
writeFileSync(file, `${JSON.stringify(ticConfigJsonSchema(), null, 2)}\n`);
console.log(`wrote ${path.relative(process.cwd(), file)}`);
