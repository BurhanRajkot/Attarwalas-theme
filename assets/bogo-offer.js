/**
 * <bogo-offer> — the homepage Buy 1 Get 1 band and its two-step picker
 * (see sections/bogo-offer.liquid for the why).
 *
 * Cards carry both sizes' variant ids, prices and availability as data
 * attributes ("100" = the 100ML bottle and its free 100ML, "50" = the 50ML
 * and its free 50ML), so switching size never needs a request. Adding sends both
 * lines in one /cart/add.js call and renders the cart drawer from the
 * sections in that same response, the way product-form.js does.
 */
if (!customElements.get('bogo-offer')) {
  class BogoOffer extends HTMLElement {
    connectedCallback() {
      this.builder = this.querySelector('[data-bogo-builder]');
      this.openButton = this.querySelector('[data-bogo-open]');
      this.addButton = this.querySelector('[data-bogo-add]');
      this.summary = this.querySelector('[data-bogo-summary]');
      this.error = this.querySelector('[data-bogo-error]');
      this.giftSizeLabel = this.querySelector('[data-bogo-gift-size]');
      if (!this.builder || !this.addButton) return;

      this.openButton.addEventListener('click', () => this.toggle());
      this.addButton.addEventListener('click', () => this.addToCart());
      this.builder.addEventListener('change', () => this.update());

      this.onHashChange = () => {
        if (window.location.hash === `#${this.id}`) this.open();
      };
      window.addEventListener('hashchange', this.onHashChange);
      this.onHashChange();

      this.update();
    }

    disconnectedCallback() {
      window.removeEventListener('hashchange', this.onHashChange);
    }

    toggle() {
      if (this.builder.hidden) this.open();
      else this.close();
    }

    open() {
      this.builder.hidden = false;
      this.openButton.setAttribute('aria-expanded', 'true');
      this.builder.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    close() {
      this.builder.hidden = true;
      this.openButton.setAttribute('aria-expanded', 'false');
    }

    get size() {
      const checked = this.querySelector('[data-bogo-size]:checked');
      return checked ? checked.value : '100';
    }

    selected(kind) {
      return this.querySelector(`[data-bogo-${kind}]:checked`);
    }

    // Re-labels every card for the chosen size, retires cards whose bottle
    // isn't available in it, and decides whether Add is allowed.
    update() {
      const size = this.size;
      if (this.giftSizeLabel) this.giftSizeLabel.textContent = `${size}ML`;

      this.querySelectorAll('[data-bogo-main], [data-bogo-gift]').forEach((input) => {
        const available = input.getAttribute(`data-available-${size}`) === 'true' && !!input.getAttribute(`data-variant-${size}`);
        const card = input.closest('.bogo-offer__card');
        input.disabled = !available;
        if (!available && input.checked) input.checked = false;
        card.classList.toggle('is-disabled', !available);
        const price = card.querySelector('[data-bogo-price]');
        if (price) price.textContent = available ? input.getAttribute(`data-price-${size}`) : 'Sold out';
      });

      const main = this.selected('main');
      const gift = this.selected('gift');
      this.addButton.disabled = !(main && gift);
      this.hideError();

      if (main && gift) {
        const giftSize = `${size}ML`;
        this.summary.textContent = `${main.dataset.title} ${size}ML (${main.getAttribute(`data-price-${size}`)}) + ${gift.dataset.title} ${giftSize} free`;
      } else if (main) {
        this.summary.textContent = `${main.dataset.title} ${size}ML — now pick your free perfume.`;
      } else {
        this.summary.textContent = 'Pick your perfume and your free one.';
      }
    }

    addToCart() {
      const main = this.selected('main');
      const gift = this.selected('gift');
      if (!main || !gift || this.addButton.getAttribute('aria-disabled') === 'true') return;

      const size = this.size;
      const cart = document.querySelector('cart-drawer') || document.querySelector('cart-notification');
      const body = {
        items: [
          { id: Number(main.getAttribute(`data-variant-${size}`)), quantity: 1 },
          {
            id: Number(gift.getAttribute(`data-variant-${size}`)),
            quantity: 1,
            properties: { Gift: this.dataset.giftLabel || 'Free perfume', _free_gift: '1' },
          },
        ],
      };
      if (cart) {
        body.sections = cart.getSectionsToRender().map((section) => section.id);
        body.sections_url = window.location.pathname;
      }

      this.setLoading(true);
      this.hideError();

      fetch(window.routes.cart_add_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      })
        .then((response) => response.json())
        .then((state) => {
          if (state.status) {
            this.showError(state.description || state.message || 'Something went wrong. Please try again.');
            return;
          }
          if (!cart) {
            window.location = window.routes.cart_url;
            return;
          }
          if (cart.classList.contains('is-empty')) cart.classList.remove('is-empty');
          cart.renderContents(state);
          main.checked = false;
          gift.checked = false;
          this.update();
        })
        .catch(() => this.showError('Something went wrong. Please try again.'))
        .finally(() => this.setLoading(false));
    }

    setLoading(loading) {
      this.addButton.classList.toggle('loading', loading);
      this.addButton.setAttribute('aria-disabled', String(loading));
      const spinner = this.addButton.querySelector('.loading__spinner');
      if (spinner) spinner.classList.toggle('hidden', !loading);
    }

    showError(message) {
      this.error.textContent = message;
      this.error.hidden = false;
    }

    hideError() {
      this.error.hidden = true;
    }
  }

  customElements.define('bogo-offer', BogoOffer);
}
