import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'prettier',
  ),
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },

    languageOptions: {
      parser: tsParser,
    },

    rules: {
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/no-unused-vars': 0,
      '@typescript-eslint/no-empty-function': 0,
      '@typescript-eslint/explicit-module-boundary-types': 0,
      '@typescript-eslint/ban-ts-comment': 0,
      '@typescript-eslint/no-empty-object-type': 0,

      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'no-public',
        },
      ],
    },
  },
];
