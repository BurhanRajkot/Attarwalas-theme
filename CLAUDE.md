# CLAUDE.md

Guidance for working in this repo. Read this before making changes.

## What this is

A Shopify **Online Store 2.0 Liquid theme** (Dawn-family architecture: JSON templates,
section groups, app blocks, `{% schema %}`-driven customizer settings) for the perfume/attar
brand **ATTARWALAS**. There is no build step, no `package.json`, and no npm/bun/webpack
pipeline of any kind — Liquid, CSS, and JS assets are served as-is by Shopify. `bun` and
`node` are installed on this machine but are **not part of this project's workflow**; don't
introduce a JS toolchain unless explicitly asked.

## Store connection

- Store: `attarwalas-4203.myshopify.com` (admin: `admin.shopify.com/store/attarwalas-4203`)
- Theme being edited: id `190519771424` — **unpublished/draft**, not the live theme
- Local dev server:
  ```
  shopify theme dev --store=attarwalas-4203.myshopify.com --theme=190519771424
  ```
  This pushes local file changes to that draft theme in real time and serves a local
  preview (auth is interactive/browser-based — must be run in a real terminal, not
  through a non-interactive process).

### Guardrails

- **Never publish this theme or touch the live theme.** Don't run `shopify theme publish`
  and don't add `--allow-live`/`-a` to any command. The whole point of the current setup is
  that this theme stays a draft until the user says otherwise.
- `shopify theme dev` auto-initialized a local git repo (no remote) purely for its own
  change history/backup. Don't push it anywhere or treat it as the project's real VCS setup
  unless the user asks to add a remote.

## Directory structure

```
assets/     Compiled-free CSS/JS/image assets, referenced directly by Liquid via asset_url
config/     settings_schema.json (defines customizer options) + settings_data.json
            (current values chosen in the customizer — logo, colors, type, per-section
            settings for non-JSON-template pages, app embed blocks, etc.)
layout/     theme.liquid (main HTML shell) + password.liquid (password-page shell)
locales/    Per-language storefront strings (*.json) and schema/customizer strings
            (*.schema.json) — 31 storefront languages currently present
sections/   Reusable page sections (.liquid) + section groups (header-group.json,
            footer-group.json) that compose the header/footer from smaller sections
snippets/   Small reusable Liquid partials (icons, price, product cards, forms, etc.)
templates/  One JSON (or occasionally .liquid) file per page type, each listing which
            sections render on that page and in what order (Online Store 2.0 model)
```

### Homepage (`templates/index.json`) section order

`image_banner` → `featured_collection` → `video_349Lry` → `video_etVdti` →
`slideshow_kLV8yc` → `slideshow_8BtiqX` → `rich_text_pxfThj` → `contact_form_tJcrJ4`

### Header/footer (section groups)

`sections/header-group.json` composes `announcement-bar` + `header`.
`sections/footer-group.json` composes the footer.
Editing a section's settings *within* a group JSON file is how you change header/footer
behavior (menu type, sticky behavior, padding, color scheme, etc.) since there's no single
`header.liquid` settings block driving all of it — `sections/header.liquid` and
`sections/footer.liquid` are the templates the group renders with those settings.

### Installed app embed blocks

Defined in `config/settings_data.json` under `current.blocks`:
- Judge.me Reviews (`judge-me-reviews`)
- SEOAnt Trust Badges (`seoant-trust-badges`)
- Globo Product Options (`globo-product-option`)

## Important gotcha: JSON-template section IDs are prefixed at render time

A section keyed `"image_banner"` in `templates/index.json` does **not** render as
`id="Banner-image_banner"` in the HTML. Shopify prefixes it with the template's numeric id,
e.g. `id="Banner-template--27733710668064__image_banner"`. That numeric id is
environment/instance-specific and not something to hardcode.

**When writing CSS/JS that targets one specific homepage section by id, use an attribute
selector instead of a plain id selector:**

```css
/* wrong — will silently never match */
#Banner-image_banner { ... }

/* right — matches regardless of the template's numeric id */
[id$="__image_banner"] { ... }
```

Verify what actually rendered before assuming a selector matches — e.g. while `theme dev`
is running:
```
curl -s http://127.0.0.1:9292/ | grep -o 'id="Banner-[^"]*"'
```

## Current intentional customizations (vs. theme defaults)

These were deliberately changed from the out-of-the-box values — don't "fix" them back
without checking with the user first:

- **Logo size**: `config/settings_data.json` → `current.logo_width` = `210` (default 100,
  was maxed at 300 before we sized it down)
- **Header padding**: `sections/header-group.json` → `header.settings.padding_top` /
  `padding_bottom` = `8` / `8` (range is step-of-4, 0–36; default was 20/20)
- **Homepage hero banner height**: `assets/section-image-banner.css` has a custom rule at
  the bottom of the file targeting `[id$="__image_banner"]` with `min-height: 70vh
  !important`, overriding the built-in `banner--large` preset (72rem desktop / content-driven
  on mobile) so the hero reads closer to a standard full-width hero banner rather than the
  theme's tallest built-in option or a full 100vh screen-filling banner.

## Useful Shopify CLI commands

```
shopify theme dev --store=<store> --theme=<id>   # local dev server + live push to draft theme
shopify theme list --store=<store>               # list themes and their ids
shopify theme pull --store=<store> --theme=<id>   # pull remote theme state down locally
shopify theme push --store=<store> --theme=<id>   # one-time upload (not used mid-dev-session;
                                                    # theme dev already live-syncs)
```
