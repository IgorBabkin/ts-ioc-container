/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['../../.eslintrc.js'],
  overrides: [
    {
      files: ['jest.config.js', '.eslintrc.js'],
      env: {
        node: true,
      },
    },
  ],
};
