---
name: migrate-post
description: Migrate a blog post from any source to the personal blog (EN/KO)
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, WebFetch, AskUserQuestion, Task
---

# migrate-post

Migrate an externally published blog post to this personal blog in both Korean and English.

## Usage

```
/migrate-post <source-url>
```

## Known Sources

| Domain pattern | Company | KO attribution | EN attribution |
|---|---|---|---|
| `blog.blux.ai` | blux | blux 기술 블로그 | blux Tech Blog |
| `medium.com/delightroom` | DelightRoom | DelightRoom 기술 블로그 | DelightRoom Tech Blog |

## Procedure

### Step 1 — Detect source

Match the URL domain/path against the known sources table above.

- If the URL matches a known source, use the corresponding company name and attribution strings.
- If the URL does NOT match any known source, use `AskUserQuestion` to ask the user for:
  - Company name (English)
  - KO attribution name (e.g., "CompanyName 기술 블로그")
  - EN attribution name (e.g., "CompanyName Tech Blog")

### Step 2 — Fetch source content

Make two `WebFetch` calls to the source URL:

1. **Metadata fetch**: Extract the publication date (`pubDate`), title, subtitle/description (if present in the source), hero/featured image URL, and any inline image URLs.
2. **Full content fetch**: Get the **complete, verbatim Korean article body** — every paragraph, heading, list, code block, blockquote, and image reference. **Do NOT summarize or truncate.** If the content is very long, make multiple WebFetch calls with prompts targeting different sections to reconstruct the full article.

### Step 3 — Derive slug

Auto-generate a lowercase-hyphenated English slug from the article topic (e.g., `sealed-secrets`, `kafka-consumer-lag`).

Use `AskUserQuestion` to confirm the slug with the user before proceeding. Suggest your auto-generated slug as the recommended option and offer 1-2 alternatives.

### Step 4 — Hero image

From the metadata fetch, find the `featured_image`, `og:image`, or similar hero image URL.

- If an accessible image URL is found:
  1. Download it with `curl -fsSL -o src/assets/{slug}-hero.{ext}` (use the original file extension)
  2. Run `file src/assets/{slug}-hero.{ext}` to verify the actual image format
  3. If the detected format doesn't match the extension, rename to the correct extension
- If the image URL is broken, inaccessible, or missing: skip `heroImage` in the frontmatter entirely. Note this in the final report.

### Step 5 — Inline images

For each inline image found in the article body:

- If accessible: download to `src/assets/{slug}-{n}.{ext}` (where `{n}` is a sequential number starting from 1) and reference it as `![alt](../../../assets/{slug}-{n}.{ext})` in the markdown
- If broken/inaccessible: insert a `<!-- TODO: replace with actual image -->` comment at that position in the markdown

### Step 6 — Create KO post

Create `src/content/blog/ko/{slug}.md` with:

**Frontmatter:**
```yaml
---
title: "{original Korean title}"
description: "{original Korean subtitle/description from the source, or a 1-sentence summary only if the source has none}"
pubDate: {YYYY-MM-DD from source}
heroImage: ../../../assets/{slug}-hero.{ext}  # only if hero image was downloaded
---
```

**Body — in this exact order:**
1. Attribution blockquote:
   ```
   > **원문:** 이 글은 [{KO attribution name}]({source-url})에 게시된 글을 저자의 개인 블로그에 재게시한 것입니다.
   ```
2. Full article body — **verbatim** from the source. Preserve all headings, paragraphs, lists, code blocks, blockquotes, and formatting exactly as they appear in the original.

**Caution:** Do NOT include the hero image as an inline image in the body. The hero image is already rendered by the layout via the frontmatter `heroImage` field — duplicating it in the body shows it twice on the page.

**Reference:** `src/content/blog/ko/sealed-secrets.md`

### Step 7 — Create EN post

Create `src/content/blog/en/{slug}.md` with:

**Frontmatter:**
```yaml
---
title: "{naturally translated English title}"
description: "{naturally translated English version of the KO description}"
pubDate: {same YYYY-MM-DD}
heroImage: ../../../assets/{slug}-hero.{ext}  # only if hero image was downloaded
---
```

**Body — in this exact order:**
1. Attribution blockquote:
   ```
   > **Originally published** on the [{EN attribution name}]({source-url}). Republished here on the author's personal blog.
   ```
2. Naturally adapted English translation of the full article:
   - Keep the same section structure, headings, and all code blocks verbatim
   - Translate Korean code comments to English
   - Remove redundant parenthetical Korean-to-English definitions that are unnecessary in English
   - Use a direct, tutorial-style voice
   - Do NOT summarize or skip any sections — translate the complete article

**Caution:** Do NOT include the hero image as an inline image in the body. The hero image is already rendered by the layout via the frontmatter `heroImage` field — duplicating it in the body shows it twice on the page.

**Reference:** `src/content/blog/en/sealed-secrets.md`

### Step 8 — Build

Run `bun run build` from the project root. If there are errors, fix them before proceeding.

### Step 9 — Git workflow

Execute the following git workflow:

```bash
git checkout main
git pull origin main
git checkout -b feat/blog-{slug}
git add src/content/blog/ko/{slug}.md src/content/blog/en/{slug}.md src/assets/{slug}-*
git commit -m "Add {slug} blog post (EN/KO)"
git push -u origin feat/blog-{slug}
gh pr create --title "Add {slug} blog post (EN/KO)" --body "Migrated from {source-url}"
gh pr merge --merge
git checkout main
git pull origin main
git branch -d feat/blog-{slug}
git push origin --delete feat/blog-{slug}
```

### Step 10 — Report

Summarize the results:

- Confirm both posts were created and the PR was merged
- List the file paths for both posts
- List any downloaded images
- **Flag any placeholder images** (`<!-- TODO -->`) that need manual replacement
- Flag if hero image was skipped
