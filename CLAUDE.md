# CLAUDE.md

Guidance for working in this repo. Read this before making changes.

## Before submitting / launching this site

Outstanding items to resolve before this theme goes live — check this list before submitting.

- [ ] **Replace the dummy free-gift variants with a proper product collection.** The
      50ml perfume variants and 10ml/35ml roll-on variants (added 2026-08-22) use
      computed placeholder pricing (50ml = half the 100ml price; 10ml/35ml =
      linear scale off each product's existing 6ml/12ml pricing) entered directly
      as extra variants on the existing products, just to unblock the free-gift
      picker feature. Burhan is going to redo this properly via a product
      collection — swap the ad-hoc variants out for that once it exists, and
      update `snippets/free-gift-picker.liquid` / the qualifying-collection logic
      to match the new structure. See memory (`dummy-gift-variants-pending-collection-redo`)
      for details.
- [ ] **Add matching product variants for the new Fragrance metaobject entries.** As of
      2026-08-22, Burhan is bulk-importing fragrance entries into the `fragrance`
      metaobject via Matrixify (50+ entries added in one session, more expected — see
      "Customize Perfume — fragrance search picker" below). The metaobjects are just
      reference data; the "Customize Perfume" product (`customize-perfume-1`) still only
      has 5 fragrances wired up as real option values/variants (30 variants total: 5
      fragrances × 3 sizes × 2 types), each with its own price. A fragrance only appears
      in the storefront picker once it has a matching variant + price for every Size ×
      Type combo on that product — adding the metaobject alone does nothing on its own.
      Closing this gap means either Burhan keeps adding variants/pricing by hand in
      admin, a Matrixify variant import, or an Admin API bulk-create — in all cases the
      price per fragrance (or which pricing tier it falls into) has to come from Burhan.
- [ ] **Set a per-product perfumer photo/bio on each perfume product.** The "Perfumer
      bio" section (`sections/perfumer.liquid`) already supports a different photo, bio,
      name, and role per product — via that product's own metafields
      (`custom.perfumer_photo`, `custom.perfumer_bio`, `custom.perfumer_name`,
      `custom.perfumer_role`), set in admin under Products → [product] → Metafields.
      Nothing to build here, this already works and was verified live (2026-08-23). What's
      missing is the data: no product currently has these filled in, so every product page
      falls back to the one shared photo/bio set in the section's own settings in the
      Theme Customizer (Perfumer bio section → Photo/Bio text/Name fields) — which is
      why every product looked identical. Burhan needs to go through each perfume
      product and fill in its own Perfumer photo + bio to make them distinct.

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

The section's **"Offer settings come from"** setting (`config_mode`) decides
whether metafields are in play at all:

| `config_mode` | behaviour |
| --- | --- |
| `auto` (default) | metafield wins where set, section settings fill the gaps. Precedence for the picker: configured Pick group block > `offer.collection` metafield > empty state. For the **shared** `product.offer` template that many offer products use. |
| `editor` | metafields are ignored **completely**. The template's own settings and Pick group blocks are the only source, so the theme editor is exactly what the customer sees. For a **per-offer** template. |

`auto` mode is what makes an empty Pick group block silently fall back to the
metafield — handy for a shared template, confusing on a per-offer one. That's
why `product.offer-2/-3/-5.json` all ship with `config_mode: "editor"`.

A Pick group block counts as *configured* once it has hand-picked products, a
collection, or a list of collection handles on it.

1. **Theme editor** (no metafields needed). Duplicate the `offer` product template
   per offer, set `config_mode` to "Only this template", then set
   banner/headline/tagline/perks in the section and add one **Pick group** block
   per set. Each block takes, in priority order: hand-picked `products` >
   `collections` (comma-separated handles, e.g. `men, women, unisex` — merged and
   deduped, mirroring what the metafield can do) > a single `collection`.
   Multiple groups is how "choose 2 from A *and* 3 from B" works.

   **Per-offer templates**: `templates/product.offer-2.json`, `-3`, `-5` exist so
   each offer can be curated separately — hand-picking products in the shared
   `product.offer` template would apply to every offer at once. Point each offer
   product at its own template suffix (`offer-2` / `offer-3` / `offer-5`) in
   admin → product → Theme template.

   **As of 2026-08-17 none of the three offer products have been pointed at their
   own template** — all three still render the shared `product.offer` template
   (verified: `offer-for-2` shows the metafield group heading, not the
   `offer-2` template's "Choose any 2 perfumes"). Until that switch is made in
   admin, the per-offer templates are inert and every offer is driven by its
   `offer.*` metafields.
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
- The function's result uses `discountApplicationStrategy: 'ALL'` — **not**
  `FIRST`, which would apply only the first discount in the array and leave a
  free roll-on charged whenever a bundle sits in the same cart. Every discount
  targets its own cart lines, so `ALL` applies them all.
- **Without the discount set up, offers add at full price** — the customer is
  over-charged, not under-charged. Set it up before linking customers to an offer.
- `cart-transform-legacy/` in the app folder is the superseded cart-transform
  approach; it needed an app backend to call `cartTransformCreate`, which is why
  it was dropped.

### Gotcha

`{% return %}` is not a Shopify Liquid tag — early-exit guards in these sections
use `{% if %}…{% else %}` around the whole body instead.

## Free gift — "pick your free roll-on" in the cart

Backs the announcement-bar promise ("Buy 1 Perfume • FREE Roll-On"), which
was previously just text with nothing behind it.

| File | Role |
| --- | --- |
| `snippets/free-gift-picker.liquid` | the block itself: eligibility check, a dropdown of roll-ons, and the claimed state (chosen roll-on + ₹0 price + Change button) |
| `assets/free-gift.js` | `<free-gift-picker>` — add / swap / auto-remove the gift line, then re-render the cart sections |
| `assets/component-free-gift.css` | styles, incl. the `.cart-item__free-gift-tag` "Free gift" badge |

Rendered from **both** carts, inside `.js-contents` so Dawn's own quantity
refresh re-evaluates eligibility for free:
`sections/main-cart-items.liquid` (cart page) and `snippets/cart-drawer.liquid`.

Settings live in **Theme settings → Free gift** (`config/settings_schema.json`),
so one place drives both carts: on/off, the gift collection (defaults to
`attar-roll-ons`), the qualifying collection (defaults to `signature-series`,
id `435023937824` — this collection was titled/handled `non-alcoholic` when
this feature was built and got renamed since; the hardcoded Liquid fallback
handle was updated to match on 2026-08-22, see the "stale collection handle"
gotcha near the bottom of this section), and the copy.

### The gift size is matched to the bottle size (added 2026-08-21)

Perfumes now come in **50ml and 100ml** variants (added to all 6
`non-alcoholic` perfumes and the roll-on products alongside this feature: 50ml
perfumes priced at half the 100ml price, roll-on 10ml/35ml priced by linearly
scaling each product's existing 6ml/12ml pricing — see git history for the
exact numbers). A 50ml bottle earns a slot fillable **only** with a 10ml
roll-on; a 100ml bottle — or any size the snippet doesn't recognise, which
covers every perfume sold before 50ml existed — earns a slot fillable only
with a 35ml roll-on.

`free-gift-picker.liquid` tracks this as two separate pools (`_50` / `_100` in
the Liquid variable names and the `data-qualifying-50` / `data-claimed-50` /
`data-qualifying-100` / `data-claimed-100` attributes on `<free-gift-picker>`),
each rendering its own dropdown filtered to roll-on variants whose `option1`
(the Size option) contains `'10'` or `'35'` respectively. The bucket a
bottle/gift line belongs to is inferred by checking whether
`item.variant.option1 contains '50'` (bottles) or `contains '10'` (already-
claimed roll-ons) — not a stored property — so it's derived fresh from the
cart every render.

`free-gift.js`'s stale-slot trim (`trimExcess`) is bucket-aware too: each
claimed row carries `data-gift-bucket="50"` or `"100"`, and excess is computed
and trimmed per bucket. This matters because a flat/global trim could delete a
still-earned 35ml gift instead of the orphaned 10ml one when a 50ml perfume
line is removed from a mixed-size cart.

### How it works

- Eligible once the cart holds ≥1 item from the qualifying collection. The check
  walks `item.product.collections` per cart line — this works in the sections API
  too, verified.
- Choosing a roll-on adds an **ordinary cart line** with properties `Gift`
  (visible, so it lands on the order) and `_free_gift` (hidden marker everything
  else keys off).
- Swapping adds the new roll-on first, then removes the old line, so a failed add
  can't leave the customer with no gift.
- If the cart stops qualifying, `connectedCallback` removes the stale gift line
  (once per page load — `staleGiftRemovalTried` guards against a loop).
- `free-gift.js` re-renders the sections itself and deliberately does **not**
  publish `cartUpdate`: `cart.js` would re-fetch and overwrite the DOM it just
  wrote, racing it.

### What makes it ₹0 — the offer discount function

**The theme never fakes the price.** The "Free gift" badge only renders when
`item.final_line_price == 0`, so a missing discount is visible rather than
silent.

The zeroing is done by the **same discount function that prices the bundles**
(`~/Desktop/SHOPIFY/offer-transform-app`, extension `offer-discount`) — not by a
"Buy X get Y" automatic discount. Two reasons:

- Shopify runs **one** automatic product discount, so a separate Buy X get Y
  would compete with the bundle discount instead of stacking with it.
- Buy X get Y can't see `_free_gift`, so it would also zero a roll-on the
  customer deliberately added to buy. Keying off the marker means only the
  picked gift is free.

What the function does (`extensions/offer-discount/src/index.js`): it counts
total qualifying units in the cart (`qualifyingUnits`, size-agnostic — it
doesn't distinguish 50ml from 100ml, only the theme's picker does that), then
spends that budget **across every `_free_gift` line in cart order**, zeroing up
to `qualifyingUnits` worth of units total. A cart can hold several different
`_free_gift` lines at once (e.g. one 10ml roll-on line and one 35ml roll-on
line, from a mixed 50ml+100ml cart) and all of them get their fair share
zeroed, not just the first — so a customer who raises a slot's quantity past
what's earned only pays for the extra units on that line.

Line item properties come from the browser and can be forged, so eligibility is
re-checked in the function against **collection membership**, via
`inAnyCollection` in `src/run.graphql`. The collection ids are hardcoded there:

| collection | id | role |
| --- | --- | --- |
| `attar-roll-ons` | `482701836576` | line must be in it to count as a gift |
| `signature-series` (was `non-alcoholic`) | `435023937824` | a line in it unlocks the gift |

**These must match Theme settings → Free gift.** Changing either collection in
the customizer means editing `run.graphql` and redeploying, otherwise the picker
offers a roll-on the function refuses to discount. (Collection ids without admin
access: `curl -s https://attarwalas-4203.myshopify.com/collections/<handle> |
grep -o '"resourceId":[0-9]*'`.) The function keys on **id**, so the 2026-08-22
rename of this collection's handle/title didn't require redeploying it — only
the theme's hardcoded fallback handle (`snippets/free-gift-picker.liquid`) and
`cart_drawer_collection` in `config/settings_data.json` needed fixing, since
those referenced it by handle string.

Deploy after any change to the function: `shopify app deploy` from
`~/Desktop/SHOPIFY/offer-transform-app`. Nothing to create in admin — the
existing automatic discount picks up the new function version.

## Customize Perfume — fragrance search picker

The "Customize Perfume" product (`customize-perfume-1`, live product id
`10559302992160`) lets a customer pick which fragrance goes in the bottle. Its
"Search Your Fragrance:" option used to render as Dawn's default plain
button/dropdown list — unusable once there are more than a handful of values,
with no search and no scroll. Replaced 2026-08-22 with a searchable, scrollable
picker, explicitly **not** using the Globo Product Options app.

### Files

| File | Role |
| --- | --- |
| `snippets/fragrance-option-picker.liquid` | the picker itself: search box + scrollable list of radio/label rows |
| `assets/fragrance-picker.js` | `<fragrance-picker>` custom element — filters the list on input, Enter selects first visible match |
| `assets/component-fragrance-picker.css` | search box + scrollable list styling (custom scrollbar, selected/disabled states) |

Wired in via `snippets/product-variant-picker.liquid`: any product option whose
name contains `'Fragrance'` renders `fragrance-option-picker` instead of the
normal swatch/button/dropdown branch — every other option (Size, Type, and any
other product's options) is untouched. CSS/JS are loaded from
`sections/main-product.liquid` and `sections/featured-product.liquid`, gated
behind the same `option.name contains 'Fragrance'` check so they don't load on
pages that don't need them.

### How it works

- The picker still emits the exact same `<input type="radio">` + `<label>`
  markup Dawn's `button` picker type uses (just visually hidden radios), so
  `VariantSelects` in `assets/global.js` needs zero changes — price, URL, and
  cart submission all keep working exactly as before.
- **The picker only ever shows fragrances that already exist as real option
  values/variants on the product** — it reads `product.options_with_values`
  directly, nothing is hardcoded. It does not, and cannot, invent new variants:
  Shopify still needs a real variant (and a real price) for every Size × Type
  combo before a fragrance can appear.
- Search matches against each option value's Display Name **and** its Aliases,
  cross-referenced from the `fragrance` metaobject type (see below) by matching
  `f.display_name.value == value`. A fragrance option value with no matching
  metaobject entry still renders (search just falls back to matching the raw
  name).

### The `fragrance` metaobject

Namespace/type `fragrance`, fields (Liquid keys are the snake_case of the admin
label — confirmed for `display_name` and `fragrance_family`, the rest follow
the same pattern): `display_name`, `reference_name`, `aliases` (list),
`gender` (list), `fragrance_family`, `notes`, `occasion` (list), `season`
(list), `customization_available` (boolean), `globo_option_name`,
`shopify_product_url`, `similar_fragrances` (list), `top_notes` (list),
`heart_notes` (list), `base_notes` (list).

**This metaobject has no price field and never will drive price.** It's
reference/content data only (used for the picker's search index, and available
for future use like notes/family display). Pricing lives entirely on the
product's real variants (Size × Type × Fragrance), same as any other Shopify
product.

### Outstanding: metaobjects ≠ variants

Burhan is bulk-populating the `fragrance` metaobject via Matrixify (50+ entries
as of 2026-08-22, more ongoing). Adding a metaobject entry does **not** make it
sellable — see the checklist item at the top of this file. Until a matching
variant + price exists for a fragrance on `customize-perfume-1`, it simply
won't appear in the picker, which is correct/expected behavior, not a bug.

## Useful Shopify CLI commands

```
shopify theme dev --store=<store> --theme=<id>   # local dev server + live push to draft theme
shopify theme list --store=<store>               # list themes and their ids
shopify theme pull --store=<store> --theme=<id>   # pull remote theme state down locally
shopify theme push --store=<store> --theme=<id>   # one-time upload (not used mid-dev-session;
                                                    # theme dev already live-syncs)
```
