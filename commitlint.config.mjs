export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type enum - restrict to allowed types
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature (triggers release)
        'fix', // Bug fix (triggers release)
        'perf', // Performance improvement (triggers release)
        'docs', // Documentation only
        'test', // Test only
        'ci', // CI/CD only
        'chore', // Maintenance
        'refactor', // Code refactoring without behavior change
        'style', // Code style/formatting
        'revert', // Revert a previous commit
        'build', // Build system changes
      ],
    ],

    // Scope enum - restrict to known scopes
    'scope-enum': [
      2,
      'always',
      [
        // Core library scopes
        'container',
        'provider',
        'registration',
        'injector',
        'hooks',
        'token',
        'errors',

        // Documentation scopes
        'pages', // Documentation site pages (in docs/src/pages/)

        // CI/CD scopes
        'github', // GitHub workflows
        'perf', // CI performance improvements (use with ci: type)

        // Other scopes
        'release', // Release automation
        'deps', // Dependencies
        'config', // Configuration files
      ],
    ],

    // Require scope for all commits
    'scope-empty': [2, 'never'],

    // Subject case - allow sentence-case, start-case, pascal-case, upper-case
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],

    // Max subject length
    'subject-max-length': [2, 'always', 100],

    // Custom rules for project-specific conventions
    'scope-case': [2, 'always', 'lower-case'],
  },
};
