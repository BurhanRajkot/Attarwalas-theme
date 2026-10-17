# CLAUDE.md

# shopify theme dev --store=attarwalas-4203.myshopify.com --theme=190519771424

# shopify theme push --store=attarwalas-4203.myshopify.com --theme=190519771424 --allow-live

Guidance for working in this repo. Read this before making changes.

## Before submitting / launching this site

Outstanding items to resolve before this theme goes live — check this list before submitting.

## What this is

A Shopify **Online Store 2.0 Liquid theme** (Dawn-family architecture: JSON templates,
section groups, app blocks, `{% schema %}`-driven customizer settings) for the perfume/attar
brand **ATTARWALAS**. There is no build step, no `package.json`, and no npm/bun/webpack
pipeline of any kind — Liquid, CSS, and JS assets are served as-is by Shopify. `bun` and
`node` are installed on this machine but are **not part of this project's workflow**; don't
introduce a JS toolchain unless explicitly asked.

## Store connection

- Store: `attarwalas-4203.myshopify.com` (admin: `admin.shopify.com/store/attarwalas-4203`)
- Theme being edited: id `190519771424` ("Burhan theme") — **this is now the live/published
  theme** (`shopify theme list` confirmed `[live]` on 2026-09-17). It was still an
  unpublished draft when most of the notes below were written — Burhan published it at some
  point without this being logged here. Don't assume "draft" from older wording elsewhere in
  this file; changes pushed to this theme id are changes to the real storefront.
- Local dev server:

  ```

/  ```
  This pushes local file changes straight to the live theme in real time and serves a local
  preview (auth is interactive/browser-based — must be run in a real terminal, not
  through a non-interactive process).

### Guardrails

- **Pushing to this theme now means pushing to the live storefront.** `shopify theme push`
  targeting `190519771424` requires `--allow-live` in a non-interactive shell (the CLI
  refuses otherwise) — that flag is no longer a red flag by itself, but confirm with Burhan
  before pushing anything non-trivial or hard to eyeball-verify, the same as any other
  live-site change. Don't run `shopify theme publish` against a *different* theme id (that
  would swap which theme is live) without being asked.
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

- **Logo is text, not the image** (2026-09-14): `sections/header.liquid` renders
  `<span class="header__logo-text">{{ shop.name }}</span>` in place of `settings.logo`
  (remo.png). Styled in `assets/section-header-attarwalas.css` as Cormorant Garamond
  600, tracked 0.18em — measured against the image at equal cap height, so it reads
  identical. Changing the logo in Theme settings does nothing now; `logo_width` is unused.
- **Naseem-style header** (2026-09-14, modelled on naseemperfume.in):
  `header-group.json` → `menu_type_desktop: dropdown` (menu row on desktop, drawer
  only below 990px) and `sticky_header_type: always` (Burhan wants the header pinned while scrolling; the announcement bar scrolls away). On the homepage the header
  is transparent over the hero video (white text + soft dark shade) and turns solid on
  hover, focus, an open menu/search, or once scrolled. The hero sits under it via
  `margin-bottom: calc(-1 * var(--header-height))` on `.section-header`; an inline
  script right after `</sticky-header>` publishes `--header-height` before first paint
  so the hero doesn't jump. If the homepage's first section stops being the hero,
  that negative margin will pull the next section under the header instead.
  Transparent ↔ solid is one cross-fade: a `::after` background panel's opacity, the
  text/icon colours and the shade all share `--aw-header-dur`/`--aw-header-ease`
  (0.4s). Keep them on the same timing — a first version wiped the panel down while
  colours faded separately, which read as glitchy half-states. Going back to
  transparent has a 0.12s delay so sweeping the mouse across the header doesn't
  flicker. "Solid" triggers on `:has(:focus-visible)`, not `:focus-within`, or a
  click leaves the header stuck solid. Desktop dropdowns open on hover (inline script
  in `header.liquid`), and close on scroll if the pointer has left them. If sticky is
  ever switched back to on-scroll-up, the transform-based hide rules are still there. The header
  is full width (`max-width: none`), not capped at `--page-width`.
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

   **As of 2026-08-23 all three offer products are pointed at their own
   template** — `offer-for-2` renders `offer-2`'s own "Choose any 2 perfumes"
   heading (this was still the shared `product.offer` template as of
   2026-08-17; the switch was made in admin sometime after). Each per-offer
   template's own `include: "bottles"` setting on its Pick group block is what
   the "only perfumes" fix below actually depends on — if a future offer
   product ever gets pointed back at the shared `product.offer` template
   instead, it falls back to that template's block (currently unconfigured,
   metafield-driven), which still defaults to bottles-only with no explicit
   setting needed — see the note in `snippets/offer-group.liquid`.
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

### Every bottle in a pick group shares one Size (added 2026-08-23)

Each bottle card has its own Size `<select>`, and until now they were fully
independent — picking 50ML on one bottle left every other bottle at whatever
size it happened to default to, with no indication anything was inconsistent
until checkout. Reported by Burhan; fixed by locking the whole group to one
Size.

How it works (`assets/offer-builder.js`): every size pick — via the dropdown
(`onVariantChange`) or by freshly adding a card (`select()`) — calls
`syncGroupSize(sourceCard)`, which reads the option's `data-option1` (the Size
value specifically, added to each `<option>` in `snippets/offer-group.liquid`)
and applies the matching option to every other card **in the same group**,
whether that card is already in the bundle or not. There's no separate "locked"
state to fall out of sync — whichever size was picked most recently, anywhere
in the group, is what every card shows. Both the direct-pick and the
cascaded-from-a-sibling path go through one `applyVariantOption()` helper, so a
cascaded card updates identically to a manually-picked one (dataset, price
text, and the `<select>`'s own value all move together).

Matching is deliberately on `data-option1`, not the full variant title —
`item.variants` titles are the concatenation of every option (e.g. attar
roll-ons render `"6ML / Red"` for their Size + Box Colour), and matching the
whole string would try to force Box Colour to agree across products too. Size
alone is what should be forced.

Scoped per **group**, not globally: on the duo page, locking the perfume
group's size never touches the attar group (verified — cascading 50ML through
every perfume card left every attar card at its own default). A classic offer
(`offer-for-2/3/5`) has one group, so this reads as "the whole bundle."

### `offer-2/3/5` — perfumes **or** attar roll-ons, picked with a tab (added 2026-09-07)

Superseded the "perfumes only" rule below. Burhan asked for the offer pages to
offer roll-ons as well as the signature perfumes: "when a person opens bundle
for 2 he should see 2 options there 1 for roll on 1 for perfumes... the
discounts and everything for this remains the same."

Built as **choice mode**, a new `group_mode` setting on the Offer Builder
section: the Pick group blocks stop stacking down the page and become
mutually exclusive tabs, one on screen at a time. Each per-offer template now
carries two Pick group blocks — `group-1` "Perfumes" (`include: bottles`,
`men-3, women-1, unisex-3`) and `group-2` "Attar Roll-Ons"
(`include: rollons`, `attar-roll-ons`) — with the same `pick_count` and the
same discount as before (10% / 15% / 20%).

**One category per bundle, confirmed with Burhan 2026-09-07.** Switching tabs
*clears* what was picked on the tab being left (`setActiveGroup()` in
`assets/offer-builder.js`), so a bundle is never half perfumes and half
attars and `_bundle_size` always matches one group's count. If mixing is ever
wanted instead, that's the opposite change — don't clear, and count every
group — not a tweak to a setting.

Three things had to follow the active tab rather than the page, and all three
are easy to reintroduce as bugs:

- `data-total-pick-count` is the **first tab's** count, not the sum of every
  block's (`is_choice_mode` branch in `offer-builder.liquid`) — summing would
  demand 4 items on "Offer for 2". `setActiveGroup()` re-reads it per tab.
- `countingGroups()` returns just the open tab in choice mode. `ready`, the
  progress fill and `promptLabel()` all go through it; using `this.groups`
  directly would require the hidden tab to be filled too, leaving the add
  button permanently disabled.
- The revealed grid's arrows re-measure via `gridUpdaters` — while hidden its
  `clientWidth` is 0, so `update()` early-returns and the arrows never learn
  where they are.

Nothing changed in the discount function, and it needs no redeploy: it groups
by `_bundle` and never inspects product type. Verified live 2026-09-07 —
2 roll-ons on offer-for-2 (₹699 × 2 = ₹1,398) checked out of `/cart/add.js`
at ₹1,258.20 with an "Offer for 2" line discount on each line, and offer-5's
roll-on tab prices 5 × ₹699 = ₹3,495 down to ₹2,796.

The old rule still holds in one respect: a group's `include` setting is what
keeps bottles and roll-ons apart, and `bottles` remains the default, so the
shared `product.offer` template (one block, so choice mode can't engage) is
unaffected.

### Gotcha: roll-on Size values aren't cased consistently in admin

Found 2026-09-07 while putting roll-ons into a pick group for the first time.
Five roll-ons use `6ML`/`12ML` and four use `6ml`/`12ml` (Persian Rose,
Florence Orchidia, Arabian Jasmine, Pure Kashmiri Rose). The group size lock
matched `data-option1` exactly, so picking `12ML` on one card cascaded to the
four other uppercase products and silently **skipped the lowercase ones** —
exactly the mixed-size checkout that lock exists to prevent.

`syncGroupSize()` now compares lowercased. Perfume bottles are uniformly
uppercase so nothing changed for them. Normalising the option values in admin
would be the real fix; until then don't restore the exact `===` compare.

If a sibling card has no option at the target size (only possible if a group
mixes products whose Size sets don't fully overlap — not the case for any
current offer or duo group), it's left alone rather than guessed at.

### Mobile picker: one grid, one scroll axis (changed 2026-09-07)

`.offer-grid` is a plain CSS grid at **every** width now — 2 up on phones, 3 at
≥750px, 4 at ≥990px. It used to be a horizontal snap row on phones (`display:
flex`, `scroll-snap-type: x mandatory`, cards at `flex: 0 0 72%`) with prev/next
arrows above it, driven by a `setupGridScroll()` method in both
`offer-builder.js` and `duo-pairs.js`.

Why it changed: Burhan reported the offer pages felt fiddly on a phone. At
390px that row showed **1.6 cards**, so picking 3 items out of 15 meant swiping
sideways inside a page that also scrolls vertically, and the arrows sat *above*
the row where they read as decoration. 2 up puts ~4 products on screen.

Removed along with it: `.offer-grid__nav` / `.offer-grid__arrow*` CSS, the arrow
markup in `snippets/offer-group.liquid` **and** `sections/duo-pairs.liquid`, and
`setupGridScroll()` from both JS files (plus the `gridUpdaters` re-measure that
`setActiveGroup()` used to run after a tab switch — nothing needs measuring in a
grid). `sections/duo-pairs.liquid` loads `section-offer-builder.css` and shares
`.offer-grid` / `.offer-card` verbatim, so it moved in lockstep — if you restore
the carousel, restore it in both places or the duo page renders dead arrows.

Not to be confused with `.duo-teaser__grid` (`component-duo-pairs.css`), which
is still a horizontal peek strip on purpose — those are small square thumbnails,
not a picker.

### The sticky bar is `position: fixed`, not `sticky` (changed 2026-09-07)

Two bugs, one cause. `.offer-builder__bar` was `position: sticky; bottom: 0`
inside `<offer-builder>`:

1. **It parked ~32px above the footer.** A sticky element can never sit lower
   than its flow position, and `.offer-builder` carried `padding-bottom: 2rem`
   (plus Dawn's `.footer { margin-top: 12px }`), so it came to rest with white
   showing underneath. This is what Burhan pointed at.
2. **It scrolled away past the end of the picker** — the "More offers" strip
   plus the footer is ~1800px on a phone with no add-to-cart anywhere, so
   finishing a bundle meant scrolling back *up*.

Now fixed to the viewport bottom at every width. Because a fixed bar takes no
space in layout, `offer-builder.js` `publishBarHeight()` measures it (via
`ResizeObserver` — the height moves with one line vs two, the error message, and
`env(safe-area-inset-bottom)`), publishes `--offer-bar-h` on `<html>`, and adds
`offer-page` to `<body>`; the stylesheet turns that into `body.offer-page {
padding-bottom: var(--offer-bar-h) }`. The strip of body that uncovers below the
footer sits exactly behind the opaque bar, so it's never visible.

`observeBar()` and `.offer-builder__bar--docked` are gone — "docked" had no
meaning once the bar stopped being part of the flow.

`snippets/floating-stack.liquid` needed no change: its `pinnedToBottom` test now
simply always passes for this bar, which is the correct answer for a fixed one.

## Product card quick-add ("Choose options" on hover)

Rendered by `snippets/card-product.liquid` when called with
`quick_add_overlay: true` — that's `main-collection-product-grid` and
`featured-collection`. Styled in `assets/component-card.css` as
`.quick-add-overlay`: a brand-gold bar, full card width, that wipes up from the
image's bottom edge on hover with a shine sweep on button-hover. Hidden below
750px, since hover-to-reveal is unreachable on touch.

Reworked 2026-08-23 (it was Dawn's default grey `button--secondary` box
floating mid-image). Two non-obvious things came out of it — both easy to
reintroduce:

### The bar's colour has to be captured on `.card-wrapper`

`--color-button` is redefined **twice** between the card and the button:
`.card` carries its own color-scheme class (scheme-2, near-black) and the
button carries `.button--secondary` (pale grey). So reading `--color-button`
from the overlay or the button gives the wrong colour — the section's gold is
only still visible at `.card-wrapper`, which is above both. It's aliased there
into `--quick-add-bg` / `--quick-add-fg`, which nothing downstream redefines.

This is why the older copy of this treatment scoped to `featured-collection`
rendered **grey, not gold**, despite its comment claiming otherwise. That copy
has been deleted; the shared rules are the only source now. Don't re-add a
section-scoped copy.

### The overlay must be a sibling of `.card__media`, not a child

`.card__media` is `position: absolute; z-index: 0` — a stacking context. The
card's whole-surface link (`.card__heading a::after`) is `z-index: 1` in a
*higher* context, so anything nested inside `.card__media` is painted under it
no matter how large its z-index. The button was therefore **unclickable**:
clicks fell through to the link and went to the product page instead of opening
the quick-add modal. It had been that way since the overlay was added, which is
why it went unnoticed — the wrong behaviour looks like a working link.

Fixed by moving the `<div class="quick-add-overlay">` out of `.card__media` (it
is now a sibling, anchored by `.card__inner`, which covers the same box) and
raising it to `z-index: 3`. Verify after touching either file:

```js
// with the cursor over a card — the overlay is deliberately pointer-events:none otherwise
const b = document.querySelector('.quick-add-overlay .quick-add__submit');
const r = b.getBoundingClientRect();
document.elementFromPoint(r.x + r.width/2, r.y + r.height/2) === b;  // must be true
```

## Gotcha: the add-to-cart button's label is the *second* span

`snippets/buy-buttons.liquid` renders the buy button as an **icon span followed
by a label span**:

```html
<button name="add">
  <span class="product-form__submit-icon">{cart svg}</span>
  <span class="product-form__submit-text">Add to cart</span>
  {loading spinner}
</button>
```

Stock Dawn reads that label as `[name="add"] > span` — the button's *first*
child span — which in this theme is the **icon**. So every variant change wrote
"Add to cart" over the cart icon and left the real label untouched, rendering
**"Add to cartAdd to cart"** with the icon gone. Reported and fixed 2026-08-23;
reproduce by switching size/type on any multi-variant perfume.

`assets/global.js` now resolves it through `addButtonLabel()`, which prefers
`.product-form__submit-text` and falls back to Dawn's `:scope > span`. Both
callers use it — `toggleAddButton()` (add to cart / sold out) and
`setUnavailable()` (unavailable). **Any new code that sets this button's
wording must use `addButtonLabel()`, not `querySelector('span')`.**

Not affected: the sticky bar button (`sections/main-product.liquid`) has a bare
`<span>` label with no icon, so `product-sticky-bar.js`'s `querySelector('span')`
still finds the right node — but it would break the same way if an icon were
ever added to it.

Unrelated but worth knowing: on products with Globo options the app clones the
buy button and hides the original, and **both copies keep the same
`id="ProductSubmitButton-…"`**. Duplicate ids are invalid HTML, and
`getElementById` returns the clone (it comes first) — which happens to be the
visible one, so the fix above lands where the customer can see it.

## Duo — perfume + attar (skeleton, added 2026-08-23)

A duo is **an offer with two groups and no fixed pick count**: the customer
chooses how many perfumes and how many attars, and the price follows the
quantities. It reuses the offer machinery end to end — same section, same
snippet, same JS, same `_bundle` cart properties, same discount function. There
is no separate duo section or duo JS.

**Status: plumbing only.** `templates/product.duo.json` exists and is verified
working, but there is no duo product and no `duo` collection yet, so nothing is
reachable on the storefront. See the checklist at the top of this file.

### What made this possible

Two limits in the offer picker had to go, both additive and defaulted to the
old behaviour, so every existing offer page is byte-for-byte unaffected
(verified 2026-08-23 — `offer-for-2` still reads "Select 2 items" → "Select 1
more" → "Add bundle to cart" with a `0 / 2` pill and blocks a 3rd pick):

- **Quantity mode.** A Pick group block's "How many items" can now be *"Any
  quantity in a range"* (`pick_mode: range` + `min_pick`/`max_pick`) instead of
  an exact count. `offer-group.liquid` publishes `data-group-min` /
  `data-group-max` / `data-group-range`; `offer-builder.js` treats a group as
  satisfied when its count is within the range rather than equal to a number.
  Exact mode passes min = max, which is the original code path.
- **Roll-ons can be picked.** The picker used to drop every `attar-roll-ons`
  product unconditionally. A group's "Show" setting (`include`) is now
  `bottles` (default, unchanged) / `rollons` / `all`.

Supporting bits: `data-group-noun` ("perfume", "attar") so the sticky bar says
"Add 1 attar" rather than a useless "Select 1 more"; `steps_first_line`,
`price_note`, `more_offers_collection`, `card_pill_label` and `card_cta_label`
settings so the offer copy can read as a duo; `pill_label`/`cta_label` params
on `offer-strip.liquid`.

### Pricing — nothing new was built

Duos use the **existing discount pricing mode** (`discount_type: percent`,
`discount_amount: 20` in `product.duo.json` — the same 20% the offer templates
already use). Bundle price = retail total of what's picked − discount,
recomputed on every quantity change, and it travels to the cart as
`_bundle_price` on ordinary cart lines exactly like an offer. Verified: the
add-to-cart payload for 5 perfumes + 1 attar is two lines carrying the same
`_bundle`, `_bundle_price: "12555.20"`, `_bundle_size: "6"`. **The
`offer-discount` function needs no change and no redeploy** — it groups by
`_bundle` and never inspects product type.

A fixed bundle price is the wrong tool here: it would charge the same for one
perfume + one attar as for five of each.

### Gotcha: which collection is which

`men` / `women` / `unisex` are the **roll-on** collections. The bottle ones are
`men-3` / `women-1` / `unisex-3` (what `product.offer-2.json` uses, and what
`product.duo.json` now uses for its perfume group). Getting this backwards is
silent — the duo's perfume group first rendered an empty grid because it was
pointed at `men`/`women`/`unisex` and the bottles filter removed everything.
That's exactly why `include` checks `attar-roll-ons` membership per product
instead of trusting the chosen collection, and why a group whose products all
get filtered out now prints an explicit reason in the theme editor instead of
rendering a blank row.

### Open question for Burhan

A duo whose perfume is in `signature-series` also earns a free roll-on from the
cart's free-gift picker, on top of the duo discount. Nothing prevents that
today — decide whether duos should be excluded before this goes live.

## Cart — pill buttons and a compact quantity stepper (added 2026-08-23)

Reported by Burhan: cart buttons read square and oversized. Confirmed the
cause — `assets/component-cart-redesign.css` (the existing cosmetic-cleanup
file, loaded after Dawn's stock cart CSS in both `sections/main-cart-items.liquid`
and `snippets/cart-drawer.liquid`) handled spacing/type/color but never touched
shape. Every cart button was inheriting the theme's global corner-radius
setting (`buttons_radius` in the customizer, currently `0`) with no scoped
override — unlike the product page, which already has one (see
`[id^="MainProduct-"] .product-form__buttons .button` in
`section-main-product.css`).

**Deliberately not fixed by raising the global `buttons_radius` setting.**
That setting is shared site-wide, and the offer-builder page's buttons are
**square on purpose** — see the design-language comment at the top of
`section-offer-builder.css`. Raising it would round those too. Instead the
cart gets the same kind of scoped override the product page already has:

- `.cart-drawer .button`, `cart-items .button`, `#main-cart-footer .button`
  (and their `:before`/`:after`, which draw Dawn's ring/shadow pseudo-elements
  at their own radius) → `border-radius: 999px`. Covers checkout, "Continue
  shopping", remove, close, and the quantity-rules info toggle in one rule,
  since none of them share a more specific class worth targeting individually.
- `.cart-item .quantity` → shrunk from Dawn's stock 14rem × 4.5rem box to
  11rem × 3.8rem and rounded to match, mirroring the pill treatment already
  on the product page's own quantity control (different scope, so the two
  can't collide). `.quantity__button` width comes down with it so the total
  box actually shrinks rather than just its wrapper.
- `.free-gift__change` (`assets/component-free-gift.css`) → same pill radius,
  since it's a real interactive control sitting in the same cart row as
  everything else — the static "FREE GIFT" / "OFFER FOR 2" tags next to it
  were left alone, they're labels, not buttons.

Verified: AJAX quantity +/- still works in the drawer (1 → 2 → 1, no reload,
no console error) — this file's own stated rule is spacing/type/color/shape
only, never markup or class names cart.js depends on, and this addition
follows that.

### Gotcha: `.discounts__discount` needs `!important`

Reported by Burhan as "looks cluttered" — the "YOUR FREE ROLL-ON" /
"OFFER FOR N" tag under each cart line was rendering as a full-width bordered
box (Dawn's stock `display: flex`), not the small pill this file's own rule
sets (`display: inline-flex`). Cause: `snippets/cart-drawer.liquid` (and its
`stylesheet_tag` includes, among them `component-discounts.css`) renders on
**every page**, including `/cart` itself — so on the cart page,
`component-discounts.css`'s plain `display: flex` can land in the DOM a
second time *after* this file's `inline-flex`, silently winning the cascade
back. Fixed by adding `!important` to the `display` declaration, the same
tool this file already uses for `.discounts { margin-top: 0.6rem !important }`
one rule up, for the identical reason.

If a future edit to this rule drops the `!important` "because it looks
unnecessary," it'll pass every visual check taken in isolation and then
silently break again the moment `cart-drawer.liquid`'s own stylesheet ordering
shifts — verify by checking `document.styleSheets` order in the browser, not
just the source file, before removing it.

### The discount-name tag is hidden on free-gift lines specifically

Follow-up to the above, also reported by Burhan: after the tag became a
small pill instead of a broken box, a free-gift line still showed it —
"Your free roll-on" (the discount function's own line title) sitting right
next to the "Free gift" badge (`.cart-item__free-gift-tag`), saying the same
thing twice. Fixed in both `sections/main-cart-items.liquid` and
`snippets/cart-drawer.liquid`: the `.discounts` list is now wrapped in
`{% unless item.properties._free_gift != blank and item.final_line_price == 0 %}`
— the exact condition the free-gift badge itself already uses, so the two
stay in sync by construction rather than by two copies of the same check
drifting apart. Every other discounted line (offer bundles, duo) is
unaffected — its discount tag is the *only* thing telling the customer why
that line is discounted, so it still needs to show.

## Free gift — "pick your free perfume" in the cart

Backs the announcement-bar promise ("Buy 1 Perfume • FREE Roll-On" — the
announcement bar copy is stale as of 2026-08-29, see below), which was
previously just text with nothing behind it.

**The gift changed from a roll-on to a small-size perfume bottle on
2026-08-29** (Burhan: "instead of roll on we have option to give signature
collection... just 35 and 10 ml"). The gift pool is now the **signature-series
collection itself** — a customer earns a free 10ml (or 35ml) bottle of *any*
signature-series perfume, not a roll-on. Roll-ons are unaffected as a product
line; they're just no longer the gift source. Update the announcement bar copy
in the theme editor when convenient — it still says "FREE Roll-On".

| File | Role |
| --- | --- |
| `snippets/free-gift-picker.liquid` | the block itself: eligibility check, a dropdown of gift perfumes, and the claimed state (chosen perfume + ₹0 price + Change button) |
| `assets/free-gift.js` | `<free-gift-picker>` — add / swap / auto-remove the gift line, then re-render the cart sections |
| `assets/component-free-gift.css` | styles, incl. the `.cart-item__free-gift-tag` "Free gift" badge |

Rendered from **both** carts, inside `.js-contents` so Dawn's own quantity
refresh re-evaluates eligibility for free:
`sections/main-cart-items.liquid` (cart page) and `snippets/cart-drawer.liquid`.
The checkout-blocking logic in `sections/main-cart-footer.liquid` and
`snippets/cart-drawer.liquid` duplicates the same eligibility math (Liquid has
no way to share a computed value across snippet scopes) and has its own copy
of the gift-collection fallback — keep all of these in sync if the fallback
ever changes again.

Settings live in **Theme settings → Free gift** (`config/settings_schema.json`),
so one place drives both carts: on/off, the gift collection (defaults to
`signature-series`), the qualifying collection (also defaults to
`signature-series`, id `435023937824` — this collection was titled/handled
`non-alcoholic` when the feature was first built and got renamed since), and
the copy. **Gift collection and qualifying collection are now the same
collection by default** — this is new as of 2026-08-29 and is the reason for
both gotchas below (exact-match, and the function's variant-size check).

### Qualifying purchases: signature-series + Customize Perfume, never roll-ons (added 2026-08-31)

Burhan: "i want this free perfume only in the signature series and customize
not in attar roll ons." Checked live first — roll-ons already didn't qualify
(they're in their own `attar-roll-ons` collection, separate from
`signature-series`), but **Customize Perfume didn't qualify either**, and
Burhan wants it to.

Customize Perfume (`customize-perfume-1`) isn't in, and deliberately isn't
being added to, the `signature-series` collection — that collection also
drives the price-card fix and the Size-picker hiding above, both scoped to
"products in this collection," and dumping an unrelated product into it would
also make it show up on the `/collections/signature-series` grid. Instead
every qualifying-eligibility check now OR's in a handle check
(`item.product.handle == 'customize-perfume-1'`) alongside the existing
collection-membership check:

- `snippets/free-gift-picker.liquid` (the picker itself)
- `sections/main-cart-footer.liquid` and `snippets/cart-drawer.liquid`
  (checkout-blocking math)

A Customize Perfume line's `option1` is a Fragrance name, never `'50ML'`, so
it always falls into the existing "unrecognised size" fallback and earns the
35ml gift bucket — same safe default already used for any signature-series
variant title the bucket logic doesn't recognise.

**Update 2026-08-31: the product-page pre-pick picker now covers Customize
Perfume too** (`snippets/product-gift-picker.liquid` and
`sections/main-product.liquid`'s `product_gift_eligible` both got the same
handle exception) — see the Globo gotcha section below for why. Originally
left out on purpose (claiming only happened in the cart for this product),
but that gap is what let a broken Globo dropdown stand in for it unnoticed.

**This also required updating the pricing app, not just the theme.** The
₹0 discount is applied by a separate app
(`~/Desktop/SHOPIFY/offer-transform-app`, extension `offer-discount` — see
"What makes it ₹0" below), which re-checks eligibility server-side via
collection membership only (`isQualifyingProduct` in `src/run.graphql`).
Without updating it too, the theme would have shown the gift as claimable and
unblocked checkout for a Customize Perfume purchase, but the discount function
would never actually zero the gift line's price — the customer would be
charged full price for what the UI told them was free. Fixed the same way,
by handle: `run.graphql` now also fetches `product.handle`, and
`index.js` OR's `product?.handle === 'customize-perfume-1'` into
`isQualifyingProduct`. **Needs `shopify app deploy` from
`~/Desktop/SHOPIFY/offer-transform-app` to take effect** — Burhan runs this
himself, same as theme dev (see [[user-runs-shopify-cli-commands]] in memory).

### Gotcha: the checkout button never learned the gift was claimed (fixed 2026-08-31)

Burhan reported picking the free gift in the cart and still seeing "Pick your
free perfume above to continue" with checkout disabled. Reproduced live: the
cart line was added correctly (₹0, `_free_gift` set, `qualifying_units ==
claimed_units`), and re-fetching the footer section's HTML directly confirmed
the server-side Liquid was computing `gift_pending: false` correctly — the bug
was purely that the browser never saw that new HTML.

Both `assets/cart.js` (Dawn's own quantity-change AJAX) and `assets/free-gift.js`
patch `#main-cart-footer` by finding its `.js-contents` child and replacing
its `innerHTML` wholesale. But in `sections/main-cart-footer.liquid`,
`.js-contents` only wrapped the **subtotal** block's markup — the checkout
`<button>` and its `gift_pending`-driven `disabled`/note lived in a sibling
`<div class="cart__ctas">` block one level up, entirely outside that wrapper.
So the subtotal/price *did* refresh live, but the button's disabled state
stayed frozen at whatever it was on the last full page load, no matter what
triggered the re-render (this affected native quantity changes too, not just
the gift picker — same root cause).

Fixed by moving `.js-contents` up to wrap the whole `.cart__blocks` container
(both the subtotal block and the CTA block), so a single wholesale replace
reaches the button too. Don't re-narrow that wrapper back down to just the
subtotal block, and don't add a second `.js-contents` inside it — both
`cart.js` and `free-gift.js` grab only the *first* `.js-contents` match via
`querySelector`, so two of them in the same section would silently mean the
second one (whichever it is) never gets refreshed again.

### The gift size is matched to the bottle size (added 2026-08-21)

Signature-series perfumes come in **100ml, 50ml, 35ml and 10ml** variants (the
50ml size was added 2026-08-21 at half the 100ml price; the 10ml/35ml gift
sizes were added 2026-08-29 at 10%/35% of the 100ml price — see git history
for the exact numbers per product). A 50ml bottle earns a slot fillable
**only** with a 10ml gift perfume; a 100ml bottle — or any size the snippet
doesn't recognise, which covers every perfume sold before 50ml existed —
earns a slot fillable only with a 35ml gift perfume.

`free-gift-picker.liquid` tracks this as two separate pools (`_50` / `_100` in
the Liquid variable names and the `data-qualifying-50` / `data-claimed-50` /
`data-qualifying-100` / `data-claimed-100` attributes on `<free-gift-picker>`),
each rendering its own dropdown filtered to gift variants whose `option1` (the
Size option) is **exactly** `'10ML'` or `'35ML'`. The bucket a bottle/gift
line belongs to is inferred by checking whether `item.variant.option1 ==
'50ML'` (bottles) or `== '10ML'` (already-claimed gifts) — not a stored
property — so it's derived fresh from the cart every render.

**Gotcha: exact match, never `contains`.** Before 2026-08-29 this logic used
`option1 contains '10'`/`contains '50'`, which was safe when the gift pool was
roll-ons (only sizes 6/12/10/35ml). Once the gift pool became the same
perfumes that also come in **100ML**, `contains '10'` would match "100ML" too
(it contains the substring "10") — silently treating a customer's own
full-price 100ml bottle as the 10ml gift variant. Every Size comparison in
`free-gift-picker.liquid`, `sections/main-cart-footer.liquid`, and
`snippets/cart-drawer.liquid` must stay an exact `==` check. Don't reintroduce
`contains` here.

`free-gift.js`'s stale-slot trim (`trimExcess`) is bucket-aware too: each
claimed row carries `data-gift-bucket="50"` or `"100"`, and excess is computed
and trimmed per bucket. This matters because a flat/global trim could delete a
still-earned 35ml gift instead of the orphaned 10ml one when a 50ml perfume
line is removed from a mixed-size cart.

**Gotcha: claimed rows must render even when `qualifies` is false.** Found
live 2026-08-30 (Burhan: remove the perfume that earned a gift, and the gift
line stayed in the cart). The claimed-rows loop used to be wrapped in `{%- if
qualifies -%}`, and `qualifies` is only true when `qualifying_units > 0` —
so the moment the qualifying perfume was removed (`qualifying_units` drops to
0), the claimed row's markup (and its `data-gift-line-key`) simply never
rendered at all, meaning `trimExcess` had nothing to find and nothing to
remove. Fixed by changing the condition to `{%- if qualifies or claimed_units
> 0 -%}`, so a claimed row keeps rendering — and stays trimmable — for as
long as a gift line actually exists, independent of whether the cart still
currently qualifies.`remaining_50`/`remaining_100` are unaffected (they're
already clamped to 0), so no new "pick more" prompt appears alongside it.

Fixing this alone wasn't enough — see "a claimed gift line must never count
toward its own eligibility" further down, in the discount function section.
Both bugs produced the identical customer-visible symptom (gift never goes
away) from two unrelated causes: this one hid the row from the trim JS,
the other kept the discount function itself perpetually re-earning the gift.

### How it works

- Eligible once the cart holds ≥1 item from the qualifying collection. The check
  walks `item.product.collections` per cart line — this works in the sections API
  too, verified.
- Choosing a gift perfume adds an **ordinary cart line** with properties `Gift`
  (visible, so it lands on the order) and `_free_gift` (hidden marker everything
  else keys off).
- Swapping adds the new gift first, then removes the old line, so a failed add
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
- Buy X get Y can't see `_free_gift`, so it would also zero a gift perfume the
  customer deliberately added to buy at full price. Keying off the marker
  means only the picked gift is free.

What the function does (`extensions/offer-discount/src/index.js`): it counts
total qualifying units in the cart (`qualifyingUnits`, size-agnostic — it
doesn't distinguish 50ml from 100ml, only the theme's picker does that), then
spends that budget **across every `_free_gift` line in cart order**, zeroing up
to `qualifyingUnits` worth of units total. A cart can hold several different
`_free_gift` lines at once (e.g. one 10ml gift line and one 35ml gift line,
from a mixed 50ml+100ml cart) and all of them get their fair share zeroed, not
just the first — so a customer who raises a slot's quantity past what's earned
only pays for the extra units on that line.

Line item properties come from the browser and can be forged, so eligibility is
re-checked in the function against **collection membership**, via
`inAnyCollection` in `src/run.graphql`:

| collection | id | role |
| --- | --- | --- |
| `signature-series` (was `non-alcoholic`) | `435023937824` | line must be in it to count as a gift, AND a line in it unlocks the gift |

**Gotcha: the variant-size safeguard.** Before 2026-08-29 the gift collection
(`attar-roll-ons`) and the qualifying collection (`signature-series`) were
disjoint, so `isGiftProduct` and `isQualifyingProduct` could never both be true
for the same line — that was what made collection membership alone a safe
check. Now that both roles point at the **same** collection, a forged
`_free_gift` property (properties come from the browser and can be forged) on
a line for a customer's own full-price 100ml bottle would pass the collection
check too. `run.graphql` also queries the variant's own `title` (these
products have a single option, so title IS the Size value, e.g. `"10ML"`), and
`index.js`'s `isGiftLine` additionally requires `variantTitle === '10ML' ||
variantTitle === '35ML'` before zeroing anything. Don't remove this check
while gift and qualifying collection remain the same collection.

**Gotcha: a claimed gift line must never count toward its own eligibility.**
Found live 2026-08-30 (reported by Burhan: remove the perfume that earned a
gift, and the gift stayed free forever instead of reverting to full price).
Cause: `qualifyingUnits` was being summed from every line where
`product.isQualifyingProduct` is true — and a claimed 10ml/35ml gift line
*is itself* a signature-series product, so it was silently counting toward
its own qualifying budget. Once earned, a gift kept re-earning itself
indefinitely, even after the real full-price purchase that unlocked it was
removed. Fixed in `index.js` by computing `isGiftLine` first and excluding
it from the `qualifyingUnits` sum (`if (product?.isQualifyingProduct &&
!isGiftLine) qualifyingUnits += line.quantity;`). Any future change to this
loop must keep gift lines excluded from their own qualifying count — this is
easy to reintroduce by accident since both checks read the same
`isQualifyingProduct`/`isGiftProduct` fields off the same collection.

The theme-side symptom of this bug looked identical to a completely
different, purely cosmetic issue also fixed 2026-08-30 (see "Claimed rows
must render even when qualifies is false" in the free-gift section below) —
both manifested as "the gift line doesn't go away after removing the
perfume." Fixing only the theme-side rendering bug would have done nothing
on its own, since the discount function was the one actually keeping the
line priced at ₹0 — always check what the function itself is doing before
assuming a leftover cart line is a front-end rendering problem.

**These collection ids must match Theme settings → Free gift.** Changing
either collection in the customizer means editing `run.graphql` and
redeploying, otherwise the picker offers a gift the function refuses to
discount. (Collection ids without admin access: `curl -s
https://attarwalas-4203.myshopify.com/collections/<handle> | grep -o
'"resourceId":[0-9]*'`.) The function keys on **id**, so a future rename of
this collection's handle/title won't require redeploying it — only the
theme's hardcoded fallback handle (`snippets/free-gift-picker.liquid`,
`sections/main-cart-footer.liquid`, `snippets/cart-drawer.liquid`) would need
fixing, since those reference it by handle string.

Deploy after any change to the function: `shopify app deploy` from
`~/Desktop/SHOPIFY/offer-transform-app`. Nothing to create in admin — the
existing automatic discount picks up the new function version.

### Gotcha: a legacy Globo Product Options field duplicated this whole feature

Discovered 2026-08-29 when Burhan reported "Select 6ml Free Roll-On" text and
having to re-pick a fragrance on the cart page. Neither symptom came from
this theme's code at all — a **Globo Product Options** app option set
(installed app embed block `globo-product-option`, see "Installed app embed
blocks" above), configured directly in the Globo app's own admin UI, not in
any file in this repo. It added a *required* dropdown ("Select 6ml Free
Roll-On") to the exact same 6 signature-series products, asking the customer
to pick a fragrance before they could add to cart, and it re-ran (re-prompting
the same required field) on the cart page — that's what caused the "have to
select again" complaint.

This predates the current cart-based free-gift picker and is a strictly
inferior, redundant version of the same idea: it only records the customer's
pick as a **line-item property**, it never adds a real priced/discountable
cart line, and it was still hardcoded to "6ml" from before the 50ml/100ml/
10ml/35ml sizing existed. Confirmed via curl (`ons[<id>] = {...}` blob
embedded in the product/cart page HTML — search for `"label":"Select 6ml
Free Roll-On"`) rather than guessing, since this class of app-injected UI is
invisible to a grep of the theme's own files.

Deactivated (set to Draft, not hard-deleted — reversible) on 2026-08-29 in
Globo's own admin: Apps → Globo Product Options → Option Sets → the set
confusingly named **"New Option Set"** (id `684548`, 6 products, field
labeled "Select 6ml Free Roll-On"). Globo's admin-facing option-set **Name**
does not necessarily match the customer-facing field **Label** — don't trust
the Name column alone when hunting for a specific field; open each set and
check its actual field label. The store's other option sets ("Search Your
Fragrance", "35ml complimentary", both "GPO_DEMO", "New option set") are
unrelated to this bug and were left untouched.

The double-prompt this caused was confirmed live, not assumed: Globo's field
only ever wrote a cosmetic line-item property (the price never changed —
Globo has no idea about `_free_gift` or the discount function), while the
theme's own free-gift picker in the cart independently still asked "pick 1
more" right below it, since it only tracks its own `_free_gift` cart lines
and has no knowledge of Globo's field either. Two unrelated systems asking
the same question, only one of which actually worked.

If either symptom — a "Select ... Free ..." field on a product page, or a
duplicate free-gift prompt in the cart — ever reappears, check Globo's option
sets before assuming it's a theme bug; grep won't find it because it isn't
theme code.

**A second instance of this exact bug, found and fixed 2026-08-31.** Burhan
first reported the cart looking "cluttered" on mobile when it held a
Customize Perfume line, and — separately, later the same day — reported that
picking a fragrance in the "Select Complimentary 10ml/35ml Perfume" dropdown
and adding to cart didn't actually add anything; the customer had to go
re-claim a gift from the cart's own free-gift picker instead. Both symptoms
traced to the same **required** Globo dropdown on `customize-perfume-1`
(option set id `1665587`, field label "Select Complimentary 10ml/35ml
Perfume", written to the cart as the line-item property "Selected
Complimentary 10ml/35ml Perfume") — almost certainly the option set logged
above as "35ml complimentary" and assumed unrelated on 2026-08-29, since it's
on a different product than the 6 signature-series ones that cleanup
covered. Same failure mode as before: it's a required field that forces
every customer to pick a "complimentary" perfume, then only ever writes a
plain cart line-item property — Globo can't touch pricing or add a real cart
line, so nothing about the pick is actually free or actually added. In the
cart UI this also rendered as an extra unstyled line wrapped into the same
`<dl>` as the real Fragrance/Size/Type options (`snippets/cart-drawer.liquid`
/ `sections/main-cart-items.liquid`), which is what read as "clutter" — the
underlying flex-wrap layout was working as designed, there was just a 4th,
redundant item flowing through it.

Burhan was asked 2026-08-31 whether to deactivate it the same way as the
other one and initially chose to leave it active; once he reported the
broken add-to-cart behavior later that same day, he asked for it to be
fixed — then asked specifically for a real fix rather than just removing
the feature. Two changes:

1. **Deactivated** (set to Draft, not deleted — reversible) in Globo's own
   admin → Option Sets → set id `1665587`, same as the 2026-08-29 fix.
2. **Wired up the theme's own working product-page gift picker for this
   product**, so the "pick a free perfume" experience doesn't just disappear.
   `snippets/product-gift-picker.liquid` (see "Pre-picking the gift on the
   product page" below) already does this correctly for every
   signature-series product — real `/cart/add.js` call, real `_free_gift`
   line, zeroed by the same discount function — but its own eligibility
   check only tested collection membership, and `customize-perfume-1` was
   never in `signature-series` (same reason it needed a handle-based
   exception everywhere else — see "Qualifying purchases" above). Added the
   identical `product.handle == 'customize-perfume-1'` exception to both
   `snippets/product-gift-picker.liquid`'s own eligibility check and
   `sections/main-product.liquid`'s `product_gift_eligible` (which gates
   whether the picker's CSS/JS even load on the page).

Verified live end-to-end on `https://www.attarwalas.com/products/customize-perfume-1`
(preview of this draft theme): Globo's dropdown no longer renders; the
theme's "Your free perfume" picker renders in its place; picking a fragrance,
picking "Oudh Eternal" as the gift, and adding to cart produced two real
cart lines — Customize Perfume at full price, and Oudh Eternal 35ML tagged
**Free gift** at Rs. 0.00 (struck through from Rs. 1,050.00) — with the
cart's own free-gift box correctly showing it as claimed. The Globo change
is app config, not a theme file, so it took effect immediately on both the
live theme and this draft theme; the two Liquid file edits sync the same way
any other theme change does (`shopify theme dev` must be running).

### Outstanding: 10ml/35ml perfume variants across the catalog

The 10ml/35ml gift-size variants only exist on the 6 products currently in
`signature-series` (Oudh Eternal, Mystique Island, Florence Orchidia, Fresh
Woodscape, Yameni Yakud, Ambre Intense) as of 2026-08-29, priced by linearly
scaling each product's own 100ml price (10ml = 10%, 35ml = 35% — same formula
already used for the 50ml size). If a product is added to `signature-series`
later without matching 10ML/35ML variants, it silently won't appear in the
gift dropdown (the picker skips any product missing the matching size, same
behavior as the old roll-on picker) — not a bug, but easy to mistake for one.

### Gotcha: the 10ml/35ml placeholder price leaked into collection cards (fixed 2026-08-31)

Burhan reported the `signature-series` collection page showing "From Rs. 250"
for products that actually start at Rs. 1,499+ — clicking through to the
product page showed the real price. Cause: Shopify's `product.price` /
`product.price_min` are computed across **every** variant, including the
10ml/35ml gift-only ones added above, and those are deliberately priced far
below the real sizes (10%/35% of the 100ml price). So the cheapest variant on
a signature-series product was always one of the two sizes nobody can
actually buy through the storefront (they're hidden from the Size picker —
see below — but hidden ≠ excluded from Shopify's own min/max computation).

Fixed in `snippets/price.liquid`: when rendering a product's own price (not
a selected variant's, i.e. collection cards and any other "from" price) for
a product in the free-gift qualifying collection, price/price_min/price_max
are recomputed from `product.variants` excluding `10ML`/`35ML`, mirroring the
same qualifying-collection scoping `snippets/product-variant-options.liquid`
already uses to hide those sizes from the picker. Roll-ons (which have real,
purchasable 10ML/35ML sizes) are unaffected since they aren't in the
qualifying collection. Verified against live variant data (Mystique Island:
50ml @ Rs. 1,499 is now the correct "from" price, not the 10ml gift price of
Rs. 250).

### 10ML/35ML hidden from the main Size picker (added 2026-08-30)

Adding the 10ML/35ML variants (above) made them show up as normal,
purchasable Size options on every signature-series product page — a
customer could buy a "10ml Oudh Eternal" for ₹300 directly, which was never
the intent; those sizes exist only to back the free-gift pickers. Burhan
asked for the main product page to only ever offer 50ML/100ML.

Fixed in `snippets/product-variant-options.liquid` (the shared snippet that
renders every option's buttons/swatches/dropdown entries, used by
`product-variant-picker.liquid` everywhere a variant picker renders): for
the `Size` option specifically, on a product in the free-gift qualifying
collection, `10ML`/`35ML` are skipped when iterating `option.values`. The
underlying variants are untouched — still fully priced, still fully
addable by variant id — only their *button* stops rendering, which is all
the free-gift pickers need (both add gift lines directly by variant id, they
never read this picker's UI).

**Scoped by collection membership, not by value string**, on purpose: the
attar roll-on products have their own genuinely-purchasable `10ML`/`35ML`
sizes with the exact same value strings, and are not in the qualifying
collection — a value-string-only filter would have hidden those too.
Verified: `oudh-eternal-attar-roll-on` still shows all four of its real
sizes (6ML/12ML/10ML/35ML) unaffected.

Don't try to hide these sizes by marking the variants unavailable/out of
stock instead — the free-gift pickers add them via `/cart/add.js` with
`inventoryPolicy: CONTINUE` specifically so they're always addable
regardless of stock; making them unavailable at the variant level would
break the add call itself, not just the picker UI.

### Pre-picking the gift on the product page (added 2026-08-30)

Burhan asked for the free-gift choice to be offered on the *product* page
too, not only once the customer is already in the cart — the cart-based
picker (`snippets/free-gift-picker.liquid`) stays exactly as-is and remains
the only way to claim a slot for anything that didn't go through this path
(quick-add overlay, "Buy Now", a second qualifying unit beyond the one this
picker covers, etc.).

| File | Role |
| --- | --- |
| `snippets/product-gift-picker.liquid` | the picker itself: eligibility check (product must be in the qualifying collection), a dropdown of gift products with both size variants encoded as data attributes |
| `assets/product-gift-picker.js` | `<product-gift-picker>` — reacts to the main add-to-cart succeeding, then separately adds the gift |
| `assets/component-product-gift-picker.css` | styles, same rounded/flat-tint card language as `.free-gift` |

Rendered unconditionally (no block, no theme-editor config) from
`sections/main-product.liquid` right after the buy-box blocks loop, gated on
`settings.free_gift_enabled` and the product being in the qualifying
collection — same two checks `free-gift-picker.liquid` already does. CSS/JS
are loaded conditionally too, following the exact pattern already used for
`fragrance-option-picker` (`has_fragrance_option` flag → conditional
stylesheet/script tags).

**Deliberately scoped by Burhan's own choices, 2026-08-30:**

- Only ever **one** picker regardless of quantity — buying 3 units of a
  perfume here still only earns one gift through this control; the other 2
  earned slots show up unclaimed in the cart exactly as before.
- Picking is **optional** — skipping it (leaving "Skip for now" selected)
  changes nothing; the slot just appears unclaimed in the cart, identical to
  today's behavior before this feature existed.

**Why this needs its own network request, not one combined add:** Dawn's
`<product-form>` (`assets/product-form.js`) submits a single variant via
`FormData` to `/cart/add` — there is no supported way to smuggle a second
line item into that same request without rewriting a file every product page
on the site depends on, which is far too much blast radius for one feature.
Instead `product-gift-picker.js` waits for `PUB_SUB_EVENTS.cartUpdate`
(published by `product-form.js` itself right after a successful, non-buy-now
add), confirms it's a match for *this* form specifically by comparing variant
ids, and only then fires its own `/cart/add.js` call for the gift — mirroring
how `assets/free-gift.js` already adds a gift as an ordinary cart line with
`Gift` + `_free_gift` properties. It publishes its own `cartUpdate` afterward
so the cart drawer/bubble pick up the new line.

**Fixed 2026-09-25: now fires on "Buy Now" too.** Was a known limitation —
`product-form.js` redirected straight to `/checkout` on that path without
ever publishing `cartUpdate`, so the gift picker's `onCartUpdate` (its only
hook) never ran, and a customer using Buy Now on a qualifying product
reached checkout with only the main perfume in the cart, no gift. Reported
by Burhan: "after clicking buy now... i dont see the complementary free
perfume added there."

Fixed by touching `product-form.js` after all (the thing the note above said
would be required): its `buyNowButton` branch now publishes `cartUpdate` the
same as the regular Add to cart path, then waits (capped at 4s via
`Promise.race`) before redirecting, instead of redirecting immediately.
`assets/product-gift-picker.js`'s `onCartUpdate` now `return`s its
`fetch(...)` promise instead of firing it and forgetting it, and
`assets/pubsub.js`'s `publish()` now returns the array of each subscriber's
own return value (`subscribers[eventName].map(...)` instead of
`.forEach(...)`) so a publisher can `Promise.all()` async subscribers —
purely additive, every other caller already ignores `publish()`'s return
value. If `pending` (the filtered array of thenables) is empty — no gift
picker on the page, or nothing chosen — checkout redirects immediately, same
as before this fix. The 4s cap means a slow or failed gift add can never
strand the customer on the product page instead of reaching checkout; the
gift add itself already swallows its own errors (`.catch(() => {})`), same
as the regular cart-page flow.

Applies to every qualifying product's page, since it's a fix to the one
shared `product-form.js` / `product-gift-picker.js` pair every such product
page renders — not a per-template or per-product change.

**Gotcha hit while building this: `data-*` attributes with a digit right
after the hyphen don't camelCase.** The first version used
`data-variant-50` / `data-variant-100` on each `<option>`, read back in JS as
`dataset.variant50` / `dataset.variant100` — silently always `undefined`,
because the HTML spec's camelCasing rule only converts a hyphen followed by
a *lowercase letter*; a hyphen followed by a digit is left as a literal
hyphen in the resulting property name (so the real key would have been
`dataset['variant-50']`, not `dataset.variant50`). Fixed by renaming the
attributes to `data-gift-variant-small` / `data-gift-variant-large`
(→ `dataset.giftVariantSmall` / `dataset.giftVariantLarge`), which sidesteps
the rule entirely. Caught by adding temporary `console.log` around the
lookup and testing live in a real browser — the failure was completely
silent (an early `return`), so nothing in a design-mode preview or template
render would ever have surfaced it.

**Styling (updated 2026-08-30):** both `.free-gift` (cart) and
`.product-gift-picker` (product page) were reworked from a sharp-cornered,
gradient-backed box to a flatter, fully rounded one — `border-radius: 1.6rem`
on the outer card, `999px` (pill) on the select, the claimed row, its "Free
gift" tag, and the Change button — matching the pill treatment
`component-cart-redesign.css` already established for cart buttons. No
gradient background anymore, just a flat low-opacity gold tint. If either
component ever needs a new interactive element, make it a pill too rather
than a sharp rectangle, to stay consistent with this and the cart's own
existing direction.

**The "X added as your free gift" confirmation auto-hides now.** It used to
stay on screen for the rest of the page session once shown, which read as
"you're done here" even though the select underneath was already reset and
ready to pick again. `product-gift-picker.js`'s `showConfirm()` now clears it
after 5 seconds, or immediately if the customer touches the select again
(`hideConfirm()`, wired to the select's own `change` event).

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

### No fragrance pre-selected + duplicate focus-ring fix (added 2026-08-30)

Burhan reported two problems on the search-box UI: it looked broken when
clicked (two overlapping rounded borders), and a fragrance was always
pre-selected on page load, which he didn't want.

**The overlapping borders** were Dawn's own global accessibility rule,
`*:focus-visible` (`assets/base.css`), applying its own box-shadow ring
directly to the bare `<input>` (`border-radius: 0`) at the same time as
`.fragrance-picker__search`'s own `:focus-within` ring on the *wrapper*
(`border-radius: 999px`) — two different shapes, stacked, looking like two
misaligned search boxes. Confirmed live via `getComputedStyle` on the input
during focus (`box-shadow: rgb(252,250,245) 0 0 0 3px, rgba(43,36,24,0.3) 0 0
5px 4px` — exactly `*:focus-visible`'s rule, matching this theme's
`--color-background`/`--color-foreground`). Fixed by suppressing box-shadow
and outline specifically on `.fragrance-picker__search-input:focus-visible`
— the wrapper's own ring is the only focus indicator this component needs;
the site-wide rule is untouched everywhere else.

**No fragrance is pre-selected anymore.** `snippets/fragrance-option-picker.liquid`
used to check whichever radio matched `option.selected_value` (Dawn's normal
default-to-first-variant behavior) — removed entirely, so every radio starts
unchecked and the legend's value span starts blank. Since Dawn's
`VariantSelects` only recomputes the current variant on a `change` event (not
on page load), a customer could otherwise still submit the form and silently
get whatever fragrance was "selected" without ever touching the list.
`assets/fragrance-picker.js` closes that gap: on construction, if no radio is
checked, it calls the enclosing `<variant-selects>`'s own `toggleAddButton(true,
'Select a fragrance')` — the exact method Dawn already uses for a genuinely
unavailable variant — disabling Add to Cart until a fragrance is chosen. Once
chosen, Dawn's existing `onVariantChange` flow takes over exactly as it
already does for Size/Type, with no other changes needed.

### The free-gift search box is a second, separate `<fragrance-picker>` — and didn't get the alias fix (fixed 2026-09-22)

Burhan reported that searching "dior" in the *free perfume* search box
(`snippets/product-gift-picker.liquid`'s "Customize Complimentary" branch,
`use_fragrance_search`) returned nothing, while the exact same search in the
*main* "Search Your Fragrance" box above it (this snippet) worked correctly.

Both boxes render the same `<fragrance-picker>` custom element and share
`assets/fragrance-picker.js` and `component-fragrance-picker.css` — but
they're two **separate instances built from separate Liquid**, and only this
one (`fragrance-option-picker.liquid`) was ever wired up to cross-reference
the `fragrance` metaobject's `aliases`/`reference_name` fields into each
item's `data-search`. `product-gift-picker.liquid`'s copy built `data-search`
from the raw option value only (e.g. `"sauvage inspired (masculine)"`) — so
a customer searching a real brand name found nothing, even though matching
brand names to in-house-inspired names is the entire reason the aliases
field exists.

Fixed by giving `product-gift-picker.liquid` the identical metaobject lookup
this file uses: wrap its fragrance-search branch in
`{% paginate shop.metaobjects.fragrance.values by 250 %}` (same 250-item
raise as here, same reason — the default 50-item page silently drops alias
data past #50), look up the matching `fragrance` entry by `display_name`,
and append its aliases + reference name into `data-search`. Verified live:
`data-search` on Sauvage Inspired now reads `"...sauvage inspired
(masculine) dior sauvage ... dior sauvage perfume dior sauvage"` — "dior"
now matches.

**If a third fragrance-search box is ever added anywhere on the site, it
needs this same metaobject cross-reference written into its own Liquid** —
there's no shared snippet or JS-side lookup doing this centrally; each
instance currently builds its own `data-search` string at render time, so
copying the visible markup without also copying the metaobject loop
reintroduces this exact bug silently (the box still works, it just can't
find anything by brand name — no error, no visual sign anything's missing).

### Outstanding: metaobjects ≠ variants

Burhan is bulk-populating the `fragrance` metaobject via Matrixify (50+ entries
as of 2026-08-22, more ongoing). Adding a metaobject entry does **not** make it
sellable — see the checklist item at the top of this file. Until a matching
variant + price exists for a fragrance on `customize-perfume-1`, it simply
won't appear in the picker, which is correct/expected behavior, not a bug.

### Its own template, and why the rest of the page felt undeveloped (added 2026-09-20)

Burhan: "the first part of that is working nicely... but the full page doesnot
look that developed." `customize-perfume-1` was rendering the shared
`templates/product.json` — same template every regular product uses — and
that's what made it feel thin, for two unrelated reasons.

**1. Two of its three real product photos were hidden.** Admin → Media showed
3 images (bottle, navy gift-box shot, black gift-box shot), but the storefront
gallery only ever showed 1 ("Open media 1 in modal", no "of 3" count). Root
cause, confirmed via the raw product JSON: **every one of the 3 images is
individually attached to at least one of the 594 variants** — plausibly a
side effect of how the variants were bulk-created. `main-product`'s
`hide_variants: true` (the sitewide default in `product.json`, meant for
swapping a single image per variant like a color swatch) collapses the whole
gallery to 1 image specifically when *every* image is variant-attached
(`snippets/product-media-gallery.liquid`: `variant_images.size ==
product.media.size` → `single_media_visible`). Fixed by setting
`hide_variants: false` for this product only (see below) — the 3 images
now always show as a normal thumbnail gallery, regardless of which
variant is selected. This is very likely happening to nobody else on the
site only because no other product has images individually variant-attached.

**2. `from-collection` and the `duo_teaser` block both silently fell back to
nothing useful.** `from-collection` (the "Signature Series" grid every other
perfume page shows) has no explicit collection override in the shared
template — it auto-picks whichever of the current product's own collections
has the most other products (see the comment in `sections/from-collection.liquid`).
`customize-perfume-1` isn't in `signature-series` (deliberate — see "Qualifying
purchases" above), so it fell back to the `Customize` collection, which has
exactly one other product (`Customize Attar Roll-On`) — a single oddly-laid-out
card instead of a 4-up grid. Separately, `duo_teaser` ("Signature Duos") was
never wired up **anywhere on the site** — `product.json`'s block has no
`duo_product` set, so `snippets/duo-teaser.liquid`'s own blank-check
(`duo_product == blank`) silently drops the whole section on every regular
product page, sitewide, not just this one.

Fixed by giving this product its own template, `templates/product.customize-perfume.json`
(assigned in admin → Product → Theme template, same pattern as the offer/duo
products) — a copy of `product.json` with `hide_variants: false`, `from-collection`'s
`collection` overridden to Signature Series, and `duo_teaser`'s `duo_product` set
to `oudh-eternal-duo` (any duo product works as the entry point — the actual
fragrance shown is resolved from the URL's `?duo=` param, same as the homepage
carousel). Left the shared `product.json` alone on purpose — forcing
`from-collection` to Signature Series site-wide would wrongly override roll-on
product pages that currently correctly show their own roll-on siblings.

**Gotcha: a raw `gid://shopify/Product/…` or `gid://shopify/Collection/…`
string in a JSON template's `product`/`collection`-type setting does not
resolve**, even though Shopify silently accepts and stores it (re-serializing
it lowercased, `gid://shopify/product/…`, without erroring). The block just
renders as if the setting were blank. The setting has to be set through the
theme editor's own picker at least once — Shopify then stores it as the bare
handle (`"oudh-eternal-duo"`, `"signature-series"`), which **is** the correct
format to hand-write directly in a template JSON file going forward. Caught
this by comparing what pulled back down after using the real picker UI
against what I'd hand-written.

## Announcement bar — continuous marquee, not a slideshow (added 2026-08-23)

Reported by Burhan as "rolling in a single line, like news headlines." Dawn's
stock announcement bar (`sections/announcement-bar.liquid`) was a one-at-a-time
slideshow: each message cross-fades in, sits for `change_slides_speed`
seconds, then slides out for the next, with prev/next arrows
(`slideshow-component` + `component-slider.css`/`component-slideshow.css`).
Replaced with an actual CSS marquee — every message scrolls continuously in
one line, right to left, forever.

### How the loop is seamless

The track (`.announcement-bar__track`) renders **two identical copies** of
every announcement block back to back (`{%- for pass in (1..2) -%}` in the
Liquid). Animating from `translateX(0)` to `translateX(-50%)` scrolls exactly
one copy's width off-screen — by the time it does, the second copy is sitting
exactly where the first one started, so the loop point is invisible. The
second copy carries `aria-hidden="true"` so screen readers hear each message
once, not twice; `block.shopify_attributes` is only emitted on the first copy
for the same reason (a theme-editor block should map to one DOM node, not two).

A bullet separator sits after **every** item, including the last item of each
copy — that's what makes the seam between copy 1 and copy 2 read as one
continuous sequence ("MSG1 • MSG2 • MSG1 • MSG2 • …") instead of a visible gap.

### Speed scales with block count

`change_slides_speed` (still the same 3–10s customizer range) is now "seconds
per message" rather than "seconds this message is shown." Actual loop
duration = `change_slides_speed × number of blocks`
(`assign marquee_duration = section.settings.change_slides_speed | times: section.blocks.size`),
so the ticker's visual speed stays roughly constant whether Burhan has 2
announcements or 8 — without this, adding more blocks would either speed up
the scroll (fixed duration, more content) or slow it down (fixed per-block
time only), neither of which reads as "the ticker got faster/slower on
purpose."

`auto_rotate` was removed from the schema — there's no on/off for continuous
scroll, only speed. Its stored value in `sections/header-group.json` is
harmless and ignored (Shopify drops settings the schema no longer defines).

### Gotcha: don't trust "it's not moving" from an unfocused automated browser

Verified working by reading `element.getAnimations()[0].startTime` — it comes
back `null` (animation created but not yet ticking) whenever
`document.hasFocus()` is `false`, which happens routinely when a page is
driven by browser automation without OS-level window focus. The moment focus
is given (`window.focus()`), `startTime` populates and the track moves
immediately. This is a testing-environment artifact, not a bug — a normal
visitor's browser always has focus on the tab they're looking at. Don't
diagnose "the marquee isn't animating" from an automated screenshot alone;
check `document.hasFocus()` first, or drive it interactively.

Pauses on `:hover`/`:focus-within` (`animation-play-state: paused`) — both so
a customer can actually read or click a message, and because WCAG 2.2.2
requires a way to stop auto-moving content that runs longer than 5 seconds.
`prefers-reduced-motion: reduce` disables the animation entirely and hides
the duplicate copy (so reduced-motion visitors get one static line, not two
copies of the same text sitting side by side).

### Gotcha: `.announcement-bar__item` needs the `h5` class, not its own type styles

The first version of this rewrite dropped Dawn's `<p class="announcement-bar__message h5">`
in favor of a plain `<span class="announcement-bar__item">`, losing the `h5`
class entirely — Burhan caught it immediately ("font and boldness will remain
the same"). `.h5` isn't decorative filler here: it's the only thing setting
font-weight 600, uppercase, 0.08em letter-spacing, and (counter-intuitively)
the **body** font specifically — `typography-attarwalas.css` overrides `h5,
.h5` to `var(--attarwalas-font-body)` (DM Sans) while every other heading
level stays on the serif. Losing the class silently fell back to whatever
default text styling applied in that context, which looked nothing like the
original.

Fixed by adding `h5` back onto `.announcement-bar__item`, and — this part
matters — **removing `letter-spacing: 0.1rem` from this file's own
`.announcement-bar__item` rule**, which had been silently overriding `.h5`'s
`0.08em` at equal specificity (last-in-source wins, and this file's `{% style
%}` loads after base.css). Any layout property is fine to add to
`.announcement-bar__item` going forward; anything `.h5` already sets
(font-family, weight, size, letter-spacing, case, color) should not be
touched here — set it on `.h5` itself if it needs to change, so every other
`.h5` element on the site changes consistently with it.

**Narrow, deliberate exception: font-weight.** Burhan then asked for the bar
to be bolder and visually less flat ("only 1 font or boldness... add some
stuff"). Turned out `.h5`'s 600 was itself already a regression — base.css
still has an older, now-orphaned `PREMIUM ANNOUNCEMENT BAR` block
(`.announcement-bar__message, .announcement-bar__message span { font-weight:
700 !important }`) that no longer matches anything, since this markup
doesn't use `.announcement-bar__message` anymore. That block also has a
`barLightSweep` shimmer-sweep animation on `.utility-bar::after`, which
**is** still live — it targets `.utility-bar`, a class this rewrite never
touched, and is worth knowing about if the bar ever looks like it's missing
its light-sweep effect (check `.utility-bar`'s `overflow: hidden` isn't
clipping it before assuming it's broken).

Restoring 700 belongs on `.announcement-bar__item` specifically, not on
`.h5` globally — bumping `.h5` itself would also embolden every unrelated
`.h5` element site-wide (product-card labels, badges, anything else using
that class), which is broader than what was asked. `.announcement-bar__item,
.announcement-bar__item *` covers both the plain-text and linked-message
cases in one rule.

The separator between messages was briefly a small gold diamond; on
2026-09-13 it went back to a small muted dot (`rgba(var(--color-foreground),
0.35)`), and the ✨ emoji came out of the message text, as part of a pass
removing decoration that read as AI/template styling. The same pass stripped
the offer deal cards (`snippets/offer-strip.liquid`) down to number, discount,
tagline and CTA, and made Our Promise icon-free by default (`show_icons`).

## Scroll motion — `aw-motion.css` / `aw-motion.js` (added 2026-09-14)

Burhan: the site felt rigid while scrolling; asked for motion that feels like
an experience without overdoing it. One shared motion language, loaded from
`layout/theme.liquid` only when Theme settings → "Reveal sections on scroll"
is on, and fully disabled under `prefers-reduced-motion: reduce`.

| Effect | Where | How |
| --- | --- | --- |
| Content reveal (heading → text → items, 90ms stagger) | Signature collection, Bundle offers, deal cards, Shop by category header, Perfumer quote, Store location | `aw-motion.js` tags elements listed in `GROUPS` with `data-aw-reveal`; CSS fades/rises them |
| Photo unveil (clip from the bottom edge) | Our promise photo, Perfumer photo | `MEDIA` list → `data-aw-media` |
| Image settle (scale 1.08 → 1) | Duo carousel, Shop by category, Dawn product cards | CSS only, keyed off each section's existing "visible" class |
| Parallax drift | Our promise photo, Perfumer photo, Dawn image-with-text photos | CSS scroll-driven (`animation-timeline: view()`), skipped where unsupported (Firefox) |
| Hero drift + button fade | Homepage video hero | named view timeline `--aw-hero` |

The sections that already had their own reveal (Duo carousel, Our promise
items, Shop by category cards, Customer reviews, Dawn `.scroll-trigger`) keep
it, but now share the same curve (`--aw-ease`), durations, and trigger point
(`threshold: 0, rootMargin: '0px 0px -6% 0px'`). The old `-40/-60px` +
`threshold: 0.15` made whole sections sit blank before animating. The
Customer reviews blur-in was removed.

Rules that are easy to break:

- **A reveal must end at the element's natural state** — `transform: none`,
  never `translateY(0)`. Any lingering transform makes a containing block,
  which closes native `<select>` dropdowns in Chrome (see the scroll-reveal
  gotcha below) and re-anchors `position: fixed` children. `aw-motion.js`
  removes its attributes once the transition ends for the same reason.
- **Frames around a parallax image must be `overflow: clip`, not `hidden`.**
  `hidden` makes that ancestor the image's scroll container, so its
  `view()` timeline never moves — silently. This bit `.our-promise__media`
  and the perfumer section wrapper; both now use `clip` at the source.
- Content is only hidden by JS, and only if it starts below the fold — no-JS
  visitors and already-visible content never blink.
- Verifying in an automation tab: when the tab isn't visible
  (`document.visibilityState === 'hidden'`) the browser stops rendering, so
  IntersectionObserver callbacks and scroll timelines report stale values
  (`currentTime: null`). Take a screenshot to force a frame before reading them.

## Footer density pass (2026-09-20)

Burhan: the footer reads too tall, on mobile especially. Measured at three
widths against the real live footer markup + live CSS (see "Measuring a change
without a dev server" below):

| width | before | after |
| --- | --- | --- |
| 390px (phone) | 1215px | **915px** (−25%) |
| 768px (tablet) | 823px | 759px (−8%) |
| 1280px (desktop) | 503px | 459px (−9%) |

All of it lives in one appended block at the end of
`assets/section-footer.css`, plus `padding_top`/`padding_bottom`/`margin_top`
in `sections/footer-group.json` (32/24/16 → 24/16/12; the range is step-of-4,
so keep new values on a multiple of 4 or Shopify drops them).

**The section padding was never the problem** — it was already modest. On
mobile the height was in two rules that stack *per block*:
`.footer-block.grid__item { margin: 4rem 0 }` and
`.footer-block__details-content { margin-bottom: 4rem }`, so each of the three
blocks carried ~80px of its own trailing space.

**The big win is layout, not padding.** Dawn stacks all three blocks full
width on mobile (`.footer .grid { display: block }`), so brand text + Shop +
Customer Care cost 119 + 298 + 198 = 615px in sequence. The two link lists now
sit side by side, costing `max(298, 198)` instead of the sum — that one change
is 190px of the 300px saved.

**Don't try to reclaim the footer link padding.** Each Shop link is 45px on
mobile (10px padding + 25px line-height), which is the touch target sitting
right on the 44px WCAG 2.5.8 floor. Verified no link wraps to a second line in
the narrower column at 375px, so the two-column layout buys the height back
without shrinking any tap area.

**Desktop is near its structural floor at 459px.** The three blocks' natural
heights are 96 / 233 / 198, and the grid stretches all three to the tallest.
So shrinking the Shop menu can't take the row below Customer Care's 198px —
a two-column Shop menu was tried and rejected: it saves only 35px and wraps
"Signature Series" and "About ATTARWALAS" onto two lines at 124px.

Two things deliberately left alone:

- `.footer__content-bottom { padding-bottom }` on mobile was only trimmed
  9rem → 7rem, not removed. It is **not** dead space — it keeps the policy
  links clear of the WhatsApp + Inbox launchers, which are fixed bottom-right
  with no bar down there for `floating-stack.liquid` to lift them against.
- The country/language selectors are enabled but render at **0px** (one locale
  only), so they cost nothing and were left as-is.

The block sits at the end of the file on purpose: every rule it overrides is
equal specificity, so it wins on source order, which is why each override
repeats the original selector verbatim instead of inventing a stronger one.
The mobile two-column rule is guarded by
`:has(> .footer-block:nth-child(3))` so it can't fire with only two blocks
(the first spans full width, so a lone second block would sit at half width);
where `:has()` is unsupported the rule simply doesn't apply and the stacked
layout stands.

## Footer UI pass (2026-09-20)

Follow-on from the density pass: Burhan asked for the footer to be better
"UI and space wise" on both mobile and desktop. Appended as a second marked
block at the end of `assets/section-footer.css`.

### The bug underneath it: a dead descendant combinator

The ATTARWALAS block in the middle of that file styles the text blocks with
`.footer-block__details-content .rte a` and friends — **a descendant
combinator, where the markup is one element carrying both classes**:

```html
<div class="footer-block__details-content rte">
```

So `.footer-block__details-content .rte` wants a `.rte` *inside* a
`.footer-block__details-content` and matches nothing. Verified in the
browser: that selector matches **0** elements, `.footer-block__details-content.rte`
(no space) matches **2**. Everything written under it was dead — the
line-height, the `text-decoration: none`, the link padding, and the gold
hover underline (its `::before` `content` computed to `none`, so the
pseudo-element was never generated at all).

**That is why the two link columns never matched.** "Shop" is a `link_list`
block, so its `<a>`s genuinely are descendants and picked up the intended
styling; "Customer Care" is a `text` block whose links fell through to
browser/base defaults — sentence case, underlined, dimmer, no hover effect.

The original rules are left in place but flagged `⚠ DEAD CODE` with a
pointer to the replacements, so nobody edits them and wonders why nothing
happens. They are safe to delete wholesale.

**Correction to the density-pass notes above:** that pass also included a
`line-height: 1.65` rule using this same broken selector, described at the
time as the biggest desktop saving. It was dead and contributed nothing —
the measured desktop saving came entirely from the padding and gap changes.
The rule has been removed; leading is now set once, in the UI pass, with the
working selector.

### What changed

- **One link language.** A `<p>` whose entire content is a single link is a
  menu row, not prose — that's how the Customer Care block is authored. Those
  now get the same case, tracking, colour (`0.75`, matching
  `.list-menu__item--link`; only the *active* link is full white) and vertical
  rhythm as a real menu. Padding is asymmetric (`0 0 0.5rem` desktop,
  `1rem 0` mobile) specifically to match Dawn's menu links, so the two columns
  land on the same baselines: measured 30px/30px desktop, 45px/45px mobile.
  Scoped with `:has(> a:only-child)` so genuine inline links inside a
  sentence stay inline; without `:has()` support they still lose the
  underline and gain the gold hover, just not the menu rhythm.
- **One hover language.** Dawn turned a footer menu link white + underlined
  above 750px but gold below it — the same link behaving two ways either side
  of the breakpoint. Gold everywhere now.
- **The bottom bar reads as one tier.** Policy links were 14px uppercase —
  the same size as the primary nav links above them — next to an 11.5px
  copyright. Both are tertiary/legal, so they now match each other at 11.5px
  and sit quieter than the menus. Side effect: the policy row fits on one
  line on desktop instead of wrapping.
- **Newsletter heading** joined the gold uppercase tracked treatment the
  other block headings use.

Heights after both passes: **1215 → 902px** at 390px, **503 → 456px** at
1280px.

### Content cleanup worth doing in admin (not theme)

- The Shop menu and Customer Care list both contain **"Track Your Order"**,
  and "About ATTARWALAS" (Shop) vs "About Us" (Customer Care) look like the
  same page. Dropping the duplicates would shorten the footer further and
  balance the two columns.
- The Shop menu reads **"ABOUT ATTARWLAS"** — missing the second `A`.
  Content → Menus → Main menu.

## Offer pages: the bundle experience (2026-09-20)

Burhan: "the offer for 2 3 and 5 … i want something cool, this should feel
like an experience not a chore." Direction agreed with him up front: bundle
tray **and** the calmer card treatment, not one or the other.

**What made it a chore.** Every card was a small order form — image, a
"SIZE:" dropdown, a price, a button — so adding two perfumes cost four
interactions. And nothing accumulated: the bar read `0 / 2` plus a
comma-joined list of names, so there was no sense of a bundle taking shape or
a saving growing.

**Three changes, in order of how much they matter:**

1. **A tray of slots that fills.** One slot per pick the *active* group asks
   for, filled left to right with the product thumbnail, with a small pop on
   arrival. Clicking a filled slot removes that item. This is the feedback
   loop the page never had.
2. **One tap to add.** The whole card is a hit target now. The
   `[data-offer-card-add]` button stays in the markup — it is the keyboard /
   screen-reader path and the no-JS fallback — this only adds a larger hit
   area over it.
3. **Size chips instead of a dropdown**, so choosing a size is one tap.

Plus a savings figure that counts up rather than snapping, and a one-shot
flourish on the CTA when the last slot fills.

### How it is wired (and why it is low-risk)

- `offer-builder.js` is **offer-only**; the duo page has its own
  `duo-pairs.js`. Behaviour changes can't reach the duo page.
- **The chips are a view over the `<select>`, not a replacement.** The select
  stays in the DOM and stays the source of truth; chips set `select.value` and
  fire `change`. Everything downstream is untouched — in particular
  `syncGroupSize`, the thing that stops a bundle reaching checkout with mixed
  sizes. Rebuilding that on top of chips would have meant reimplementing it.
  `applyVariantOption` calls `syncSizeChips`, so a size cascaded in from a
  sibling card keeps the chips honest.
- Chips are skipped for single-variant products and for >4 options, where a
  dropdown is genuinely the better control. With JS off, none of this runs and
  the select renders exactly as before.
- The card click handler ignores clicks landing on the select, chips, stepper
  or add button — otherwise choosing a size would also toggle the card, and
  pressing "−" would re-add what it just removed.

### Traps hit while building it, worth not re-introducing

- **`requestAnimationFrame` is starved in a background tab.** The first
  version of the savings count-up wrote the figure *only* inside the rAF
  callback, so the savings line rendered empty and stayed empty — the number
  the whole offer is selling. Caught because the automation tab reproduced it
  exactly. `countSavingTo` now writes the final value **synchronously first**
  and treats the animation as pure flourish; if rAF never runs, the right
  figure is already on screen. Same failure class as
  `snippets/floating-stack.liquid`.
- **The tray must not cost a row.** Dropped in under the counter, the bar went
  83px → 141px — on an 844px phone, 17% of the screen permanently given to a
  toolbar. The tray now sits inline with the count, and
  `.offer-builder__bar-picks` is hidden while the tray is showing (thumbnails
  plus a list of the same names is noise). Measured back at **83px with five
  slots filled** — no taller than before the feature existed.
- **The "Buy 5" tray is the tight case on a narrow phone.** Five slots at
  3.8rem plus gaps is 214px, and "5 / 5 SELECTED" is ~100px, against ~330px
  usable at 360px — a 4px margin. Two defences: the word "selected" is
  dropped once the tray shows (the row already reads `5 / 5` beside five
  thumbnails), and the tray gets `min-width: 0` + `overflow-x: auto` so any
  remainder scrolls inside the bar instead of widening the page. `min-width:
  0` is the load-bearing part — flex children default to `min-width: auto` and
  refuse to shrink below their content.
- **Don't re-add the completion animation class on every render.** It is
  gated on the *transition* into ready (`wasReady`), or it restarts on
  unrelated re-renders (changing a size on an already-complete bundle) and
  reads as a glitch. Same reason `renderTray` only rebuilds slots when the
  count changes, and only sets `img.src` when the URL actually differs —
  otherwise the tray flickers on every render.

Verified on a throwaway unpublished theme with real interaction: slots fill
and empty, remove-via-slot works, counter/progress/CTA track, savings compute
correctly (₹2,999 + ₹2,499 = ₹5,498, −10% = ₹4,948.20; offer-5: ₹13,995 −20% =
₹2,799 saved), zero horizontal overflow. The duo page was re-checked on the
same theme and is unchanged: no tray, bar still 83px, label and picks still
showing, selection still working.

## Offer + duo pages: pill controls (2026-09-20)

Burhan on the duo page: "the ui looks diff from the rest of the website… i
want it to match the rest of the site and this looks different and bad."

He was right, and the cause was a **stale design rule, not sloppy styling**.
The top of `section-offer-builder.css` declared the design language as
"square edges — the theme's corner radius is 0 everywhere", and every control
on the offer and duo pages was built to it. That premise stopped being true:
the product page, cart, quantity steppers, free-gift picker and fragrance
picker all moved to 999px pills (the "ATTARWALAS — pill controls" blocks in
`section-main-product.css` at both breakpoints, and
`component-cart-redesign.css`). The offer/duo pages were the last square
surfaces on the site.

Measured on the same controls at 1366px before the fix:

| control | duo / offer | product page |
| --- | --- | --- |
| size chip | 0px radius, 3.8rem, 1.2rem type | 999px, 4.6rem, 1.3rem |
| primary CTA | 0px radius | 999px |
| hero title | 3.8rem | 4.4rem (h1) |

The tell was `.duo-size-label`, whose own comment claims it "matches the real
product page's own Size picker **exactly**" — while rendering square corners
on a picker class literally named `--pill`. The comment was written when that
picker really was square; the picker moved and the copy never followed.

Fixed by appending override blocks (radius / control size / type scale only —
no colour, layout or markup changes):

- `assets/section-offer-builder.css` — `.offer-card__variant`,
  `.offer-card__add`, `.offer-card__qty`, `.offer-choice__tab`,
  `.offer-group__pill`, `.offer-builder__bar-add`.
- `assets/component-duo-pairs.css` — `.duo-size-label` re-pointed at the real
  product picker's values, and `.duo-hero__title` onto the product h1's step
  of the type scale.

**Scope was confirmed with Burhan:** this stylesheet is shared by the duo page
*and* the Buy 2/3/5 offer pages, and both were changed together — fixing only
the duo page would have left the offer pages as the sole odd ones out.

Two things deliberately left square: the sticky bar itself and the banner /
card *surfaces*. It was the interactive controls that were inconsistent, not
the page. `.offer-card__qty` also needed `overflow: hidden` — without it the
+/- buttons paint their square hover background over the new rounded corners.

Verified against live HTML at 1366px and 390px: the duo chip now computes
`999px / 46px / 13px / 0.12em` — identical to the product page picker — and
all three pages (duo, offer, duo index) have 0px horizontal overflow at both
widths. The design-language comment at the top of the file has been corrected
so this doesn't drift back.

### Live issue found while doing this: duo products aren't on the duo template

`templates/product.duo.json` contains only the `duo-pairs` section, but **none
of the six live duo products render it**. Fetched all six
(`ambre-intense-duo`, `florence-orchidia-duo`, `fresh-woodscape-duo`,
`mystique-island-duo`, `oudh-eternal-duo`, `yameni-yakud-duo`): every one
serves the default product template (`main`, `custom_liquid`,
`from-collection`, `perfumer`, `related-products`) and contains zero duo
markup. The duo page only appears when `?view=duo` is appended to the URL,
which is how it was being previewed.

So a customer clicking a duo from `/collections/duo` currently gets an
ordinary product page, not the duo builder. This is the launch-checklist item
"set its Theme template to `duo`" — the products and the `duo` collection now
exist, but the **Theme template is still unassigned** in
admin → Products → [duo product] → Theme template. Nothing in the theme can
fix this; it is one dropdown per product.

## Duo grid = Signature Series grid (2026-09-27)

Burhan: the duo grid (`/products/signature-duo?view=duo`) must look and feel
exactly like `/collections/signature-series`. It had drifted: a hand-rolled
`.duo-browse-card` tile, white page, and a hover that snapped to a second
photo. Now:

- **Tiles are card-product's markup, class for class** (`card-wrapper` →
  `card__inner` → `card__media` → `card__heading h5` → `price`) inside the same
  `ul.grid.product-grid.grid--2-col-tablet-down.grid--4-col-desktop`, so
  `component-card.css` / `base.css` size and style them identically (verified:
  269px tiles, 8px gap, same type at 1496px on both pages). Not rendered through
  `card-product` itself: it would link without `?view=duo&duo=` and print the
  duo product's placeholder price instead of the perfume 50ML + roll-on 6ML
  "From" total. **Don't add tile styles to `component-duo-pairs.css`** — any
  override makes the two pages drift again.
- **One photo per tile.** Every duo product's second photo sits on a grey
  studio backdrop that showed as a hard box on hover. A single image gets the
  same slow zoom a Signature card gets.
- **Cream page, not white.** `.offer-builder` forces white for the Buy 2/3/5
  pages; `.offer-builder.duo-pairs { --color-background: inherit }` gives the
  duo page the site's own ground back. The duo photos are shot on white, so
  both the tiles (`card__media--recolor-backdrop`) and `.duo-hero__image` use
  `mix-blend-mode: multiply` to melt that into the cream.
- **`.duo-pairs > .page-width { width: 100% }` is load-bearing.** `<duo-pairs>`
  is a flex column and `.page-width` is `margin: 0 auto`; auto cross-axis
  margins stop a flex child stretching, so each view shrank to its content.
  That's what collapsed the grid to ~865px with 176px tiles.

## Customer Reviews section: mobile mute pill + wrong price (2026-09-27)

`sections/customer-reviews.liquid` (homepage "What Our Customers Say" video
grid + its Add-to-cart/Buy Now popup).

- **Mute/unmute pill removed from the card grid on mobile only** — Burhan
  disliked it there; desktop keeps it. `.customer-reviews__mute-toggle {
  display: none }` inside the existing 749px-down media query in
  `assets/section-customer-reviews.css`. The video itself (autoplay-muted on
  scroll, tap-to-open-modal, tap-media-to-unmute inside the modal) is
  unchanged.
- **A featured product in the qualifying collection (e.g. Ambre Intense)
  showed its 10ml gift-size price (₹300) instead of its real price (₹2,999),
  and Add to Cart / Buy Now would have added that gift-only variant.** Same
  root cause as "the 10ml/35ml placeholder price leaked into collection
  cards" above: `data-product-price`/`data-variant-id` were built from
  `featured_product.price` / `.selected_or_first_available_variant`, which
  pick the cheapest/first variant with no awareness of the 10ML/35ML
  gift-only sizes. Fixed by recomputing the real variant the same way
  `snippets/price.liquid` recomputes price — scoped to the free-gift
  qualifying collection so roll-ons (which have real, purchasable 10ML/35ML)
  are untouched. If a similar "featured product" card is ever added
  elsewhere, copy this pattern rather than reading `product.price` /
  `selected_or_first_available_variant` directly for a signature-series
  product.
- **Mobile popup: no way out, video cropped (fixed 2026-09-27).** Four causes:
  (1) the dark overlay is an empty `<div>`, and base.css's `div:empty
  { display: none }` hid it on every width, so there was no backdrop and no
  tap-outside-to-close. It's styled as `div.customer-reviews__modal-overlay`
  to out-rank that rule; keep the `div.` prefix. (2) The sheet was sized in
  `vh`, which on a phone ignores the browser bars, so its top and the ✕ sat
  off-screen. It now uses `dvh`. (3) The ✕ is `position: sticky` on mobile so
  it can't scroll away. (4) The videos are 9:16 (606×1080) and were
  `object-fit: cover` in a near-square box, which cut off ~45% of the height.
  Now `contain` at `max-height: 45dvh`. The popup also pushes a history entry,
  so the phone's Back button/gesture closes it instead of leaving the page.

## 3 across on desktop + active header underline (2026-09-27)

- **Signature Series, Attar Roll-Ons and the Duo grid are 3 across at ≥990px**
  (6 products read as 3 + 3, 361px tiles instead of 269px). Mobile/tablet
  stay 2 across. Collections: `main-collection-product-grid.liquid` overrides
  `columns_desktop` to 3 for handles `signature-series` / `attar-roll-ons`
  only — every other collection (gift sets etc.) keeps the template's 4.
  Duo: `grid--3-col-desktop` in `sections/duo-pairs.liquid`.
- **Desktop header underlines the current page's item.** The underline CSS
  existed but never showed: `.header__inline-menu .header__active-menu-item::after`
  was out-ranked by the longer `scaleX(0)` selector. Fixed with a
  full-chain selector in `section-header-attarwalas.css`. Which item is active
  is computed in `snippets/header-dropdown-menu.liquid`: `link.current` for
  plain links, `child_active` for dropdown parents (never `link.current` —
  Gift Set's own URL is `/`, so it would underline on the homepage), Duo on
  any `template.suffix == 'duo'` page, and on a product page the collection
  link (or dropdown parent of one) the product belongs to.

## Homepage "Duo & Trio" carousel: bottles looked like they were floating (fixed 2026-09-22)

Burhan: the duo bottle images on the homepage (desktop and mobile both) have
no shadow, so they read as flat cutouts floating in the air rather than
sitting on the page. This is `sections/product-carousel.liquid` (the "Duo &
Trio" carousel, `product_carousel_duo_trio` in `templates/index.json`), not
`sections/duo-pairs.liquid` — that one is the actual duo *product page*.

`.product-carousel__media` is deliberately `background-color: transparent`
so the duo PNGs' own cut-out transparent backgrounds sit straight on the
section background — see the comment already there. That's also exactly why
nothing ever grounded them: there was no surface for a shadow to fall on.

Tried `filter: drop-shadow()` on the `<img>` first (traces the PNG's own
alpha silhouette) but this theme's `--color-shadow` custom property
(`layout/theme.liquid`) is a light warm gold (`184,138,42`), which has almost
no contrast against the equally warm cream page background — the shadow was
there but essentially invisible.

Fixed instead with a fixed **contact shadow**: a small blurred radial-gradient
ellipse on `.product-carousel__media::before`, pinned near the bottom of the
box (`bottom: 1.5%; height: 6%; width: 56%` of the box, `blur(0.4rem)`,
`rgba(var(--color-shadow), 0.6)` fading to 0). Sits behind the image in paint
order for free — `::before` is generated before the `<img>` in DOM order, and
neither has an explicit `z-index`, so the `<img>` naturally paints on top.
No change needed to the `<img>`/`<svg>` rule itself.

Checked against all 6 live duo product photos (downloaded and measured each
PNG's alpha bbox — they're all 800×800 squares with 4.9%–9% of transparent
margin below the bottle's visible base, cropped only horizontally by
`object-fit: cover` into the 4:5 box, so that margin percentage carries
straight through to the rendered box). A fixed-percentage ellipse this size
sits inside that margin for every product without ever being clipped by the
box's `overflow: hidden` (needed for the hover zoom) — confirmed by
temporarily forcing the pseudo-element to opaque red and screenshotting real
`attarwalas.com` markup/CSS in a local `srcdoc` harness (see "Measuring a
change without a dev server" below) at both desktop and 390px-wide mobile.

## Responsive audit (2026-09-20)

Burhan reported "some part is cut" on some laptops, around the signature
series / product pages, and asked for the site to work across phone, tablet
and laptop sizes.

Audited **7 page types × 10–18 viewport widths** (320 → 1920px) by loading
the real live HTML in `srcdoc` iframes and comparing
`documentElement.scrollWidth` against `clientWidth`, then walking the DOM for
elements whose right edge escapes the viewport (skipping anything inside an
`overflow-x: auto/scroll/hidden/clip` ancestor, and skipping `position: fixed`
off-canvas drawers).

**Exactly one real defect across the whole site.** Everything else — home,
collection, offer, cart, roll-ons — was clean at every width.

### The bug: offer carousel arrows pushed the page 10px wide

`.aw-offers__arrow--left/right` were `left/right: -1rem`, hanging outside
`.aw-offers__wrapper`. Absolute offsets resolve against the wrapper's padding
box, and the wrapper is `max-width: var(--page-width, 120rem); margin: 0 auto`,
so **below ~1230px viewport the wrapper spans the full width and its edge is
the viewport edge** — the right arrow stuck 10px past it and the document
gained 10px of horizontal scroll.

Measured on `/products/oudh-eternal` and `/products/customize-perfume-1`:
`scrollWidth - clientWidth === 10` at 768, 820, 912, 989. That is iPad
portrait, small tablets, and any laptop scaled enough to report a narrow CSS
viewport — **a 1280×800 laptop at Windows 125% scaling reports 1024 CSS px**,
which is how this shows up on "some laptops but not others".

It looked clean at 1024+ only because the arrows happen to be `display: none`
there — three offer tickets fit without scrolling. **Add a fourth offer and
the same overflow appears on laptops**, which is why the fix is not scoped to
a `max-width: 989px` media query.

Fixed in `assets/component-offer-ticket.css`: arrows now default to the safe
inside position (`left/right: 0`) and only hang outside at `min-width: 1240px`,
where the centred container has slack. Slack each side is
`(viewport - 1200) / 2`, so 10px of overhang needs ≥1220px; 1240 adds margin.
**The safe value is the default on purpose** — if `--page-width` is ever
changed in theme settings the breakpoint goes stale, and a stale breakpoint
then degrades to "arrows sit slightly differently" rather than "the page
scrolls sideways".

Verified after the fix: 0px overflow on all three affected pages at every one
of 320/360/390/414/600/768/820/912/1024/1100/1180/1240/1280/1366/1440/1536/1680/1920,
with the arrows confirmed at `0px` up to 1180 and `-10px` from 1240 up, so the
original look is kept everywhere there is room for it.

### Checked and found healthy (don't go re-fixing these)

- **Vertical clipping.** Scanned every element with `overflow-y: hidden/clip`
  whose `scrollHeight` exceeds `clientHeight`, at five viewports including
  short laptop heights (1366×660, 1280×620). The only hits are deliberate:
  `figure.our-promise__media` (parallax drift needs the image oversized),
  `.media--hover-effect` on product cards (hover zoom), and the off-canvas
  empty cart drawer.
- **`--header-height` vs the real header.** The homepage hero is pulled up by
  `calc(-1 * var(--header-height))`, so a stale value would hide content under
  the header. The variable tracks the real height within 1px (rounding) at
  every width from 768 to 1536, including across the 990px switch from the
  1-row to the 2-row header (53px → 108px).
- **Desktop nav vs header icons.** The last nav item and the icon cluster do
  overlap *horizontally* between 990 and ~1150px, which looks alarming when
  measured — but the header grid is two rows
  (`"left-icons heading icons" / "navigation navigation navigation"`), so they
  are 11px apart vertically and never actually collide. Compare both axes
  before calling this a bug.

### Harness gotcha that cost a false negative

Shopify emits section stylesheets with `{{ 'x.css' | asset_url | stylesheet_tag }}`
**inside the section markup in `<body>`**, not in `<head>`. Injecting a test
override into `document.head` therefore loses the cascade to a `<link>` that
comes later in document order, and the fix silently appears not to work. When
simulating a CSS change against a fetched Shopify page, append the `<style>`
to the **end of `<body>`**. Confirmed here: the same rule read `right: -10px`
when injected into head and `right: 0px` when injected at the end of body.

## Measuring a change without a dev server

Useful when `shopify theme dev` can't be run (its auth is interactive). The
footer pass above was measured this way, and it works for any
CSS-only/additive change:

1. `curl` the live page, cut out the section's markup, and keep the page's
   `<link rel=stylesheet>` tags (rewritten to absolute `https://`) and its
   inline `<style>` blocks (that's where the section padding and the colour
   scheme custom properties live).
2. Build two documents: one with just that, one with the new CSS appended
   inline. Since the change is additive, appending inline is byte-equivalent
   to what the pushed file would do.
3. Put both in `srcdoc` iframes at the widths you care about and measure with
   `getBoundingClientRect()`. `srcdoc` inherits the parent origin, so
   Shopify's `frame-ancestors` never applies.
4. Serve the harness over `http://127.0.0.1:<port>` — the browser extension
   refuses `file://` URLs.

**Trap:** don't shrink the harness with CSS `zoom` to fit it on screen. `zoom`
scales the iframe's *layout* box, so a 390px frame starts laying out at ~164px
and invents text wrapping that won't happen on a real phone. Use
`transform: scale()`, which scales the paint and leaves layout alone — or just
read the numbers and skip the screenshot.

## SEO / PageSpeed pass for Semrush (2026-10-01, pushed live)

Burhan ran Semrush's free SEO Checker on the homepage (score 61) and asked for
everything but off-page above 95%. Results on the live site afterwards, from
pagespeed.web.dev: **desktop 92 → 98** (FCP 0.6s, LCP 0.9s, TBT 100ms, SI
0.8s), **mobile 61 → 77** (LCP 11.3s → 4.3s).

**What Semrush is actually reading** (worth knowing before chasing its flags):

- Its speed numbers are **PageSpeed Insights, desktop strategy**. Its FCP/LCP
  matched PSI desktop exactly. Its TBT (564ms vs PSI's 140ms) is just a
  noisy run, and that one swing is what took its performance score to 69.
- PSI shows **"No Data" for real-user (CrUX) metrics** on this site, so
  Semrush's "INP 3.16s" can't be field data. It must be derived from a lab
  metric, most likely Time to Interactive. Lower main-thread work moves it.
  Most of what's left is Meta Pixel, Shopify's pixel manager and Shiprocket,
  which aren't in the theme.
- **"DOM Size: unable to retrieve"** is Semrush's bug: Lighthouse 13 (what
  PSI runs) replaced the `dom-size` audit with `dom-size-insight` (this page
  passes it: about 1,680 elements). Nothing in the theme can change that row.
- **"Mobile Friendliness x/3"** = text ≥ 12px, tap targets ≥ 48px, no
  content wider than the screen. Lighthouse 13 dropped the font-size and
  tap-target audits too, so measure them with **Lighthouse 11**
  (`npx lighthouse@11`, SEO category) or a Puppeteer pass over text nodes
  flagging computed `font-size` under 12px at a 412px viewport. If
  Semrush still shows 1/3 with those passing, that's the same missing-audit
  problem as DOM size. **Confirmed 2026-10-03:** Lighthouse 11 mobile gives
  legible text 100%, tap targets 100% and viewport pass, while Semrush still
  says 1/3. Same day, 4 desktop runs scored 96 every time (TBT 0–80ms), against
  Semrush's 80 / 312ms. Semrush is reporting a single noisy run.
- Meta description must be **100–130 characters** for this checker.
- Social wants an X link. **Burhan has no X account, so it was deliberately
  left out.** Don't add a guessed handle. **There is no Facebook page
  either**: the link was removed 2026-10-03 (Theme settings → Social media).
  Real profiles: `instagram.com/attarwalasofficial` and
  `youtube.com/@attarwalasofficial`. LinkedIn is Burhan's personal profile.
  Semrush will now flag Facebook as missing too; that's expected.

**Changes:**

| Area | Change | Files |
| --- | --- | --- |
| Meta description | Homepage default shortened to 127 chars; site-wide cap 160 → 130, cut at a word, with the "Page N"/"Tagged" suffix kept whole | `snippets/seo-head.liquid`, `config/settings_schema.json` |
| Alt text | Hero poster falls back to "ATTARWALAS handcrafted perfumes and attars" (video has no alt or description set); reviews modal image defaults to "Reviewed product" | `sections/video.liquid`, `sections/customer-reviews.liquid` |
| 12px floor | Signature notes (8px on phones), eyebrow, Buy Now, "10% OFF" tag, footer policies/copyright, offer count label, reviews notes label | section CSS files |
| Tap targets | Footer newsletter field + arrow button 48px (were 45px / 44px) | `assets/section-footer.css` |
| Hero video | Sources held in `data-src` until `window` load, still the 1080p MP4. Eager loading put 5 MB in front of the LCP poster (mobile LCP 10s+) | `sections/video.liquid` |
| Hero poster | Requested at `&quality=70` (CDN honours it; `image_url` can't set it): 217 → 136 KB at 750w, no visible difference | `sections/video.liquid` |
| Review posters | `data-poster`, all set at once when the section is ~900px away. A `<video poster>` never lazy-loads; the eight were ~600 KB competing with the hero | `sections/customer-reviews.liquid` |
| Fonts | Self-hosted Cormorant Garamond + DM Sans (`assets/aw-font-*.woff2`, latin + latin-ext, both variable fonts, OFL), replacing the render-blocking Google Fonts stylesheet; unused `fonts.shopifycdn.com` preconnect removed | `layout/theme.liquid` |
| Render-blocking CSS | Drawer-internal sheets (cart, totals, price, discounts) load async; `component-cart-drawer.css` stays blocking. `component-deferred-media.css` skipped for the hero | `sections/header.liquid`, `sections/video.liquid` |
| Forced layouts | First measurement moved into `requestAnimationFrame` (still before first paint) in the header height script, hero offset, signature carousel, product carousel and reviews scrollbar. Run mid-parse, each one laid out the half-built page | those sections |

**Bug fixed along the way (was live):** `cart-drawer.js` was loaded from the
header, but `CartDrawerItems extends CartItems` needs `cart.js`, which moved
below the footer with the cart drawer (heading-outline fix). Every page threw
`CartItems is not defined`, `<cart-drawer-items>` never upgraded, and the
drawer's +/− and remove buttons did nothing. `cart-drawer.js` now loads from
`snippets/cart-drawer.liquid` right after `cart.js`. Verified live: "+" took
a cart from 1 to 2.

**Design change to know about:** on phones the Signature notes are 12px title
case at regular weight, wrapping to a second centred line when needed, with no
dot separators. 12px capitals outweighed the product name. Notes are
`downcase`d in the markup so CSS owns the casing (some were typed "OUDH",
others "Amber"); desktop is unchanged apart from 10.5 → 12px.

**How it was measured (reuse this):**

- PSI's keyless API quota is usually exhausted. Use the pagespeed.web.dev UI,
  or install Lighthouse into the scratchpad (`npm i lighthouse`) and run it
  with `CHROME_PATH=/usr/bin/google-chrome-stable`.
- A/B on real Shopify without touching live: `shopify theme push --unpublished
  --theme "TEMP …"` for a copy of live and a copy with the change, then run
  Lighthouse on `https://www.attarwalas.com/?preview_theme_id=<id>` for both,
  interleaved, discarding the first run (a freshly pushed theme's CSS comes
  from a cold CDN, ~3s). Delete the temp themes afterwards. `curl` needs
  `-L -c jar -b jar`: the preview URL 302s to `/` while setting a cookie.
- Lab TBT on mobile moves with *when* third-party pixels land inside the
  FCP→TTI window, so a faster page can show a higher TBT. Compare long-task
  lists, not just the number.
- The shell here is zsh: `for f in $LIST` does **not** word-split. Use a file
  and `while read`.

### Follow-up fixes (2026-10-02, pushed live)

- **Offer pages' Perfumes tab was empty** ("These items are being restocked")
  on offer-for-2/3/5. Not a theme bug: the `men-3`, `women-1` and `unisex-3`
  collections the perfume group blocks pointed at had been removed in admin
  (the storefront 404s on them). With no products, none of the offer page's
  animations (tray filling, savings count-up) had anything to run on either.
  The groups now use `signature-series` (the same 6 perfumes). Also,
  `snippets/offer-group.liquid` now falls back to the free-gift qualifying
  collection (signature-series) for bottle groups, or `attar-roll-ons` for
  roll-on groups, whenever the configured collections come back empty.
  Hand-picked products are never overridden. `snippets/product-best-fit.liquid`
  also keys off those deleted gender collections, so its Men/Women/Unisex
  label no longer shows on perfumes. Recreate the collections or re-point it
  if that label matters.
- **Hero video waited for `window` load** (yesterday's change). On a real
  phone that is seconds of third-party scripts, so the site opened on a still
  frame. It now starts two frames after the poster's `load` (i.e. once the
  poster has painted, so still out of LCP's way), with a 2.5s backstop.
- **Review videos only loaded on approach**, so on phones they sat on posters
  while 1080p buffered. All eight now get posters + `preload=metadata`
  sources at `requestIdleCallback` after window load (the old behaviour was
  at parse time, which competed with the hero). The play threshold dropped
  0.5 → 0.25, so cards peeking in at the strip's edge play too.

**Correction, same day:** "hydrate every review video after window load"
made Chrome buffer all eight HLS streams at 720p/1080p (~65 MB; PSI mobile
showed a 51,858 KiB payload and scored 57). Reviews now hydrate all at once
when the section is within 1200px (`approachObserver`), which never fires at
the top of the page. Posters are requested at the card's real width
(`showPoster` picks 300/450/600/700, quality 75); the modal clone gets the
full 700px poster back from `data-poster-full`. PSI mobile afterwards: 82,
payload 7.3 MB.

**SEO pass 3 (2026-10-02)** in `snippets/seo-head.liquid` and
`snippets/seo-structured-data.liquid`:

- Product/collection titles get a kind descriptor while they're still the
  plain name: "Oudh Eternal – Non-Alcoholic Perfume – ATTARWALAS",
  "… – Perfume & Attar Duo", "… – Perfume Gift Set", "Signature Series –
  Non-Alcoholic Perfumes". Titles that already say perfume/attar/roll-on, or
  that have an SEO title set in admin, are untouched.
- `noindex, follow` added for: products in `35ml-complimentary` (free-gift
  picker), products in no collection with no description (e.g. the bare
  duplicate `/products/fresh-woodscape`; duo handles excepted because
  `/products/signature-duo` is a real page), and the `35ml-complimentary` /
  `featured-collection` collections.
- Organization gets `alternateName` (Attarwalas, Attarwala, Attar Walas,
  attarwalas.com) and a `description`; WebSite gets `alternateName`.
- Checked and fine: robots.txt (Shopify default), sitemap, canonicals, one
  H1 per page, every homepage link a real `<a href>` with text, 0 images
  missing alt across all 66 sitemap URLs.

PSI after these: desktop LCP 0.8s, FCP 0.6s, SI 0.8s. Desktop score swings
89–91 vs 98 the day before, purely on TBT. PSI attributes it to Shiprocket's
`sr-cdn.shiprocket.in/sr-promise/static/iframe.html` (one 532ms task) — an
app, not the theme. The theme's own longest task was 87ms.

**Admin-side SEO follow-ups (2026-10-02)**:

- Share image: `assets/aw-share-image.jpg` (1200×630, wordmark + the six
  Signature bottles) is the `og:image` on every page except products,
  collections and articles (`snippets/meta-tags.liquid`). The Preferences
  social image is now ignored by the theme.
- SEO meta descriptions set in admin for the Signature Series collection and
  the Shipping Policy page. Keep them ≤130 chars: `seo-head.liquid` cuts
  anything longer with "…" even though admin allows 160.
- The collection's own description still says "ATTARWLAS" (typo). It shows on
  the homepage card and the collection banner, so it's visible text: fix only
  with the owner's OK.
- `/products/fresh-woodscape` (bare duplicate) unpublished from Online Store
  only, so it now 404s. The real page is `fresh-woodscape-100ml`.
- Product metafield definition `seo.hidden` (Integer, "Hide from search and
  sitemap") created; set to 1 on the 7 `globo-product-options` helper
  products, which are now out of the sitemap but still resolve for Globo.
- Domain DNS is at **BigRock** (dns1–4.bigrock.in), not GoDaddy.
- Typo "ATTARWLAS" fixed in the Signature Series collection description and
  the main-menu item "About ATTARWALAS".

**Blog: "Fragrance Journal" (2026-10-02).** The `news` blog was renamed (handle
unchanged, so URLs are `/blogs/news/<handle>`). 16 posts were published: six
guides, six Signature-scent posts, a gift guide, a summer/monsoon guide, the brand
story, and how-to-find-your-scent. Sources and the 1200×630 cover generator are in
`../blog/` (outside the theme, so they never get pushed). Covers live in Shopify's
article storage (`/cdn/shop/articles/…`). Each post has a meta description
≤130 chars in `global.description_tag`.

- Facts used are only what the site states: notes from product descriptions,
  "100% Non-Alcoholic", Mumbai since 1998, the Kurla West address and phone.
  The Discovery Set holds all six Signature scents (checked against its
  photo). Duo = perfume + its own attar roll-on. Gift sets = for-him perfume +
  for-her perfume + unisex roll-on. Bundle percentages are left out of posts
  on purpose; see the offer config split in memory.
- `sections/main-article.liquid` JSON-LD is now BlogPosting with real UTC
  offsets (stock Dawn printed local time with "Z"), canonical
  mainEntityOfPage, the author as an Organization, and publisher linked to
  `/#organization`. Don't add a second article schema in
  `seo-structured-data.liquid`.
- Footer "Customer Care" text block (`sections/footer-group.json`) links to
  `/blogs/news`.
- The store timezone is US Eastern (dates render −04:00), not Asia/Kolkata.
  It's an admin setting, left for the owner to change.

### SEOptimer + Semrush re-check (2026-10-11)

Burhan pasted a Semrush report (62) and an SEOptimer report. Crawled all 76
sitemap URLs (status, title, description, canonical, H1, robots, alt):

- **Already fine:** every URL 200, one H1, self canonical; noindex only on
  the free-gift picker product/collection and featured-collection (on
  purpose). Empty `alt=""` images are the zoom-lightbox copies and card
  hover images, which is correct (the visible copy has alt text).
- **Fixed locally in `snippets/seo-head.liquid`, NOT yet pushed** (CLI
  login had expired and the live write needs Burhan's OK):
  - 10 groups of duplicate meta descriptions. Perfume and its roll-on share
    body copy, and each gift set's 100/65/35ml products share one. Products
    without an admin SEO description now lead with their full title
    ("Oudh Eternal – Non-Alcoholic Perfume: The perfume opens…"), and the
    body is re-stripped from HTML so "Lemon</strong><br>Heart" no longer
    renders "LemonHeart". Duo/offer products keep their own fallback.
  - Collection fallback reads "Browse the X collection…" (the Discovery Set
    product and collection had the same line).
  - Blog index description lengthened (was 64 chars).
  - Article titles over 46 chars drop the "– ATTARWALAS" suffix (they ran
    67–74 chars).
  - Contact email no longer plain text: `sections/contact-form.liquid`
    writes "@"/"." as `&#64;`/`&#46;` (renders and links the same), and the
    JSON-LD `email` uses `\u0040`. Shopify Inbox's injected
    `customerServiceEmail` still contains it; that isn't theme code.
- **SEOptimer flags that aren't theme work:** page weight 7.29 MB is the
  5.3 MB 1080p hero MP4 (only a re-encoded/smaller video fixes it);
  `http://www → https://www` is one unavoidable redirect; "deprecated HTML"
  is `<s>` for struck-through prices (valid HTML5); plain-text email is the
  store's own contact address; SPF/DMARC need DNS at BigRock (no MX exists,
  so the domain sends no mail). Facebook/X: no accounts, by choice.

### SEO pass 4: branding, FAQ, ratings, product copy, blog (2026-10-11, live)

**Brand position changed: ATTARWALAS sells alcohol-based AND non-alcoholic
perfumes** (Burhan, 2026-10-11: "branding only, SEO perspective"). Never say
the store, the Signature perfumes or "our perfumes" are non-alcoholic. Attar
roll-ons are oil-based/alcohol-free (true); Customize Perfume has a Type
option Alcoholic / Non-Alcoholic. Which Signature perfumes are which is
unknown, so per-product copy makes no alcohol claim for perfumes.

Pushed to live via Admin GraphQL `themeFilesUpsert` from a Chrome admin tab
(CLI login had expired). Each file was patched from the live copy and
SHA-256-checked against local before upload:

- `seo-head.liquid`: perfume kind "Non-Alcoholic Perfume(s)" -> "Long-Lasting
  Perfume(s)"; product meta description = title + re-stripped body when no
  admin SEO description; collection/blog fallbacks reworded; long article
  titles drop the brand suffix.
- Announcement bar "Long-Lasting Perfumes & Attars"; footer brand line,
  About intro and the "Pure, Oil-Based Attars" value reworded; Organization
  schema description and homepage default meta (settings_schema) reworded.
- Contact email written with `&#64;`/`&#46;`; schema email uses `\u0040`.
- **Homepage FAQ**: `aw_faq` (collapsible-content) before the contact form, 8
  questions, with a new opt-in `faq_schema` setting on collapsible-content
  that outputs FAQPage JSON-LD. Facts only from the site.
- **Star ratings**: `main-product.liquid` Product JSON-LD emits
  `aggregateRating` from `reviews.rating` / `reviews.rating_count` metafields
  (Judge.me syncs them). Judge.me had **0 reviews** on 2026-10-11, so nothing
  shows until real reviews exist. Never fake it.

Admin content (via GraphQL):
- 27 products got new unique descriptionHtml + SEO description (<=130). Duos,
  offers, Globo helpers and the complimentary picker were skipped (the
  homepage Duo carousel prints 5 words of duo descriptions). Source + old
  copy backup: `../seo-content/descriptions.py`,
  `../seo-content/products-backup-2026-10-11.json`.
- Collection SEO descriptions set for 9 collections; featured-collection
  description reworded. `65ml/100ml-gift-set` need `collectionUpdate(collection:)`
  (the legacy `input:` argument is refused for them).
- 12 existing posts edited (claims) + their SEO descriptions; 8 new posts
  from `../blog/posts_c.py`, covers uploaded via admin Files (file_upload on
  `/content/files`). Article SEO description must go through
  `articleUpdate(article:{metafields:[global.description_tag]})`;
  `metafieldsSet` rejects article owner ids.
- Product Offers carry `shippingDetails` (free Standard shipping to IN, the
  only Shopify rate; 0-1 + 3-7 days = the policy's 3-8) and
  `hasMerchantReturnPolicy` = MerchantReturnNotPermitted (refund policy only
  covers damage claims within 24h). claude-seo's merchant validator then
  reports only member-program / ProductGroup (not applicable / optional).
  Update `seo_offer_policies` in `main-product.liquid` if rates or policy change.
- Shop hours confirmed by Burhan 2026-10-11: **Mon-Sat 11:00 AM-8:00 PM**. Store
  schema default and the About page were 10:00 and were corrected.

### Reviews + local SEO (2026-10-11, live)

Pushed via `themeFilesUpsert` (patched from the live copy, SHA-256-checked
against local; the live JSON templates carry Shopify's `/* auto-generated */`
header, which local copies don't, so compare with it stripped):

- **Judge.me on product pages**: `templates/product.json` and
  `product.customize-perfume.json` got the `preview_badge` app block (after the
  title, in `main`) and a new `judgeme_reviews` `apps` section holding
  `review_widget`, right after `main`. Block types are
  `shopify://apps/judge-me-reviews/blocks/<handle>/61ccd3b1-a9f2-4160-9fe9-4fec8413e5d8`.
  Offer/duo templates deliberately have none.
- **Google review link** `https://g.page/r/CU3Boruw6oDeEBM/review` in the footer
  Customer Care list (`footer-group.json`) and the homepage contact section
  description (`index.json`).
- **Store schema `geo`**: new Theme settings → SEO Latitude / Longitude
  (defaults 19.0700624 / 72.8798398, Google Maps' pin for M K Heights);
  `seo-structured-data.liquid` emits GeoCoordinates when both are set.
- A Google Business Profile exists (5.0, 7 reviews); its hours were aligned to
  the site on the same day (Mon–Sat 11–8, Sunday closed). Don't copy Google
  reviews into Judge.me or into schema: that's against Google's terms and
  self-serving review markup.
- Judge.me past-order review requests were scheduled for orders since
  2023-01-01. Its review requests also go to the Globo helper products
  ("Select Size:", "Select size value", "Select Your Complimentary Perfume:");
  turning them off in Judge.me → Product management didn't save from automation.

## Floating launchers (WhatsApp + Shopify Inbox) — keep them off the CTAs

`snippets/floating-stack.liquid` (rendered from `layout/theme.liquid` on every
page) stops the two floating launchers from covering bottom-pinned UI.

The problem it solves: Shopify Inbox renders `<shopify-chat>` as a
**full-viewport fixed host at z-index 2147483000**, so it always paints above
theme content and can't be out-stacked. On mobile it was sitting directly on
top of the product page's `<product-sticky-bar>` (fixed, ~74px) and the offer
pages' `.offer-builder__bar` (sticky, ~109px) — hiding "Add to cart" and
"Select N items".

How it works: on scroll/resize it measures any bottom-pinned bar currently
crossing the bottom edge of the viewport and publishes its height (+8px) as
`--aw-float-lift` on `<html>`. Both launchers offset themselves by it:

- `shopify-chat` → `bottom: var(--aw-float-lift)` (raising the host's bottom
  edge lifts the bubble inside it — you can't reposition the bubble directly)
- `.whatsapp-float` → `bottom: calc(<base> + var(--aw-float-lift))`

**Add `data-floating-clear` to any new bottom-pinned bar** to opt it in.

Gotchas:

- The measurement runs **directly** (not through `requestAnimationFrame`) on
  init/`load`/`visibilitychange`, and the rAF throttle used during scroll has a
  250ms `setTimeout` fallback. rAF is starved in backgrounded/occluded tabs, and
  relying on it alone left the launchers on top of the buy button.
- Separately, `.footer__content-bottom` carries `padding-bottom: 9rem` on mobile
  so the policy links at the very bottom of the page aren't permanently covered
  (there's no bar there to lift against).
- **The chat bubble is invisible on this draft theme, and that is not a bug.**
  Shopify injects `<shopify-chat>` (plus `<shopify-store>` and the `agent_chat`
  config blob) server-side into the **published** theme only. On theme
  `190519771424` — and in `shopify theme dev` — the element is absent from the
  HTML entirely and `customElements.get('shopify-chat')` is `undefined`; the
  script is never served. No theme file, setting, or app embed controls this, so
  nothing here can bring it back on a draft. It reappears on its own once the
  theme is published. Verified 2026-08-23: previewing the *live* theme
  (`?preview_theme_id=169078784288`) still shows the chat, so it's the theme's
  published/unpublished role that decides, not preview mode. Confirm before
  "fixing" a missing bubble:

  ```
  curl -sL -c /tmp/cj -b /tmp/cj "https://www.attarwalas.com/?preview_theme_id=<id>" | grep -c '<shopify-chat'
  ```

  The lift itself was checked against the real widget on the live theme: at a
  lift of 0 the activator lands pixel-identical to Inbox's default, and at 120px
  it rises 120px and stays fully visible.

## Product gallery on mobile: blank slides and a counter that overcounts (fixed 2026-09-22)

Burhan, on an iPhone: swiping to image 3 or 4 of a signature-series perfume
showed overlap and white space. Two independent defects, both reproduced at a
real 390px viewport (see "Auditing at a phone viewport"):

**1. Every slide but the first started invisible.** `product-media-gallery.liquid`
put `scroll-trigger animate--fade-in` on each `<li>`, and Dawn's
`animate--fade-in` holds `opacity: 0.01` until `animations.js`'s
IntersectionObserver says the element is on screen. A slide in a horizontal
scroller is never on screen until it has already been swiped to — and on the
desktop `thumbnail` layout the inactive slides are `display: none`, which never
intersects either. So the reveal could only ever *hide* those slides: you swipe,
land on a blank white frame, and the photo fades in afterwards. Measured on the
live page — slides 2-6 all sat at `opacity: 0.01` on load, and a screenshot
mid-swipe caught slide 4 as a near-empty white frame reading "4/7". iOS defers
IntersectionObserver during momentum scroll, which is why it looks far worse on
a real phone than in desktop emulation.

Fixed by emitting the reveal classes only on the first slide (`gallery_reveal`
in that snippet) — the one that is genuinely below the fold on load and the only
one the reveal was ever doing anything for.

**2. The counter read "1 / 7" for six images.** The ATTARWALAS mobile block in
`section-main-product.css` makes each slide `width: 100%` (no peek), but left
`.grid`'s `column-gap` in place, so slides sat 394px apart inside a 390px
scroller. `SliderComponent.initPages()` computes
`slidesPerPage = Math.floor(clientWidth / itemOffset)` → `floor(390 / 394)` →
**0**, and `totalPages = items - 0 + 1` → 7, a page the slider can never scroll
to. The same 4px is the white seam visible between two photos mid-swipe.

Fixed with `column-gap: 0` on that list. The `:after` spacer's
`margin-left: calc(-1 * var(--grid-mobile-horizontal-spacing))` had to be zeroed
in the same block: it is the counterweight to that gap, and on its own it pulls
the scrollable width 4px short of the last slide's snap point, putting the last
photo permanently out of reach. Verified at 390px and at iPhone 16's 393px —
`scrollWidth - clientWidth` lands exactly on the last slide's `offsetLeft`, the
counter reads `3 / 6`, and page overflow is 0.

**Any full-bleed slider built on `.grid` needs both halves of this.** Setting a
slide to `width: 100%` without also zeroing the gap silently breaks the
counter's arithmetic, and zeroing the gap without the `:after` margin silently
strands the last slide.

**3. The photo's size was decided by the viewport's HEIGHT** — which is why it
looked right on some phones and wrong on others. `constrain_to_viewport` is on,
so Dawn caps the media box at `max(300px, 100vh - 400px)`, and with
`media_fit: contain` it applies that cap to the **width** as well
(`--contained-width: calc(var(--constrained-height) * var(--aspect-ratio))`).
A square photo therefore only goes edge to edge when `100vh ≥ width + 400`:

| phone | box in the slide |
| --- | --- |
| 390×844, 393×852, 412×915 | full width — looks correct |
| 375×667 (SE/8) | **300×300, 38px of white each side** |
| 320×568, Display Zoom, in-app browsers | shrunk the same way |

Mid-swipe that reads as two undersized photos with a white band between them.
Fixed in the mobile block by sizing the media from its own aspect ratio
(`width: 100%` + `padding-top: var(--ratio-percent)`) so the slide's width is
the only thing that decides, wrapped in `@media (orientation: portrait)`: a
square photo is then as tall as the slide is wide, always inside a portrait
viewport but not a landscape one, which keeps Dawn's cap.

Verified on the live page at 320/360/375/390/393/412/430 wide — every slide is
the viewport width, square, identical to its siblings, counter correct, last
slide reachable, zero page overflow.

**4. A 1px hairline of page colour down both edges of every photo.** What
Burhan actually meant by "white border" — visible against the dark lifestyle
shots, invisible against the white-background ones. `.product-media-container`
carries `max-width: calc(100% - var(--media-border-width) * 2)`, reserving room
for a frame the mobile block removes with `border: 0` — so the media box
measured **390.77px inside a 392.78px slide**. Adding `max-width: 100%`
alongside that `border: 0` (the desktop block already pairs the two) takes it to
0 gutter at 320/360/375/393/412/430. **Keep `border` and `max-width` together in
that rule** — resetting one without the other is what caused this.

**5. A 5px band of page colour above and below every photo** — the "white
border", and the one that affected *every* product, roll-ons included, not just
signature series. `component-slider.css` gives each mobile slide
`padding-top/bottom: max(var(--focus-outline-padding), var(--shadow-padding-*))`
= `0.5rem`, reserving room for a focus ring and the media drop shadow. The
gallery has neither (the shadow is switched off in the same block), so it only
ever painted a band across the top and bottom of each slide. Measured: slide
403px tall around a 393px image. Zeroed for
`[id^="MainProduct-"] .product__media-list.slider--mobile .slider__slide`.
Verified on the live roll-on (7 slides) and signature (5 slides) pages at
393/402/412 — top, bottom, left and right bands all 0 on every slide.

**6. `scroll-padding-left: 1.5rem` on the scroller — the one that mattered.**
Burhan's description is what cracked it: "I scrolled right, the next image
should cover the whole page and it doesn't." With a 1.5rem scroll-padding the
browser aligns each `scroll-snap-align: start` slide **15px right of the
container's left edge**, so every slide comes to rest 15px over and a 15px
strip of the previous slide stays on screen. Measuring his screenshot's pixels
confirmed it: `x=6..27` was `rgb(252,251,249)`, the page colour, ≈13 CSS px at
that capture's scale — not white bleeding out of a photo, the neighbouring
slide.

**The cascade trap:** this block already said `scroll-padding-left: 0`, and it
had been dead from the day it was written. `[id^="MainProduct-"]
.product__media-list` is specificity (0,2,0); so is Dawn's
`.slider.slider--mobile` in `component-slider.css` — and Shopify emits that
file *after* this one on the product page, so it won on source order. Same for
`margin-bottom: 2.4rem`, silently losing to Dawn's `1rem`. Both now live in
`[id^="MainProduct-"] .product__media-list.slider.slider--mobile`, (0,4,0),
which wins regardless of load order.

**Before overriding anything on `.product__media-list`, check whether
`component-slider.css` sets it too** — it also owns `overflow-x`,
`scroll-snap-type` and `scroll-behavior` on the same element, and it always
loads later. An equal-specificity override there is a no-op that looks correct
in the source file.

**Chasing this took four passes because each fix exposed the next band.** If a
"border" is reported again, measure all four gaps between `.product__media-item`
and its `img` before changing anything — the number tells you which rule owns
it (5px = slider padding, 1px = the container's `max-width` frame reservation,
4px on one side only = the grid `column-gap`).

**Not a bug: images 3 and 4 have white baked in.** Every signature-series
product's images 3 and 4 are white-background studio shots with ~8-16% empty at
the top and ~21% at the bottom, against a page of `rgb(252,250,245)`, while
images 1-2 are full-bleed lifestyle shots. Full-bleed mobile slides make that
read as a white slab. The subject is a wide composition in a square frame, so
cropping to square just re-adds the bands — it needs re-exported artwork or a
background recolour to the page colour, decided in admin, not in CSS.

**Not changed: the lightbox is still Dawn's pan-to-zoom.** Tapping a photo
opens `product-media-modal`, and `.product-media-modal__content > * { width:
100% }` lives only in `@media (min-width: 750px)` — so on a phone the image
renders at its intrinsic ~1100px inside a 375px scroller and you pan around it.
It is also `loading="lazy"` inside a `display: none` modal, so nothing is
fetched until the tap, and a slow connection shows a blank pannable canvas
first. That is stock Dawn behaviour, not a regression, but it is a plausible
second source of "white space" reports. Making it fit the screen means adding
that `width: 100%` at mobile too and dropping `sizes="…, 1100px"` in
`snippets/product-media.liquid` to `100vw` so it reuses the image the gallery
already downloaded — a UX decision (fit vs. pinch-to-inspect) to put to Burhan
before doing it.

## Gotcha: scroll-reveal animations trap native `<select>` dropdowns (fixed 2026-08-31)

Burhan reported the "Your free perfume" dropdown on the Customize Perfume
product page (`snippets/product-gift-picker.liquid`) opening and closing
again almost instantly on click, on desktop — the option list flashed and
disappeared before he could pick anything.

Root cause is a Chromium behavior, not this theme's JS: when
`settings.animations_reveal_on_scroll` is on (it is —
`config/settings_data.json`), `sections/main-product.liquid` wraps the whole
buy box in `.product__info-wrapper.scroll-trigger.animate--slide-in`. Dawn's
stock reveal animation (`--animation-slide-in` in `assets/base.css`) uses
`animation-fill-mode: forwards`, so once the slide-in finishes it holds
`transform: translateY(0)` on that wrapper **permanently** — visually a
no-op (0 is no shift), but a `transform` value of any kind, including
`translateY(0)`, still creates a new CSS containing block. Chrome has a
long-standing bug where a native `<select>` nested inside a transformed
ancestor opens its popup and immediately closes it again. Confirmed live via
`element.getAnimations()`/computed style on `.product__info-wrapper`, and
confirmed the CSS fix by manually toggling the class described below and
checking `getComputedStyle(...).transform` flips from
`matrix(1,0,0,1,0,20)` to `none`.

This is a general risk, not specific to the free-gift picker: **any** native
form control (`<select>`, and in principle anything relying on
`position: fixed` positioning) nested inside a `.scroll-trigger` element is
exposed to this once animations are on, site-wide, not just this one
product page.

**Fix, not a workaround** — `assets/animations.js`'s `onIntersection` now
attaches a one-time `animationend` listener when an element's reveal starts,
adding a `scroll-trigger--settled` class once the animation genuinely
finishes. `assets/base.css` has a matching rule
(`.scroll-trigger.animate--slide-in.scroll-trigger--settled` /
`.animate--fade-in.scroll-trigger--settled`) that sets `animation: none;
transform: none; opacity: 1`. The `opacity: 1` is necessary, not decorative
— cancelling the animation (`animation: none`) drops **everything** the
fill-mode was holding, including the opacity fade-in's held `opacity: 1`;
without restoring it explicitly the element falls back to the base
`.scroll-trigger.animate--slide-in { opacity: 0.01 }` rule and the whole
block goes invisible. Caught this exact regression while testing live —
first version of the fix cleared `transform` correctly but made the entire
buy box disappear.

**Known verification limit**, same class of issue as the announcement-bar
marquee (see "Gotcha: don't trust 'it's not moving' from an unfocused
automated browser" above): in a browser-automation tab without real OS
focus, `element.getAnimations()` can report `currentTime: 0` /
`startTime: 0` indefinitely even seconds after navigation — the animation
timeline itself is frozen, not just unpainted. `document.hasFocus()`
returning `true` after a synthetic click did **not** unfreeze it here (unlike
the marquee case). The CSS side of this fix was verified correct by manually
adding `scroll-trigger--settled` and checking computed styles; the JS side
(the `animationend` listener actually firing and adding that class within
~0.6s of a real page load) could not be fully confirmed through automation
and should be spot-checked in a normal, focused browser: open Customize
Perfume (or any product with `animations_reveal_on_scroll` on), wait a
second, click the free-gift select, and confirm the option list stays open.

### The fix above never actually reached above-the-fold elements (fixed 2026-09-22)

That "known verification limit" turned out to be masking a real bug, not
just an automation artifact. Burhan reported the free-gift search dropdown on
Customize Perfume rendering as a garbled mess mid-scroll, its result rows
visibly interleaved with the "Bundle Offers" section further down the page —
the *stacking* half of the exact same containing-block problem documented
above, not the `<select>`-closing half, but the identical root cause.

`onIntersection`'s `animationend`-listener attachment was nested inside
`if (elementTarget.classList.contains('scroll-trigger--offscreen'))`. That
class is only ever added by this same function's `else` branch, when an
element's *first* intersection check reports `isIntersecting: false`. An
element already visible in the viewport at page load — `.product__info-wrapper`
on any product page is exactly this, being the buy column near the top —
reports `isIntersecting: true` on that very first check, so it never carries
`--offscreen` and the listener-attachment was skipped entirely. Nothing was
timing-dependent about this: `base.css` runs the reveal animation via
`.scroll-trigger:not(.scroll-trigger--offscreen)` specifically so
already-visible content animates in with no JS help at all (confirmed via
`element.getAnimations()` — a real, finished, 1-second animation, with zero
class manipulation from JS) — but that same already-visible element then had
no path to ever reach `scroll-trigger--settled`, so `animation-fill-mode:
forwards` held `transform: translateY(0)` → `matrix(1,0,0,1,0,0)` on it
**permanently**, not just for the first second after load. Every
above-the-fold `.scroll-trigger` element site-wide has been silently stuck
like this since the original fix — the `<select>`-closing bug above likely
looked "fixed" mainly because most of the elements it was tested against
were below the fold, where the offscreen→intersecting path works correctly.

Fixed by moving the `addEventListener('animationend', …)` call out of that
nested `if`, so it always runs once `isIntersecting` is true, regardless of
whether the element was ever marked offscreen. Verified two ways: (1) read
the deployed minified `animations.js` directly and confirmed the listener
call is now comma-joined at the same statement level as the offscreen check,
not nested inside it; (2) since this harness's animation timeline still
wouldn't reliably fire a real `animationend` event (the same automation
limitation as above — `getAnimations()` reached `finished`/`currentTime:
1000` after forcing a repaint, but the DOM event itself still didn't
dispatch), dispatched a synthetic `AnimationEvent('animationend')` directly
and confirmed the listener responds correctly (`scroll-trigger--settled`
added, computed `transform` flips to `none`), then confirmed every ancestor
of the gift picker's dropdown reads `transform: none` once settled — i.e.
the z-index:10 list is free to stack against the whole document again, not
trapped inside `.product__info-wrapper`'s local stacking context.

If a future report describes stacking/overlap on any above-the-fold section
(not just this one), check whether its `.scroll-trigger` ancestor ever
reaches `scroll-trigger--settled` before assuming it's a new bug — this fix
covers it, but any *other* code path that adds `.scroll-trigger` to an
element and expects `onIntersection` to settle it should be checked against
this same trap.

## Mobile pass (2026-09-07)

Burhan reviewed the site on a phone and asked for a general sizing/behaviour
pass. Audited at a real 390×844 viewport (see "Auditing at a phone viewport"
below). The offer-page items are documented up in the offer section; the rest:

### The homepage hero was a black rectangle until the video buffered

`sections/video.liquid` hero mode stacks a `<video>` on top of an `<img
class="video-section__hero-poster">`, both `position: absolute`, no z-index.
A `<video>` that hasn't decoded a frame yet **paints as opaque black**, so it
covered the poster for as long as the source took to download — and the source
is a 4.4MB 1080p / 7.2Mbps MP4, chosen deliberately (see the comment in that
section about serving eagerly from the CDN). Measured live: `readyState` still
0 after 10s on a desktop connection. On mobile data the entire first impression
of the site was a black screen.

Fixed by holding the video at `opacity: 0` (`video-section.css`) and having the
section's own inline script add `is-video-ready` to `.video-section__hero` on
`loadeddata` / `playing`, with a `readyState >= 2` check up front for the cached
case. The poster — which the section already loads responsively with
`fetchpriority="high"` — is what shows meanwhile.

The video source strategy was left alone on purpose. If the hero ever needs to
be quicker on mobile, the lever is a smaller MP4 in admin, not the theme.

**Failure mode is deliberate:** if that script never runs the video stays hidden
and the poster stands in, i.e. a still hero. Don't "fix" this by defaulting the
video to `opacity: 1` — that restores the black rectangle.

### Perfumer section no longer shows a stock placeholder

`sections/perfumer.liquid` filled its 45vh media slot with Shopify's
`lifestyle-1` line-art placeholder whenever no perfumer photo was set — which is
every product today (see the launch checklist). On a phone that's ~380px of
generic illustration reading as a broken image.

The placeholder now renders **only in the theme editor** (`request.design_mode`),
where it marks the slot. On the storefront a photo-less block gets
`aw-perfumer--no-photo`, which drops both `min-height`s and un-absolutes the
credit, so the section collapses to bio + name (597px → 315px on mobile).

This makes the launch-checklist item ("set a per-product perfumer photo") a
polish task rather than a visible defect — it's still worth doing.

### Cart drawer line total wrapped

`.cart-drawer .cart-item` was `grid-template: repeat(2, auto) / repeat(4, 1fr)`.
Four equal tracks gave the total ~83px, narrower than a four-figure rupee line
total: "Rs. 5,998.00" broke after "Rs." and ran into the drawer's right padding.
Now `8rem minmax(0, 1fr) max-content` — thumbnail, details (takes the slack),
total sized to its own content. `__details` moved from `grid-column: 2 / 4` to
`2`, `__totals` is explicitly `3`, `__quantity` `2 / 4`.

### Product buy column tightened on mobile

`.product__info-container > * + *` went 2rem → 1.2rem, and the section's bottom
padding 9rem → 4rem. Also hidden: the wrapper around Shopify's installment
banner, which renders a form of nothing but hidden inputs when the shop isn't
eligible for Shop Pay Installments but still claimed a 2rem slot. Scoped with
`:has(> form.installment):not(:has(shopify-payment-terms))`, so the banner comes
back on its own if installments are ever enabled.

### Not fixed: prices read two different ways

The product page, cards, and cart say `Rs. 2,999.00`; offer pages and deal cards
say `₹2,999` (they pipe through `money_without_trailing_zeros | replace: 'Rs.',
'₹'`). Burhan asked for `₹2,999` everywhere.

**This is not a theme fix.** `money` / `money_with_currency` render the store's
`money_format`, which only exists in **admin → Settings → Store details →
Currency formatting**. There are 126 `| money` calls across 23 theme files, and
patching them would still leave checkout, order emails, and apps saying
`Rs. 2,999.00` — a *worse* inconsistency than today's. Set both HTML fields to
`₹{{amount_no_decimals}}` in admin and every surface agrees at once; then the
`replace:` hacks in the offer snippets become no-ops and can be dropped.

## Auditing at a phone viewport

`resize_window` is ignored by the tiling WM on this machine, and Shopify sends
`frame-ancestors`, so the storefront can't be put in a plain `<iframe>` either.
What works: fetch the page HTML, inject a `<base href>`, and hand it to a
**`srcdoc` iframe** sized 390×844. `srcdoc` inherits the parent's origin, so
`frame-ancestors` never applies, assets resolve, scripts run, and media queries
evaluate against the iframe's own width. `contentDocument` stays reachable for
measuring.

Caveats found the hard way: the hero `<video>` won't load in that context (so
a black hero there proves nothing — that one had to be confirmed on the real
page), theme CSS comes from `cdn.shopify.com` so `sheet.cssRules` throws
`SecurityError` and rule enumeration is impossible (grep the local files
instead), and a screenshot taken mid-drawer-animation will look clipped —
re-measure before believing it.

Your step: finish the Google sign-in for the app. In Shopify admin → Google & YouTube, click "Connect Google account". Google opens a popup window that I can't see or control. In it, choose <attarwalahussain72@gmail.com> (not the gamershome one) and click Allow. If nothing appears, look for a "popup blocked" icon at the right end of the address bar.
