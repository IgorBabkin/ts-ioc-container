# Documentation

This directory contains the Astro-based documentation for ts-ioc-container.

## Quick Start

From the project root:

```bash
# Install dependencies (first time only)
npm run docs:install

# Start local development server
npm run docs:dev
```

Or from the `docs` directory:

```bash
npm install
npm run dev
```

The site will be available at `http://localhost:4321/ts-ioc-container/`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the site for production
- `npm run preview` - Preview the production build locally

## Project Structure

```
docs/
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro  # Main layout component
│   ├── pages/
│   │   ├── index.astro       # Home page
│   │   ├── container.mdx     # Container documentation
│   │   ├── injector.mdx      # Injector documentation
│   │   ├── provider.mdx      # Provider documentation
│   │   ├── token.mdx         # Token documentation
│   │   └── registration.mdx  # Registration documentation
│   └── styles/
│       └── global.css        # Global styles
├── astro.config.mjs          # Astro configuration
└── package.json              # Dependencies and scripts
```

## Deployment

The documentation is automatically deployed to GitHub Pages via GitHub Actions when pushing to the `master` branch.

