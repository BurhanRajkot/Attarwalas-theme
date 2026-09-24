/**
 * <product-gift-picker> — lets the customer pre-pick their free perfume
 * directly on a qualifying product's page, instead of only being able to
 * claim it once they're already in the cart (see
 * snippets/product-gift-picker.liquid for the full rationale).
 *
 * The gift can't travel in the same /cart/add request as the main item, so
 * this waits for that add to succeed (PUB_SUB_EVENTS.cartUpdate, matched by
 * variant id so it only reacts to this exact product form) and then fires
 * its own /cart/add.js call for the chosen gift variant — mirroring
 * assets/free-gift.js's own add pattern. A cartUpdate is published
 * afterwards so the cart drawer/bubble refresh and pick up the new line;
 * unlike free-gift.js (which renders the sections it just wrote itself),
 * nothing here has already rendered anything, so publishing is the right
 * call, not a race.
 */
if (!customElements.get('product-gift-picker')) {
  class ProductGiftPicker extends HTMLElement {
    constructor() {
      super();

      // Two interchangeable input shapes: a plain <select> (most qualifying
      // products, a handful of gift perfumes) or a searchable
      // <fragrance-picker> radio list (Customize Perfume, ~99 fragrances —
      // see snippets/product-gift-picker.liquid). Both expose the chosen
      // gift's variant ids via data-gift-variant-small/-large on the
      // selected <option>/checked radio, so getSelectedOption() below is the
      // only place that needs to know which shape is in play.
      this.select = this.querySelector('[data-gift-select]');
      this.fragrancePicker = this.querySelector('[data-gift-fragrance-picker]');
      this.confirmEl = this.querySelector('[data-gift-confirm]');
      this.requiredHint = this.querySelector('[data-gift-required-hint]');
      this.sectionId = this.dataset.section;
      // A second copy of the required-hint's message, injected right above
      // the Add to cart / Buy Now buttons themselves (see buyWarningMessage()
      // and updateBuyButtons() below) — this picker can be scrolled out of
      // view by the time a customer reaches those buttons, so the warning
      // repeats where they're actually about to click. Not markup in
      // buy-buttons.liquid on purpose: that snippet is shared by every
      // product on the site, and this only applies to gift-eligible ones.
      this.buyWarning = this.createBuyWarning();
      this.currentVariantId = this.dataset.initialVariantId;
      // Which of a live variant's option1/option2/option3 is actually "Size"
      // varies by product (see snippets/product-gift-picker.liquid, which
      // resolves this once server-side) — Customize Perfume's Size is
      // option2, not option1 like the single-option signature-series bottles.
      this.sizeOptionKey = this.dataset.sizeOptionKey || 'option1';
      this.currentBucket = this.sizeToBucket(this.dataset.initialSize);
      // Whether the *current* variant is purchasable at all — tracked so the
      // required-gift gating below never fights Dawn's own sold-out
      // handling (see updateBuyButtons()). 'false' is the only value that
      // means unavailable; missing/blank defaults to available.
      this.variantAvailable = this.dataset.initialAvailable !== 'false';

      this.onVariantChange = this.onVariantChange.bind(this);
      this.onCartUpdate = this.onCartUpdate.bind(this);

      this.variantChangeUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, this.onVariantChange);
      this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, this.onCartUpdate);

      // A stale "X added as your free gift" message sitting there forever
      // reads as "you're done here" even though the picker underneath it is
      // already reset and ready to pick again — so it's cleared either after
      // a few seconds or the moment the customer touches the picker again,
      // whichever happens first. Listening on the whole element (rather than
      // this.select specifically) covers both input shapes: a native
      // <select>'s change event, and the bubbled change fragrance-picker.js
      // dispatches when a radio is picked.
      this.addEventListener('change', () => {
        this.hideConfirm();
        this.updateBuyButtons();
      });

      // Picking a free perfume here is required (2026-09-24) — start with
      // the product's own buttons locked, same as nothing being chosen yet.
      this.updateBuyButtons();
    }

    // Product Size option values aren't cased consistently across products
    // (e.g. Customize Perfume uses '50ml'/'80ml'/'100ml', signature-series
    // bottles use '50ML'/'100ML') — compare case-insensitively so the bucket
    // choice doesn't silently default to '100' for every lowercase product.
    sizeToBucket(size) {
      return (size || '').toLowerCase() === '50ml' ? '50' : '100';
    }

    // Builds (once) the red warning banner that sits directly above the buy
    // buttons — see the constructor comment. Placed as the previous sibling
    // of .product-form__buttons rather than inside it, so it reads before
    // the buttons rather than between Add to cart and Buy Now. Dawn's own
    // variant-change re-render (global.js renderProductInfo) only ever
    // swaps price/inventory/sku innerHTML and toggles the add button's own
    // disabled attribute — it never touches .product-form__buttons itself —
    // so this stays in the DOM across variant changes and doesn't need
    // re-creating.
    createBuyWarning() {
      const form = document.getElementById(`product-form-${this.sectionId}`);
      const buttons = form ? form.querySelector('.product-form__buttons') : null;
      if (!buttons) return null;
      const existing = buttons.parentElement.querySelector('[data-gift-buy-warning]');
      if (existing) return existing;
      const warning = document.createElement('p');
      warning.className = 'product-gift-picker__buy-warning';
      warning.setAttribute('data-gift-buy-warning', '');
      warning.hidden = true;
      buttons.parentElement.insertBefore(warning, buttons);
      return warning;
    }

    // "10ml" for a 50ml bottle, "35ml" for everything else — mirrors the
    // bucket the rest of this component already tracks (see sizeToBucket()).
    buyWarningMessage() {
      const size = this.currentBucket === '50' ? '10ml' : '35ml';
      return `*Select your free ${size} perfume below before you can buy.`;
    }

    // Reads whichever input is actually present. For the select, that's the
    // chosen <option>; for the fragrance picker, whichever radio ended up
    // checked (mirrors fragrance-picker.js's own onChange, which is robust
    // to label-forwarded activation across browsers the same way).
    getSelectedOption() {
      if (this.select) return this.select.options[this.select.selectedIndex];
      if (this.fragrancePicker) return this.fragrancePicker.querySelector('.fragrance-picker__radio:checked');
      return null;
    }

    resetSelection() {
      if (this.select) this.select.value = '';
      if (this.fragrancePicker) {
        const skip = this.fragrancePicker.querySelector('.fragrance-picker__radio[value=""]');
        if (skip) skip.checked = true;
        const searchInput = this.fragrancePicker.querySelector('[data-fragrance-search]');
        if (searchInput) searchInput.value = '';
      }
    }

    disconnectedCallback() {
      if (this.variantChangeUnsubscriber) this.variantChangeUnsubscriber();
      if (this.cartUpdateUnsubscriber) this.cartUpdateUnsubscriber();
      clearTimeout(this.confirmTimeout);
    }

    // Keeps the picker pointed at the right gift size (10ml vs 35ml) as the
    // customer switches the main product's own Size option — scoped to this
    // section only, since other product-forms (quick-add cards etc.) on the
    // same page publish this event too.
    onVariantChange(event) {
      if (!event.data || event.data.sectionId !== this.sectionId) return;
      const variant = event.data.variant;
      // No matching variant for the chosen options (Dawn's own "Unavailable"
      // state) — nothing to gate against a gift choice, and touching the
      // buttons here would fight setUnavailable()'s own label/disable work.
      if (!variant) {
        this.variantAvailable = false;
        this.updateBuyButtons();
        return;
      }
      this.currentVariantId = variant.id;
      this.currentBucket = this.sizeToBucket(variant[this.sizeOptionKey]);
      this.variantAvailable = variant.available;
      this.updateBuyButtons();
    }

    // Every button that can submit this product's form: the Add to cart and
    // Buy Now buttons inside <product-form>, plus the sticky bar's own Add
    // button, which lives outside the form and targets it via the `form`
    // attribute instead (see sections/main-product.liquid). Without gating
    // that one too, a customer could scroll past this picker, ignore it, and
    // still buy through the sticky bar.
    getBuyButtons() {
      const buttons = [];
      const form = document.getElementById(`product-form-${this.sectionId}`);
      if (form) {
        const addButton = form.querySelector('[name="add"]');
        if (addButton) buttons.push(addButton);
        const buyNowButton = form.querySelector('[name="checkout"]');
        if (buyNowButton) buttons.push(buyNowButton);
      }
      // `button`, not just `[form="…"]` — every variant-option radio/select,
      // the swatch inputs, and the quantity field all carry this same `form`
      // attribute too (see snippets/product-variant-options.liquid,
      // swatch-input.liquid, product-variant-picker.liquid), so the bare
      // attribute selector was locking the entire picker — including every
      // fragrance radio — instead of just the sticky bar's button. Scoping
      // to `button` is what actually limits this to the one real match,
      // sections/main-product.liquid's `[data-sticky-bar-add]`.
      document.querySelectorAll(`button[form="product-form-${this.sectionId}"]`).forEach((button) => {
        if (!buttons.includes(button)) buttons.push(button);
      });
      return buttons;
    }

    // Keeps this product's buy buttons locked until a real gift is chosen
    // (not the "Select your free perfume…" placeholder). Only ever acts
    // while the variant is actually available — when it isn't, Dawn's own
    // sold-out handling owns these buttons and this backs off entirely, so
    // the two systems can never fight over the same disabled attribute.
    // data-gift-locked marks a button as disabled *by this component*, so a
    // later re-enable only ever touches buttons this component itself
    // disabled, never one disabled for an unrelated reason.
    updateBuyButtons() {
      if (!this.requiredHint) return;

      if (!this.variantAvailable) {
        this.requiredHint.hidden = true;
        if (this.buyWarning) this.buyWarning.hidden = true;
        return;
      }

      const option = this.getSelectedOption();
      const giftChosen = !!(option && option.value);

      this.getBuyButtons().forEach((button) => {
        if (giftChosen) {
          if (button.dataset.giftLocked === 'true') {
            button.removeAttribute('disabled');
            delete button.dataset.giftLocked;
          }
        } else {
          button.setAttribute('disabled', 'disabled');
          button.dataset.giftLocked = 'true';
        }
      });

      this.requiredHint.hidden = giftChosen;
      if (this.buyWarning) {
        this.buyWarning.textContent = this.buyWarningMessage();
        this.buyWarning.hidden = giftChosen;
      }
    }

    onCartUpdate(event) {
      // Ignore our own publish below, and any other product-form on the page.
      if (event.source !== 'product-form') return;
      if (String(event.productVariantId) !== String(this.currentVariantId)) return;

      const option = this.getSelectedOption();
      if (!option || !option.value) return;

      const variantId = option.dataset[this.currentBucket === '50' ? 'giftVariantSmall' : 'giftVariantLarge'];
      if (!variantId) return;

      // <option> carries its own text directly; a checked radio's label text
      // lives in the sibling <label>'s .fragrance-picker__name span instead.
      const nameEl = option.closest('[data-fragrance-item]');
      const title = nameEl
        ? nameEl.querySelector('.fragrance-picker__name').textContent.trim()
        : option.textContent.trim();

      // Returned (not just fired-and-forgotten) so a Buy Now click — which
      // publishes this same cartUpdate event and then wants to redirect to
      // /checkout — can wait for this add to actually go out first. See
      // product-form.js's buyNowButton branch.
      return fetch(window.routes.cart_add_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          items: [
            {
              id: Number(variantId),
              quantity: 1,
              properties: {
                Gift: this.dataset.giftLabel || 'Free perfume',
                _free_gift: '1',
              },
            },
          ],
        }),
      })
        .then((response) => response.json())
        .then((state) => {
          if (state.status) return;
          this.showConfirm(title);
          this.resetSelection();
          // resetSelection() sets .value programmatically, which doesn't
          // fire 'change' — update the buttons/hint explicitly so they go
          // back to locked instead of staying enabled from the choice that
          // was just cleared.
          this.updateBuyButtons();
          publish(PUB_SUB_EVENTS.cartUpdate, {
            source: 'product-gift-picker',
            cartData: state,
          });
        })
        .catch(() => { });
    }

    showConfirm(title) {
      if (!this.confirmEl) return;
      this.confirmEl.textContent = title + ' added as your free gift.';
      this.confirmEl.hidden = false;
      clearTimeout(this.confirmTimeout);
      this.confirmTimeout = setTimeout(() => this.hideConfirm(), 5000);
    }

    hideConfirm() {
      clearTimeout(this.confirmTimeout);
      if (!this.confirmEl) return;
      this.confirmEl.hidden = true;
    }
  }

  customElements.define('product-gift-picker', ProductGiftPicker);
}
