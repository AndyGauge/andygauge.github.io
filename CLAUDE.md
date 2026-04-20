# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Andrew Gauger's personal site at https://andygauge.github.io — Jekyll 3.9 (GitHub Pages) + Tailwind CSS, originally forked from `personal-jekyll-theme`.

## Toolchain

- Ruby 3.2.2 / Node 20.20.0 (pinned in `.tool-versions` — use `asdf install`)
- Jekyll 3.9 + `jekyll-paginate` (pagination path: `blog/page:num/`)
- Tailwind CSS 3.4 with `@tailwindcss/typography`

## Commands

```bash
bundle install                 # Ruby deps
npm install                    # Node deps
npm run build-css-prod         # Minified Tailwind -> css/tailwind.css (run before commit)
npm run build-css              # Tailwind watch mode (run alongside jekyll serve)
bundle exec jekyll serve       # Dev server at http://localhost:4000
bundle exec jekyll build       # Production build -> _site/
scripts/newpost "Post Title"   # Scaffold a new _posts/ entry
scripts/generate-tags          # Regenerate tag pages under tags/
```

Jekyll does NOT rebuild `css/tailwind.css` — run a Tailwind build before committing so the checked-in CSS matches template changes.

## Architecture — where to edit what

The home page is a stack of sections driven by data files. Follow this map:

| Change you want to make              | File to edit                                    |
| ------------------------------------ | ----------------------------------------------- |
| Reorder home sections / nav links    | `_data/sections.yml`                            |
| Add / edit a work sample             | `_data/samples.yml`                             |
| Add / edit a timeline event          | `_data/timeline.yml` (newest first)             |
| FAQ Q&A                              | `_includes/faq.html` (duplicate a card block)   |
| "What I Do" cards above the fold     | `_includes/intro.html`                          |
| Contact copy / email                 | `_includes/contact.html` + `site.email` in config |
| Site metadata, social links, header  | `_config.yml`                                   |
| Header typing animation code lines   | `_config.yml` under `lines:`                    |
| Blog post                            | `_posts/YYYY-MM-DD-slug.md` (or `scripts/newpost`) |

### How sections render

`_data/sections.yml` is an ordered list. Each entry has `id`, `label`, `include`, and optional `off_index_url`. That single file drives both:

- `_layouts/index.html` — loops the list and `{% include %}`s each `_includes/<include>.html`.
- `_includes/navigation.html` — builds the nav bar from the same list. When the user is on a non-home page, `off_index_url` (if set) is used instead of `/#<id>`; otherwise nav links scroll to `#<id>` on the home page.

To add a new home-page section: create `_includes/my-section.html` (with `<section id="my-section" ...>`), then add an entry to `_data/sections.yml`. Nothing else.

### Section partials use literal IDs

Each `_includes/<section>.html` has `<section id="...">` hardcoded to match its entry in `sections.yml`. Do not reintroduce `{{ page.section-type }}` indirection — the old fork-era mechanism (top-level stub HTML files + `pages_list` + nested `for page in site.pages` loops) was removed.

### Styling

- `tailwind.config.js` extends with semantic palettes: `github-*` (bg/border/text/accent) and `mastodon-*` (purple accents). Prefer these over raw hex.
- `src/input.css` defines component classes (`.btn`, `.btn-primary`, `.container-custom`, `.card-hover`, `.section-padding`). Reuse before inventing new combos.
- `override.css` still exists from the theme; check it before assuming Tailwind is the only style source.
- Tailwind's `content` globs (see `tailwind.config.js`) scan `_layouts/**`, `_includes/**`, `_posts/**/*.md`, and root-level `*.html` / `*.md` — NOT `_data/`. Keep class names in template HTML; don't stash them only in YAML strings.

### Blog posts

`_posts/YYYY-MM-DD-slug.md` with Jekyll front matter. Layout: `post`. Tags listed in front matter are picked up by `scripts/generate-tags` to create stub pages under `tags/`. The home-page blog section pulls `site.posts.first` via `_includes/latest-post.html`.

## Conventions

- GitHub Pages hosts from `master`; work on feature branches and PR into `master`. `_site/` is committed — rebuild before committing content changes so the deployed version matches.
- `_config.yml` has an `exclude:` list that keeps tooling files out of `_site/`. Add new top-level tooling files there.
- Home-page section content (samples, FAQ, timeline, intro cards) has been curated carefully. When adding new content, prefer appending a new entry/section over rewriting existing ones unless the user explicitly asks.
