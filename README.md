# Emberfall

A mobile-first 2D game shell built with Svelte, PixiJS, Vite, and TypeScript.

## Local development

```bash
pnpm install
pnpm dev
```

Run the unit and integration tests with `pnpm test`, or use `pnpm test:watch` during development.

Run the headless Chromium browser tests with `pnpm test:e2e`. On a new machine, install the browser first:

```bash
pnpm exec playwright install chromium
```

Use `pnpm test:e2e:ui` to run the Playwright test runner in UI mode.

## GitHub Pages

The included GitHub Actions workflow builds on every push to `main` and publishes the production `dist` output to a dedicated `gh-pages` branch. Enable **Settings → Pages → Deploy from a branch → gh-pages / root** in repository settings.

The Vite base path defaults to `/prototype-emergent-rpg-01/`. For a differently named repository, set `VITE_BASE_PATH` to `/<repository-name>/` during the build.

For a local manual publish, run `pnpm deploy` after configuring a git remote. Dependency update PRs are configured with a seven-day Dependabot cooldown.
