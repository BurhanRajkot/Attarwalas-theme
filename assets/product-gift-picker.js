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

      this.select = this.querySelector('[data-gift-select]');
      this.confirmEl = this.querySelector('[data-gift-confirm]');
      this.sectionId = this.dataset.section;
      this.currentVariantId = this.dataset.initialVariantId;
      this.currentBucket = this.dataset.initialSize === '50ML' ? '50' : '100';

      this.onVariantChange = this.onVariantChange.bind(this);
      this.onCartUpdate = this.onCartUpdate.bind(this);

      this.variantChangeUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, this.onVariantChange);
      this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, this.onCartUpdate);

      // A stale "X added as your free gift" message sitting there forever
      // reads as "you're done here" even though the select underneath it is
      // already reset and ready to pick again — so it's cleared either after
      // a few seconds or the moment the customer touches the select again,
      // whichever happens first.
      this.select.addEventListener('change', () => this.hideConfirm());
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
      this.currentBucket = variant.option1 === '50ML' ? '50' : '100';
    }

    onCartUpdate(event) {
      // Ignore our own publish below, and any other product-form on the page.
      if (event.source !== 'product-form') return;
      if (String(event.productVariantId) !== String(this.currentVariantId)) return;

      const option = this.select.options[this.select.selectedIndex];
      if (!option || !option.value) return;

      const variantId = option.dataset[this.currentBucket === '50' ? 'giftVariantSmall' : 'giftVariantLarge'];
      if (!variantId) return;

      const title = option.textContent.trim();

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
          this.select.value = '';
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
