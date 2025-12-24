/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['../../.eslintrc.js'],
  overrides: [
    {
      files: ['.eslintrc.js'],
      env: {
        node: true,
      },
    },
  ],
};
