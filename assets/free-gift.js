/**
 * <free-gift-picker> — lets the customer choose (and swap) their free gift
 * perfumes from inside the cart, one per qualifying perfume unit. A slot's
 * gift size (10ml or 35ml) is locked to the bottle size that earned it.
 * Rendered by snippets/free-gift-picker.liquid, which draws one row per
 * earned slot: a claimed row (product + price + Change) or an empty row (a
 * dropdown).
 *
 * Each gift is an ordinary cart line tagged with a hidden `_free_gift`
 * property. The store's offer discount function is what zeroes its price;
 * this file only ever adds or removes single units of those lines. Rows are
 * decoupled — "Change" just frees a slot (removes one unit), and picking from
 * a dropdown just claims one; the next render decides which state each slot
 * is in from the actual cart contents.
 *
 * One housekeeping job runs on load: if the cart holds more claimed slots
 * than it currently qualifies for (e.g. a qualifying item's quantity was
 * lowered), the excess is trimmed back down.
 */
// Everything is wrapped in the customElements guard so that a second copy of
// this file (the cart page loads it from both the drawer and main-cart-items)
// re-executing is harmless: a bare `let`/`class` at top level would throw
// "Identifier has already been declared" on the second run.
if (!customElements.get('free-gift-picker')) {
  // One shot per page load. Without this, a change.js call that keeps failing
  // would re-trigger connectedCallback on every re-render and loop forever.
  let staleTrimTried = false;

  class FreeGiftPicker extends HTMLElement {
    constructor() {
      super();
  
      this.errorEl = this.querySelector('[data-free-gift-error]');
      this.busy = false;
  
      this.addEventListener('click', this.onClick.bind(this));
      this.addEventListener('change', this.onChange.bind(this));
    }
  
    connectedCallback() {
      // Each bucket ('50' → filled with a 10ml gift perfume, '100' → 35ml) is
      // trimmed independently: a bucket's excess must only take units from
      // that same bucket's rows, otherwise dropping a 50ml perfume from the
      // cart could remove a still-valid 35ml gift instead of the orphaned
      // 10ml one.
      const buckets = ['50', '100'];
      const excessByBucket = buckets
        .map((bucket) => {
          const qualifying = parseInt(this.dataset[`qualifying${bucket}`], 10) || 0;
          const claimed = parseInt(this.dataset[`claimed${bucket}`], 10) || 0;
          return { bucket, excess: claimed - qualifying };
        })
        .filter(({ excess }) => excess > 0);

      if (excessByBucket.length > 0 && !staleTrimTried) {
        staleTrimTried = true;
        this.trimExcess(excessByBucket);
      }
    }
  
    onClick(event) {
      const change = event.target.closest('[data-free-gift-change]');
      if (change) {
        event.preventDefault();
        this.releaseSlot(change);
      }
    }
  
    onChange(event) {
      const select = event.target.closest('[data-free-gift-select]');
      if (!select || !select.value) return;
  
      // This lives inside <cart-items>, which has its own blanket `change`
      // listener that treats any bubbled change as a quantity-input edit and
      // fires its own (malformed, for us) /cart/change.js call. Stop it here.
      event.stopPropagation();
  
      const option = select.options[select.selectedIndex];
      this.claimSlot({
        variantId: select.value,
        productTitle: option ? option.dataset.title || option.textContent.trim() : '',
        trigger: select,
      });
    }
  
    claimSlot({ variantId, trigger }) {
      if (this.busy) return;
  
      this.setBusy(true, trigger);
      this.clearError();
  
      this.addGift(variantId)
        .then((state) => {
          if (state.status || state.message || state.description) {
            throw new Error(state.description || state.message);
          }
          this.renderSections(state);
        })
        .catch((error) => {
          this.showError(error.message);
          this.setBusy(false, trigger);
        });
    }
  
    releaseSlot(trigger) {
      if (this.busy) return;
  
      const row = trigger.closest('[data-free-gift-row]');
      if (!row) return;
  
      const lineKey = row.dataset.giftLineKey;
      const quantity = parseInt(row.dataset.lineQuantity, 10) || 1;
  
      this.setBusy(true, trigger);
      this.clearError();
  
      this.changeLine(lineKey, quantity - 1)
        .then((state) => {
          if (state.status || state.message || state.description) {
            throw new Error(state.description || state.message);
          }
          this.renderSections(state);
        })
        .catch((error) => {
          this.showError(error.message);
          this.setBusy(false, trigger);
        });
    }
  
    /**
     * Drops each bucket's excess already-claimed units, taking them from that
     * bucket's last rows in DOM order (grouped by line, since several rows
     * can share one line when the same roll-on fills more than one slot).
     * Buckets are trimmed independently so a 50ml perfume dropping out of the
     * cart can never take a still-valid 35ml gift with it.
     */
    trimExcess(excessByBucket) {
      const allRows = Array.from(this.querySelectorAll('[data-free-gift-row][data-gift-line-key]'));

      /** @type {Map<string, number>} */
      const unitsToRemoveByLine = new Map();
      excessByBucket.forEach(({ bucket, excess }) => {
        const bucketRows = allRows.filter((row) => row.dataset.giftBucket === bucket);
        bucketRows.slice(-excess).forEach((row) => {
          const key = row.dataset.giftLineKey;
          unitsToRemoveByLine.set(key, (unitsToRemoveByLine.get(key) || 0) + 1);
        });
      });
      if (unitsToRemoveByLine.size === 0) return;

      const rows = allRows;
      this.setBusy(true);
  
      const tasks = Array.from(unitsToRemoveByLine.entries()).map(([key, units]) => () => {
        const row = rows.find((r) => r.dataset.giftLineKey === key);
        const currentQty = parseInt(row?.dataset.lineQuantity, 10) || units;
        return this.changeLine(key, Math.max(0, currentQty - units));
      });
  
      tasks
        .reduce((chain, task) => chain.then(task), Promise.resolve())
        .then((state) => this.renderSections(state))
        .catch(() => this.setBusy(false));
    }
  
  addGift(variantId) {
    const body = {
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
      sections: this.sectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    };

    // Lets the cart page's stale-render reconciliation know a mutation is (or
    // was, very recently) in flight — see sections/main-cart-items.liquid.
    sessionStorage.setItem('cartMutationAt', String(Date.now()));

    return fetch(`${window.routes.cart_add_url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    }).then((response) => response.json());
  }

  changeLine(lineKey, quantity) {
      const body = {
        id: lineKey,
        quantity,
        sections: this.sectionsToRender().map((section) => section.section),
        sections_url: window.location.pathname,
      };
  
    sessionStorage.setItem('cartMutationAt', String(Date.now()));

    return fetch(`${window.routes.cart_change_url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    }).then((response) => response.json());
    }
  
    /**
     * Mirrors the section list cart.js refreshes, so the gift block, the line
     * items, the totals and the header bubble all update from one request.
     */
    sectionsToRender() {
      // Same ids/selectors CartDrawerItems uses in cart-drawer.js.
      if (this.dataset.context === 'drawer') {
        return [
          { id: 'CartDrawer', section: 'cart-drawer', selector: '.drawer__inner' },
          { id: 'cart-icon-bubble', section: 'cart-icon-bubble', selector: '.shopify-section' },
        ];
      }
  
      const items = document.getElementById('main-cart-items');
      const footer = document.getElementById('main-cart-footer');
      const sections = [];
  
      if (items) sections.push({ id: 'main-cart-items', section: items.dataset.id, selector: '.js-contents' });
      if (footer) sections.push({ id: 'main-cart-footer', section: footer.dataset.id, selector: '.js-contents' });
      sections.push({ id: 'cart-icon-bubble', section: 'cart-icon-bubble', selector: '.shopify-section' });
  
      // The drawer is on the page too and holds its own copy of this block. Left
      // out, it would still be showing stale slots next time it opens.
      if (document.getElementById('CartDrawer')) {
        sections.push({ id: 'CartDrawer', section: 'cart-drawer', selector: '.drawer__inner' });
      }
  
      return sections;
    }
  
    renderSections(state) {
      if (!state || !state.sections) {
        // No section HTML came back — most commonly an error response
        // (Shopify's cart API error shape has no `sections` key) that a
        // caller didn't already catch. Surface it instead of reloading: a
        // full-page reload silently discards whatever the customer was
        // doing and looks like the click did nothing at all.
        this.showError();
        this.setBusy(false);
        return;
      }
  
      this.sectionsToRender().forEach((section) => {
        const container = document.getElementById(section.id);
        if (!container) return;
  
        const target = container.querySelector(section.selector) || container;
        const html = this.sectionInnerHTML(state.sections[section.section], section.selector);
        if (html !== null) target.innerHTML = html;
      });
  
      // Empty-cart classes are owned by cart.js; keep them honest after a removal.
      if (typeof state.item_count === 'number') {
        document.querySelectorAll('cart-items, cart-drawer, #main-cart-footer').forEach((el) => {
          el.classList.toggle('is-empty', state.item_count === 0);
        });
      }
  
      // Deliberately no cartUpdate publish: cart.js would re-fetch and overwrite
      // the sections that were just rendered above, racing this write.
    }
  
    sectionInnerHTML(html, selector) {
      if (!html) return null;
      const parsed = new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
      return parsed ? parsed.innerHTML : null;
    }
  
    setBusy(busy, trigger) {
      this.busy = busy;
      this.classList.toggle('free-gift--busy', busy);
      if (trigger) {
        if (trigger.tagName === 'SELECT') {
          trigger.disabled = busy;
        } else {
          trigger.classList.toggle('free-gift__choose--loading', busy);
        }
      }
    }
  
    showError(message) {
      if (!this.errorEl) return;
      this.errorEl.textContent = message || 'That roll-on could not be added. Please try again.';
      this.errorEl.hidden = false;
    }
  
    clearError() {
      if (!this.errorEl) return;
      this.errorEl.textContent = '';
      this.errorEl.hidden = true;
    }
  }

  customElements.define('free-gift-picker', FreeGiftPicker);
}
