# Offer Bundle — discount function (setup guide)

Makes the fixed price on the "Pick Any N" offer pages actually stick
("Get any 2 for ₹1,999"). The function lives in a separate app,
`~/Desktop/SHOPIFY/offer-transform-app` — **not** part of this theme repo.

## What it does

The offer page adds the perfumes the customer picked as **ordinary cart lines**,
tagging every line of one bundle with the same properties:

| Property | Example | Visible to customer |
| --- | --- | --- |
| `Offer` | `Double Dhamaka` | yes |
| `_bundle` | `double-dhamaka-1755331200000` | no |
| `_bundle_price` | `1999.00` | no |
| `_bundle_size` | `2` | no |

The function groups lines back together by `_bundle` and discounts them down to
`_bundle_price`:

```
Oud   80 ML                ₹1,500.00
Aura  80 ML                ₹1,500.00
Double Dhamaka            −₹1,001.00
Total                      ₹1,999.00
```

The perfumes are real line items, so inventory, fulfillment and the packing slip
all work normally, and the customer can see what they saved.

Nothing in the function is per-offer — the price and size travel on the cart
lines. **One automatic discount in the admin covers every offer the store will
ever run**, including offers you create later.

## Setup (one time)

Run these in a **real terminal**; browser auth is interactive.

```bash
cd ~/Desktop/SHOPIFY/offer-transform-app

# 1. Install dependencies (done once; includes a project-local Shopify CLI)
npm install

# 2. Create the app in your dev dashboard org and write client_id into
#    shopify.app.toml. Choose "Create a new app" when prompted.
npx shopify app config link

# 3. Build + upload the function
npx shopify app deploy
```

> Use `npx shopify`, **not** the global `shopify`. The globally installed CLI
> caches its javy binary inside `/usr/lib/node_modules/@shopify/cli/bin/`, which
> is root-owned, so the function build dies with `EACCES: permission denied`.
> The project-local CLI writes into `node_modules/` instead and just works.

> `shopify app config link` rewrites `shopify.app.toml` from the remote app and
> will flip `embedded` back to `true` and blank out the comments. Set
> `embedded = false` again before deploying — there's no app UI to embed.

Then **install the app on the store** — the deploy output links to the app in
the Dev Dashboard, where "Install on store" / the install link puts it on
`attarwalas-4203.myshopify.com`.

### Turn the discount on

This is the step that actually activates the function, and it's done entirely in
the admin — no API call, no backend:

1. Shopify admin → **Discounts** → **Create discount**
2. Pick **Offer bundle discount** from the list (it appears once the app is
   installed) — it's under the automatic/app discount section
3. Name it something customer-facing, e.g. `Offer bundles`
4. Set it to start immediately, no end date → **Save**

One discount, left running forever. You never touch it again when adding offers.

> If the CLI rejects `api_version` or the `purchase.product-discount.run` target
> in `extensions/offer-discount/shopify.extension.toml`, it's a version drift
> thing: run `npx shopify app generate extension --template discount` to get a
> scaffold matching your CLI, then copy `src/index.js` and `src/run.graphql`
> from `extensions/offer-discount/src/` into the generated folder and deploy.

## Behaviour and edge cases

- **Customer edits the bundle in the cart.** If they change a quantity or delete
  one of the lines, the bundle's unit count no longer matches `_bundle_size`,
  the discount stops applying and everything reverts to full price. Deliberate —
  it stops someone getting 1 perfume for the 2-perfume price.
- **Two bundles in one cart.** Each add gets a unique `_bundle` id, so they're
  discounted separately and never merge, even for identical picks.
- **Bundle + normal products.** The discount targets only that bundle's lines;
  the rest of the cart is untouched.
- **Function not installed / discount not created.** The perfumes go into the
  cart at full price. The customer is over-charged rather than under-charged, so
  set the discount up before pointing customers at an offer page.
- **Discount combinations.** By default this won't stack with other automatic
  discounts. Configure that on the discount in the admin if you need it to.

## Files

- `shopify.app.toml` — app config. `use_legacy_install_flow = true` is what lets
  a function-only app with no OAuth server be installed.
- `extensions/offer-discount/src/index.js` — grouping + discount logic. The
  filename is not free choice: the CLI treats a function as JavaScript only when
  the entry point is `src/index.js` or `src/index.ts`, and otherwise demands an
  explicit `build.command`. (`export = "run"` in the extension TOML is the name
  of the exported *function*, which is still `run`.)
- `extensions/offer-discount/src/run.graphql` — the function's input query
- `extensions/offer-discount/shopify.extension.toml` — `typegen_command = "true"`
  disables the default `graphql-code-generator` step; the function is plain JS
  with JSDoc types and never imports generated GraphQL types, so there's no
  `schema.graphql`/codegen config to feed it.
- `cart-transform-legacy/` — the earlier cart-transform version of this
  function, superseded. Kept only for reference; a cart transform has to be
  activated through the `cartTransformCreate` API, which needs an app backend to
  call it. Delete when you're happy with the discount function.
