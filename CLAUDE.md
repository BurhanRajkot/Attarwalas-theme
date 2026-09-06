# CLAUDE.md

Guidance for working in this repo. Read this before making changes.

## Before submitting / launching this site

Outstanding items to resolve before this theme goes live — check this list before submitting.

- [ ] **Decide real pricing for the 10ml/35ml gift-size perfume variants.** As
      of 2026-08-29 the free-gift picker gives away a 10ml/35ml **perfume**
      (from `signature-series`) instead of a roll-on — see "Free gift" below.
      The 10ML/35ML variants added to each signature-series product to make
      this possible use computed placeholder pricing (10ml = 10% of the
      100ml price, 35ml = 35%), same kind of ad-hoc placeholder as the 50ml
      size before it. Since these are never actually charged (the discount
      function zeroes them), the pricing mostly matters for the order record
      and for what these variants would cost if a customer bought one
      directly rather than as a gift — worth a real pricing decision from
      Burhan rather than leaving the formula in place indefinitely. See
      memory (`dummy-gift-variants-pending-collection-redo`) for details.
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
- [ ] **Normalise the attar roll-on Size option values in admin.** Five roll-ons
      use `6ML`/`12ML` and four use `6ml`/`12ml` (Persian Rose, Florence
      Orchidia, Arabian Jasmine, Pure Kashmiri Rose). The offer pages' group
      size lock now compares case-insensitively so this doesn't break anything
      today, but the two spellings also show up verbatim in the picker's size
      dropdown and on the cart line, which looks like a mistake to a customer.
      Only fixable in admin (Products → [product] → Variants → Size). See
      "Gotcha: roll-on Size values aren't cased consistently in admin" below.
- [ ] **Create the duo product(s) and the `duo` collection.** The duo page
      (`templates/product.duo.json`) is built and verified, but nothing points at
      it yet. To go live: create a product per duo, set its Theme template to
      `duo`, tag it and add it to a new manual collection with handle `duo`
      (that handle is what the "More duos" strip and any Offer Teaser section
      pointed at duos read from). The duo product's own price is never charged —
      like the offer products, it only supplies the page — but give it one
      anyway so it can be published. Then confirm the perfume/attar groups in the
      theme editor: they currently default to `men-3, women-1, unisex-3` for
      bottles and `attar-roll-ons` for attars. See "Duo — perfume + attar" below.
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

/  ```
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

**Known limitation: doesn't fire on "Buy Now."** `product-form.js` redirects
straight to `/checkout` on that path without ever publishing `cartUpdate`, so
there's no hook to attach to without touching that shared file. A customer
using Buy Now on a qualifying product simply doesn't get the pre-pick
opportunity — no worse than before this feature existed, since Buy Now
already skipped the theme's cart (and its free-gift picker) entirely.

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

### Outstanding: metaobjects ≠ variants

Burhan is bulk-populating the `fragrance` metaobject via Matrixify (50+ entries
as of 2026-08-22, more ongoing). Adding a metaobject entry does **not** make it
sellable — see the checklist item at the top of this file. Until a matching
variant + price exists for a fragrance on `customize-perfume-1`, it simply
won't appear in the picker, which is correct/expected behavior, not a bug.

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

The separator between messages was also upgraded from a plain grey dot to a
small gold diamond (`background: rgb(var(--color-button))`, `transform:
rotate(45deg)`) — same brand-gold variable every CTA site-wide already uses,
not a hardcoded color, so it can't drift from the color scheme.

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

## Useful Shopify CLI commands

```
shopify theme dev --store=<store> --theme=<id>   # local dev server + live push to draft theme
shopify theme list --store=<store>               # list themes and their ids
shopify theme pull --store=<store> --theme=<id>   # pull remote theme state down locally
shopify theme push --store=<store> --theme=<id>   # one-time upload (not used mid-dev-session;
                                                    # theme dev already live-syncs)
```
