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

## Offer / "Pick Any N" bundle system

Naseem-style fixed-price offers ("GET ANY 2 FOR ₹1,999").

**An offer is just a product.** A real product priced at the bundle price, with
the `offer` template suffix so it renders `templates/product.offer.json` at
`/products/<handle>`. No app is required for any of this to work.

### Files

| File | Role |
| --- | --- |
| `templates/product.offer.json` | the offer page template (offer-builder only, no related products — the sticky bar needs to be the last thing on the page) |
| `sections/offer-builder.liquid` | the offer page: banner image, badge/title/tagline/price/perks, one or more pick groups, sticky add-to-cart bar |
| `snippets/offer-group.liquid` | one "Choose N items from X" accordion + its product grid |
| `assets/offer-builder.js` | `<offer-builder>` custom element — per-group selection, live savings, `/cart/add.js` |
| `assets/section-offer-builder.css` | offer page styles |
| `snippets/offer-strip.liquid` | the "Buy 2 / Buy 3 / Buy 5" deal cards row (one card per offer product, each linking to its offer page) |
| `snippets/perfume-offers.liquid` | compact Naseem-style ticket carousel used on the product template via a custom-liquid section (renders from the `offer` collection; shows sample tickets in theme-editor design mode so the look is visible before any offer products exist) |
| `assets/section-offer-teaser.css` | deal card + teaser styles |
| `sections/offer-teaser.liquid` | standalone section wrapper around the deal cards (homepage etc.) |
| `sections/main-product.liquid` | hosts the **`offer_tickets` block** — this is how the deal cards get added under the buy button |

The deal cards everywhere fall back automatically to the store's **`offer` collection**
(no picker config needed): main-product's `offer_tickets` block, the homepage
`offer-teaser` section, and the "More offers" row at the bottom of every offer page
(`offer-builder` renders it via `offer-strip`, skipping the current offer product).

### Configuring an offer

Two interchangeable paths. Precedence for **who the customer can pick from** is:

```
configured Pick group block  >  offer.collection metafield  >  empty state
```

A Pick group block counts as *configured* once it has hand-picked products or a
collection on it. An empty block changes nothing, so a template can ship with a
block in place and still run off the metafield until someone curates it.
Everything else (badge/tagline/banner/perks/pricing) is still **metafield wins**.

1. **Theme editor** (no metafields needed). Duplicate the `offer` product template
   per offer, then set banner/badge/tagline/perks in the section and add one
   **Pick group** block per set (each with its own heading, pick count, and
   either hand-picked `products` or a `collection`). Multiple groups is how
   "choose 2 from A *and* 3 from B" works.

   **Per-offer templates**: `templates/product.offer-2.json`, `-3`, `-5` exist so
   each offer can be curated separately — hand-picking products in the shared
   `product.offer` template would apply to every offer at once. Point each offer
   product at its own template suffix (`offer-2` / `offer-3` / `offer-5`) in
   admin → product → Theme template.
2. **Metafields** (namespace `offer`, listed in
   `~/Desktop/SHOPIFY/offer-metafields/product.json` — kept outside the theme
   dir because the theme CLI rejects files in `config/` subfolders) —
   `badge`, `tagline`, `banner`, `perks`, `button_label`, `discount_type` +
   `discount_amount`, plus `collection` + `pick_count` + `group_heading` for a
   single-group offer. Setting `collection` **and** `pick_count` drives the picker
   whenever no Pick group block is configured, which is what lets many offer
   products share one template. `collection` may be a **comma-separated list** of handles
   (e.g. `men, women, unisex`) to merge several collections into one picker
   (products deduped across them).

**Store data created/published 2026-08-16 (not part of this repo):**
- Metafield definitions under Settings > Custom data > Products (namespace
  `offer`: `badge`, `tagline`, `collection`, `pick_count`, `group_heading`,
  `banner`, `perks`, `button_label`, `discount_type`, `discount_amount`).
- The `offer` collection (manual, handle `offer`).
- Three offer products, template `offer`, tag `offer`, fixed bundle pricing:
  `offer-for-2` ₹1,999 / `offer-for-3` ₹2,799 / `offer-for-5` ₹3,999, each with
  `offer.collection = "men, women, unisex"`, `pick_count`, `tagline` and
  `group_heading` set. All three products **and** the `offer` collection are
  published to the Online Store publication
  (`gid://shopify/Publication/113826693408`).
- Publishing was done with a per-user OAuth app token (client id
  `52fdcd05a37f7d2b71442b959b742f41`, client secret in the Dev Dashboard,
  redirect `https://shopify.dev/apps/default-app-home/api/auth`): exchange the
  `code=` from the redirect for `shpat_…` at
  `POST /admin/oauth/access_token`, then call `publishablePublish` with
  `input: { publicationId }` (2026-10 schema — `publicationIds` no longer
  exists). The token must be used with the `X-Shopify-Access-Token` header.
  Identity-exchanged `atkn_` tokens can never hold the `read_publications`
  scope — only a real OAuth grant can.
- `offer-for-3`'s metafields were written late (they were missing at first
  check) — if an offer page ever renders a generic "Choose N items" heading
  with an empty grid, its `offer.*` metafields are probably missing.

`badge` and `tagline` are also what the offer deal cards display, so an offer with
those two metafields set needs zero extra config to appear correctly on product pages.

### Pricing / how the discount holds

- Two pricing modes, chosen per offer via `discount_type`/`discount_amount`
  (section settings or metafields, metafields win):
  - **Fixed bundle price** (default): the offer product's own price, shown
    upfront on the page.
  - **Discount pricing** (`fixed` = ₹ off, `percent` = % off): the bundle price
    is *computed live* as the retail total of whatever the customer picks minus
    the discount — shown in the sticky bar as they select, and sent as
    `_bundle_price` at add-to-cart time. The page hero shows the discount as the
    callout (e.g. "Flat ₹1,000 OFF") instead of a fixed price.
- The page adds the picked perfumes as **ordinary cart lines**. The offer product
  never enters the cart — it only supplies the page and the pricing.
- Every line of one bundle carries the same properties: `Offer` (visible, the
  offer's name), `_bundle` (unique per add, so two bundles never merge),
  `_bundle_price` (decimal, e.g. `1999.00`) and `_bundle_size` (unit count).
- A **product discount function** (`~/Desktop/SHOPIFY/offer-transform-app`, a
  separate app, NOT this repo — see `README.md`) groups those lines by `_bundle`
  and discounts them down to `_bundle_price`. It's activated from Admin →
  Discounts as one automatic discount that covers every offer forever; nothing
  per-offer, because price and size travel on the cart lines.
- The function bails out when a bundle's units no longer match `_bundle_size`, so
  editing quantities in the cart reverts the bundle to full price.
- **Without the discount set up, offers add at full price** — the customer is
  over-charged, not under-charged. Set it up before linking customers to an offer.
- `cart-transform-legacy/` in the app folder is the superseded cart-transform
  approach; it needed an app backend to call `cartTransformCreate`, which is why
  it was dropped.

### Gotcha

`{% return %}` is not a Shopify Liquid tag — early-exit guards in these sections
use `{% if %}…{% else %}` around the whole body instead.

## Useful Shopify CLI commands

```
shopify theme dev --store=<store> --theme=<id>   # local dev server + live push to draft theme
shopify theme list --store=<store>               # list themes and their ids
shopify theme pull --store=<store> --theme=<id>   # pull remote theme state down locally
shopify theme push --store=<store> --theme=<id>   # one-time upload (not used mid-dev-session;
                                                    # theme dev already live-syncs)
```
