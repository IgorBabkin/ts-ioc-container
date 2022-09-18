/* eslint-disable */
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
    ],
    rules: {
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/no-empty-function': 0,
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/ban-ts-comment': 0,
        '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
    },
};
