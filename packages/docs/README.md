# Documentation Setup

This directory contains the Astro-based documentation for ts-ioc-container.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Linting and Formatting

- **ESLint**: Configured with `eslint-plugin-astro` for Astro file linting
- **Prettier**: Configured with `prettier-plugin-astro` for Astro file formatting

### Commands

- `npm run lint` - Lint all files
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format all files with Prettier
- `npm run format:check` - Check formatting without making changes

## Configuration Files

- `eslint.config.mjs` - ESLint configuration for Astro files
- `.prettierrc.mjs` - Prettier configuration with Astro plugin
- `.prettierignore` - Files to ignore during formatting
