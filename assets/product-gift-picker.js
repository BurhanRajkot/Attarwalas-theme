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
      this.sectionId = this.dataset.section;
      this.currentVariantId = this.dataset.initialVariantId;
      // Which of a live variant's option1/option2/option3 is actually "Size"
      // varies by product (see snippets/product-gift-picker.liquid, which
      // resolves this once server-side) — Customize Perfume's Size is
      // option2, not option1 like the single-option signature-series bottles.
      this.sizeOptionKey = this.dataset.sizeOptionKey || 'option1';
      this.currentBucket = this.sizeToBucket(this.dataset.initialSize);

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
      this.addEventListener('change', () => this.hideConfirm());
    }

    // Product Size option values aren't cased consistently across products
    // (e.g. Customize Perfume uses '50ml'/'80ml'/'100ml', signature-series
    // bottles use '50ML'/'100ML') — compare case-insensitively so the bucket
    // choice doesn't silently default to '100' for every lowercase product.
    sizeToBucket(size) {
      return (size || '').toLowerCase() === '50ml' ? '50' : '100';
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
      if (!variant) return;
      this.currentVariantId = variant.id;
      this.currentBucket = this.sizeToBucket(variant[this.sizeOptionKey]);
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

      fetch(window.routes.cart_add_url, {
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
          publish(PUB_SUB_EVENTS.cartUpdate, {
            source: 'product-gift-picker',
            cartData: state,
          });
        })
        .catch(() => {});
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
