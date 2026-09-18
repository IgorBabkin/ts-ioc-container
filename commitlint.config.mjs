const releaseTypes = new Set(['feat', 'fix', 'perf']);
const packageScopes = new Set(['ts-ioc-container', '@ts-ioc-container/react']);

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'release-package-scope': ({ type, scope }) => [
          !releaseTypes.has(type) || packageScopes.has(scope),
          'release-triggering commits must use an exact package scope',
        ],
      },
    },
  ],
  rules: {
    'release-package-scope': [2, 'always'],
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
        // Package scopes - required for feat/fix/perf commits.
        // release-monorepo-semantically (see CLAUDE.md > Release) matches a
        // commit to a package by comparing this scope against that package's
        // package.json `name` field exactly, so a feat/fix/perf commit must
        // use one of these two to trigger a release for that package.
        'ts-ioc-container',
        '@ts-ioc-container/react',

        // Core library scopes
        'container',
        'provider',
        'registration',
        'injector',
        'hooks',
        'token',
        'errors',
        'metadata',

        // CI/CD scopes
        'github', // GitHub workflows
        'perf', // CI performance improvements (use with ci: type)

        // Other scopes
        'release', // Release automation
        'deps', // Dependencies
        'config', // Configuration files
        'linter',
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
