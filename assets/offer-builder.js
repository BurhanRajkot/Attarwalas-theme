/*
  Offer builder — "pick any N for a fixed price" bundle page.

  Adds the perfumes the customer picked as ordinary cart lines, tagging every
  line of one bundle with the same `_bundle` / `_bundle_price` / `_bundle_size`
  properties. The offer product itself never enters the cart — it only supplies
  the page and the bundle price. The store's "Offer bundle discount" function
  regroups those lines and discounts them down to the fixed price.
*/

function formatOfferMoney(cents, format) {
  const value = Number(cents) || 0;

  const withCommas = (number, decimals) => {
    const fixed = (number / 100).toFixed(decimals);
    const [whole, fraction] = fixed.split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return fraction ? `${grouped}.${fraction}` : grouped;
  };

  // Shopify money formats use {{amount}}-style placeholders; fill whichever is used.
  return (format || '{{amount}}').replace(/\{\{\s*(\w+)\s*\}\}/, (_match, name) => {
    switch (name) {
      case 'amount_no_decimals':
      case 'amount_no_decimals_with_comma_separator':
        return withCommas(value, 0);
      case 'amount_with_comma_separator':
        return withCommas(value, 2).replace(/,/g, ' ').replace('.', ',').replace(/ /g, '.');
      default:
        return withCommas(value, 2);
    }
  });
}

if (!customElements.get('offer-builder')) {
  customElements.define(
    'offer-builder',
    class OfferBuilder extends HTMLElement {
      connectedCallback() {
        this.offerId = this.dataset.offerId;
        this.offerHandle = this.dataset.offerHandle;
        this.offerTitle = this.dataset.offerTitle;
        this.offerPrice = parseInt(this.dataset.offerPrice, 10) || 0;
        this.moneyFormat = this.dataset.moneyFormat;
        this.totalPickCount = parseInt(this.dataset.totalPickCount, 10) || 0;
        this.readyLabel = this.dataset.readyLabel || 'Add bundle to cart';

        // Discount pricing: when set, the bundle price is the retail total of
        // whatever was picked minus the discount, instead of a fixed price.
        this.discountType = this.dataset.discountType || 'none';
        this.discountAmount = parseFloat(this.dataset.discountAmount) || 0;
        this.useDiscount = this.discountType !== 'none' && this.discountAmount > 0;

        this.groups = Array.from(this.querySelectorAll('[data-offer-group]'));
        this.cards = Array.from(this.querySelectorAll('[data-offer-card]'));
        this.counter = this.querySelector('[data-offer-counter]');
        this.picksElement = this.querySelector('[data-offer-picks]');
        this.worthElement = this.querySelector('[data-offer-worth]');
        this.barPriceElement = this.querySelector('[data-offer-bar-price]');
        this.addButton = this.querySelector('[data-offer-add]');
        this.addLabel = this.querySelector('[data-offer-add-label]');
        this.errorElement = this.querySelector('[data-offer-error]');
        this.bar = this.querySelector('[data-offer-bar]');
        this.cart = document.querySelector('cart-drawer') || document.querySelector('cart-notification');

        if (!this.addButton) return;

        // key: card element, value: quantity
        this.selections = new Map();

        this.cards.forEach((card) => {
          card.querySelector('[data-offer-card-add]')?.addEventListener('click', () => this.select(card));
          card.querySelector('[data-offer-qty-plus]')?.addEventListener('click', () => this.changeQty(card, 1));
          card.querySelector('[data-offer-qty-minus]')?.addEventListener('click', () => this.changeQty(card, -1));
          card
            .querySelector('[data-offer-variant]')
            ?.addEventListener('change', (event) => this.onVariantChange(card, event.target));
        });

        this.addButton.addEventListener('click', () => this.addToCart());

        this.observeBar();
        this.render();
      }

      /* ------------------------------- selection ------------------------------ */

      groupIndexOf(card) {
        return card.dataset.groupIndex;
      }

      countInGroup(groupIndex) {
        let count = 0;
        this.selections.forEach((qty, card) => {
          if (this.groupIndexOf(card) === groupIndex) count += qty;
        });
        return count;
      }

      groupLimit(groupIndex) {
        const group = this.groups.find((element) => element.dataset.groupIndex === groupIndex);
        return group ? parseInt(group.dataset.groupPickCount, 10) || 0 : 0;
      }

      totalSelected() {
        let total = 0;
        this.selections.forEach((qty) => {
          total += qty;
        });
        return total;
      }

      /* -------------------------------- pricing ------------------------------- */

      retailWorth() {
        let worth = 0;
        this.selections.forEach((qty, card) => {
          worth += (parseInt(card.dataset.price, 10) || 0) * qty;
        });
        return worth;
      }

      bundlePrice(retail) {
        if (!this.useDiscount) return this.offerPrice;
        if (this.discountType === 'fixed') {
          return Math.max(0, retail - this.discountAmount * 100);
        }
        return Math.round(retail * (1 - this.discountAmount / 100));
      }

      discountLabel() {
        return this.discountType === 'fixed'
          ? `Flat ${formatOfferMoney(this.discountAmount * 100, this.moneyFormat)} off`
          : `${this.discountAmount}% off`;
      }

      select(card) {
        if (card.dataset.available !== 'true' || this.selections.has(card)) return;

        const groupIndex = this.groupIndexOf(card);
        if (this.countInGroup(groupIndex) >= this.groupLimit(groupIndex)) {
          this.flashGroup(groupIndex);
          return;
        }

        this.selections.set(card, 1);
        this.render();
      }

      changeQty(card, delta) {
        const current = this.selections.get(card);
        if (!current) return;

        const groupIndex = this.groupIndexOf(card);
        const room = this.groupLimit(groupIndex) - (this.countInGroup(groupIndex) - current);
        const next = Math.min(Math.max(0, current + delta), room);

        if (next === 0) {
          this.selections.delete(card);
        } else {
          if (next === current && delta > 0) this.flashGroup(groupIndex);
          this.selections.set(card, next);
        }

        this.render();
      }

      onVariantChange(card, select) {
        const option = select.options[select.selectedIndex];

        card.dataset.variantId = option.value;
        card.dataset.price = option.dataset.price;
        card.dataset.variantTitle = option.dataset.variantTitle || '';
        card.dataset.available = option.dataset.available;

        const priceElement = card.querySelector('[data-offer-price]');
        if (priceElement) priceElement.textContent = option.dataset.priceFormatted;

        this.render();
      }

      flashGroup(groupIndex) {
        const group = this.groups.find((element) => element.dataset.groupIndex === groupIndex);
        const pill = group?.querySelector('[data-group-counter]');
        if (!pill) return;

        pill.classList.add('offer-group__pill--full');
        clearTimeout(pill.flashTimer);
        pill.flashTimer = setTimeout(() => pill.classList.remove('offer-group__pill--full'), 700);
      }

      /* -------------------------------- render -------------------------------- */

      render() {
        this.cards.forEach((card) => {
          const qty = this.selections.get(card) || 0;
          const selected = qty > 0;
          const groupIndex = this.groupIndexOf(card);
          const groupFull = this.countInGroup(groupIndex) >= this.groupLimit(groupIndex);

          card.classList.toggle('offer-card--selected', selected);
          card.classList.toggle('offer-card--dimmed', groupFull && !selected);

          const addButton = card.querySelector('[data-offer-card-add]');
          if (addButton) addButton.hidden = selected;

          const qtyWrap = card.querySelector('[data-offer-card-qty]');
          if (qtyWrap) qtyWrap.hidden = !selected;

          const qtyValue = card.querySelector('[data-offer-qty-value]');
          if (qtyValue) qtyValue.textContent = qty;
        });

        this.groups.forEach((group) => {
          const groupIndex = group.dataset.groupIndex;
          const count = this.countInGroup(groupIndex);
          const limit = this.groupLimit(groupIndex);
          const pill = group.querySelector('[data-group-counter]');

          if (pill) {
            pill.textContent = `${count} / ${limit}`;
            pill.classList.toggle('offer-group__pill--complete', count === limit);
          }
          group.classList.toggle('offer-group--complete', count === limit);
        });

        const total = this.totalSelected();
        const ready = this.groups.every(
          (group) => this.countInGroup(group.dataset.groupIndex) === this.groupLimit(group.dataset.groupIndex)
        );

        if (this.counter) this.counter.textContent = `${total} / ${this.totalPickCount}`;
        if (this.picksElement) this.picksElement.textContent = this.picksSummary();

        this.renderWorth();

        this.addButton.disabled = !ready;
        const remaining = this.totalPickCount - total;
        this.addLabel.textContent = ready
          ? this.readyLabel
          : remaining === this.totalPickCount
            ? `Select ${this.totalPickCount} items`
            : `Select ${remaining} more`;

        this.hideError();
      }

      renderWorth() {
        const retail = this.retailWorth();
        const bundle = this.bundlePrice(retail);
        const saving = retail - bundle;

        if (this.barPriceElement) {
          // With discount pricing and nothing picked yet, show the discount
          // itself; once items are picked the live bundle price takes over.
          this.barPriceElement.textContent =
            this.useDiscount && retail <= 0
              ? this.discountLabel()
              : formatOfferMoney(bundle, this.moneyFormat);
        }

        if (!this.worthElement) return;

        if (saving <= 0) {
          this.worthElement.hidden = true;
          return;
        }

        this.worthElement.hidden = false;
        this.worthElement.innerHTML = `<s>${formatOfferMoney(retail, this.moneyFormat)}</s> <b>save ${formatOfferMoney(
          saving,
          this.moneyFormat
        )}</b>`;
      }

      picksSummary() {
        const parts = [];
        this.selections.forEach((qty, card) => {
          const variantTitle = card.dataset.variantTitle;
          const name =
            variantTitle && variantTitle !== 'Default Title'
              ? `${card.dataset.productTitle} (${variantTitle})`
              : card.dataset.productTitle;
          parts.push(qty > 1 ? `${name} × ${qty}` : name);
        });
        return parts.join(', ');
      }

      // Drop the sticky bar's shadow once the page is scrolled to the very bottom.
      observeBar() {
        if (!this.bar || !('IntersectionObserver' in window)) return;

        const sentinel = document.createElement('div');
        sentinel.setAttribute('aria-hidden', 'true');
        this.appendChild(sentinel);

        new IntersectionObserver((entries) => {
          this.bar.classList.toggle('offer-builder__bar--docked', entries[0].isIntersecting);
        }).observe(sentinel);
      }

      /* ------------------------------- add to cart ----------------------------- */

      addToCart() {
        if (this.addButton.disabled) return;

        // A unique id per bundle instance keeps two bundles in the same cart
        // from merging into each other, and lets the discount function tell
        // them apart.
        const bundleId = `${this.offerHandle}-${Date.now()}`;
        const bundlePrice = this.bundlePrice(this.retailWorth());
        const properties = {
          Offer: this.offerTitle,
          _bundle: bundleId,
          _bundle_price: (bundlePrice / 100).toFixed(2),
          _bundle_size: String(this.totalSelected()),
        };

        const items = [];
        this.selections.forEach((qty, card) => {
          items.push({
            id: card.dataset.variantId,
            quantity: qty,
            properties: { ...properties },
          });
        });

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData();
        formData.append('items', JSON.stringify(items));

        if (this.cart) {
          formData.append('sections', this.cart.getSectionsToRender().map((section) => section.id));
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }

        config.body = formData;
        this.setLoading(true);

        fetch(window.routes.cart_add_url, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'offer-builder',
                errors: response.errors || response.description,
                message: response.message,
              });
              this.showError(response.description || response.message);
              return;
            }

            if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'offer-builder', cartData: response });
            this.cart.renderContents(response);
          })
          .catch((error) => {
            console.error(error);
            this.showError('Something went wrong adding this bundle. Please try again.');
          })
          .finally(() => this.setLoading(false));
      }

      setLoading(loading) {
        this.addButton.classList.toggle('loading', loading);
        this.addButton.setAttribute('aria-busy', String(loading));
      }

      showError(message) {
        if (!this.errorElement) return;
        this.errorElement.textContent = message;
        this.errorElement.hidden = false;
      }

      hideError() {
        if (!this.errorElement) return;
        this.errorElement.hidden = true;
      }
    }
  );
}
