# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal tech blog built with Astro (v5), deployed to GitHub Pages at https://sunhongmin225.github.io. Based on the Astro Blog starter template (Bear Blog theme). Uses MDX for rich content and generates RSS feed + sitemap.

## Commands

```bash
npm run dev        # Start dev server at localhost:4321
npm run build      # Build production site to ./dist/
npm run preview    # Preview production build locally
npm run astro ...  # Run Astro CLI commands (e.g., astro add, astro check)
```

No test framework is configured. No linter is configured.

## Architecture

- **Astro v5** with strict TypeScript (`astro/tsconfigs/strict`)
- **Integrations**: `@astrojs/mdx`, `@astrojs/sitemap`, `sharp` (image optimization)
- **Content Collections**: Blog posts in `src/content/blog/` as `.md`/`.mdx` files, schema defined in `src/content.config.ts`
- **Static site generation**: All pages are pre-rendered at build time

### Key Files

- `src/consts.ts` — Site-wide constants (`SITE_TITLE`, `SITE_DESCRIPTION`) imported across pages
- `src/content.config.ts` — Blog collection schema (title, description, pubDate, updatedDate, heroImage)
- `astro.config.mjs` — Astro config with site URL and integrations

### Page Routes

- `/` — Home page with intro + 4 most recent posts (`src/pages/index.astro`)
- `/blog` — Full blog listing (`src/pages/blog/index.astro`)
- `/blog/[slug]` — Individual blog posts via `getStaticPaths()` (`src/pages/blog/[...slug].astro`)
- `/about` — About page (`src/pages/about.astro`)
- `/rss.xml` — RSS feed (`src/pages/rss.xml.js`)

### Layout & Components

All pages share a common structure: `BaseHead` (in `<head>`) + `Header` + `<main>` + `Footer`.

- `BaseHead.astro` — Meta tags, OG/Twitter cards, font preloads, imports `global.css`
- `BlogPost.astro` — Layout wrapper for blog posts and the about page
- `Header.astro` — Nav with site title, internal links (Home/Blog/About), and social links (GitHub/LinkedIn)
- `Footer.astro` — Copyright + social links

### Blog Post Frontmatter

```yaml
title: string        # required
description: string  # required
pubDate: date        # required
updatedDate: date    # optional
heroImage: image     # optional, relative path to src/assets/
```

## Deployment

Push to `main` triggers GitHub Actions (`.github/workflows/deploy.yml`): checkout -> Node 20 -> `npm ci` -> `npm run build` -> deploy to GitHub Pages.
