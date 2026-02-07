# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal tech blog built with Astro (v5), deployed to GitHub Pages at https://sunhongmin225.github.io. Based on the Astro Blog starter template (Bear Blog theme). Uses MDX for rich content and generates RSS feed + sitemap. Supports **English and Korean** with path-prefix i18n routing (`/en/...`, `/ko/...`).

## Commands

```bash
bun run dev        # Start dev server at localhost:4321
bun run build      # Build production site to ./dist/
bun run preview    # Preview production build locally
bun run astro ...  # Run Astro CLI commands (e.g., astro add, astro check)
```

No test framework is configured. No linter is configured.

## Architecture

- **Astro v5** with strict TypeScript (`astro/tsconfigs/strict`)
- **Integrations**: `@astrojs/mdx`, `@astrojs/sitemap`, `sharp` (image optimization)
- **i18n**: Built-in Astro i18n with `prefixDefaultLocale: true` — both `/en/` and `/ko/` are prefixed
- **Content Collections**: Blog posts in `src/content/blog/{en,ko}/` as `.md`/`.mdx` files, schema defined in `src/content.config.ts`
- **Static site generation**: All pages are pre-rendered at build time

### i18n System

- `src/i18n/ui.ts` — Language config, `Lang` type, and `ui` object with all translatable UI strings
- `src/i18n/utils.ts` — Helper functions: `getLangFromUrl()`, `useTranslations()`, `getLocalizedPath()`, `getSlugFromId()`, `getLangFromId()`
- Blog posts are organized by language: `src/content/blog/en/post.md` gets `id: "en/post"`. Use `getLangFromId()` and `getSlugFromId()` to split.
- Root `/` redirects to `/en/` or `/ko/` based on `localStorage` preference, then browser language, then defaults to English
- `LanguageToggle.astro` — Pill-style toggle in the nav that saves preference to `localStorage`

### Key Files

- `src/consts.ts` — Site-wide constants (`SITE_TITLE`, `SITE_DESCRIPTION`) used by RSS feed
- `src/content.config.ts` — Blog collection schema (title, description, pubDate, updatedDate, heroImage)
- `astro.config.mjs` — Astro config with site URL, integrations, and i18n settings

### Page Routes

- `/` — Client-side redirect to `/en/` or `/ko/` (`src/pages/index.astro`)
- `/[lang]/` — Home page with intro + 4 most recent posts (`src/pages/[lang]/index.astro`)
- `/[lang]/blog` — Full blog listing (`src/pages/[lang]/blog/index.astro`)
- `/[lang]/blog/[slug]` — Individual blog posts (`src/pages/[lang]/blog/[...slug].astro`)
- `/[lang]/about` — About page with per-language content (`src/pages/[lang]/about.astro`)
- `/rss.xml` — RSS feed with all languages (`src/pages/rss.xml.js`)

### Layout & Components

All pages share a common structure: `BaseHead` (in `<head>`) + `Header` + `<main>` + `Footer`. All accept a `lang` prop.

- `BaseHead.astro` — Meta tags, OG/Twitter cards, font preloads, hreflang alternate links, imports `global.css`
- `BlogPost.astro` — Layout wrapper for blog posts and the about page
- `Header.astro` — Nav with localized site title, internal links, language toggle, and social links
- `HeaderLink.astro` — Nav link with active state detection for lang-prefixed paths
- `Footer.astro` — Localized copyright + social links
- `FormattedDate.astro` — Locale-aware date formatting (`en-US` / `ko-KR`)
- `LanguageToggle.astro` — Language switcher with `localStorage` persistence

### Blog Post Frontmatter

```yaml
title: string        # required
description: string  # required
pubDate: date        # required
updatedDate: date    # optional
heroImage: image     # optional, relative path to src/assets/ (use ../../../assets/ from en/ko subdirs)
```

### Adding New Blog Posts

Place posts in the appropriate language directory:
- English: `src/content/blog/en/my-post.md`
- Korean: `src/content/blog/ko/my-post.md`

Posts with the same slug in different languages are not automatically linked — they are independent content items.

## Deployment

Push to `main` triggers GitHub Actions (`.github/workflows/deploy.yml`): checkout -> Bun -> `bun install` -> `bun run build` -> deploy to GitHub Pages.
