/*
  Duo Pairs — one card per signature-series fragrance, each card a fixed
  perfume + attar roll-on pair. The customer picks exactly one card (radio
  behaviour, like offer-builder's groups but always a single winner across
  the whole grid) and can only change each item's size via that card's own
  two chip pickers (native radio inputs, styled to match the real product
  page's Size picker — see component-duo-pairs.css). Add-to-cart sends both
  variants as ordinary cart lines
  tagged with the same `_bundle` / `_bundle_price` / `_bundle_size`
  properties every other bundle on this site uses, so the existing "Offer
  bundle discount" function (shared with offer-builder.js, doesn't inspect
  product type — see CLAUDE.md) discounts the pair with no redeploy needed.
*/

function formatDuoMoney(cents, format) {
  const value = Number(cents) || 0;

  const withCommas = (number, decimals) => {
    const fixed = (number / 100).toFixed(decimals);
    const [whole, fraction] = fixed.split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return fraction ? `${grouped}.${fraction}` : grouped;
  };

  let out = (format || '{{amount}}').replace(/\{\{\s*(\w+)\s*\}\}/, (_match, name) => {
    switch (name) {
      case 'amount_no_decimals':
      case 'amount_no_decimals_with_comma_separator':
        return withCommas(value, 0);
      case 'amount_with_comma_separator':
        return withCommas(value, 2).replace(/,/g, ' ').replace('.', ',').replace(/ /g, '.');
      default:
        return withCommas(value, 2).replace(/\.00$/, '');
    }
  });

  return out.replace(/^Rs\.\s*/, '₹').replace('₹ ', '₹');
}

if (!customElements.get('duo-pairs')) {
  customElements.define(
    'duo-pairs',
    class DuoPairs extends HTMLElement {
      connectedCallback() {
        this.moneyFormat = this.dataset.moneyFormat;
        this.readyLabel = this.dataset.readyLabel || 'Add duo to cart';

        this.discountType = this.dataset.discountType || 'none';
        this.discountAmount = parseFloat(this.dataset.discountAmount) || 0;
        this.useDiscount = this.discountType !== 'none' && this.discountAmount > 0;

        this.cards = Array.from(this.querySelectorAll('[data-duo-card]'));
        this.selectedCard = null;

        this.barPriceElement = this.querySelector('[data-duo-bar-price]');
        this.barWorthElement = this.querySelector('[data-duo-worth]');
        this.selectedNameElement = this.querySelector('[data-duo-selected-name]');
        this.picksElement = this.querySelector('[data-duo-picks]');
        this.addButton = this.querySelector('[data-duo-add]');
        this.addLabel = this.querySelector('[data-duo-add-label]');
        this.spinner = this.querySelector('[data-duo-add] .loading__spinner');
        this.errorElement = this.querySelector('[data-duo-error]');
        this.bar = this.querySelector('[data-offer-bar]');
        this.cart = document.querySelector('cart-drawer') || document.querySelector('cart-notification');

        if (!this.addButton) return;

        this.cards.forEach((card) => {
          card.querySelector('[data-duo-select-btn]')?.addEventListener('click', () => this.selectCard(card));
          card.querySelectorAll('[data-duo-perfume-group] input, [data-duo-rollon-group] input').forEach((input) => {
            input.addEventListener('change', () => this.renderCard(card));
          });

          this.renderCard(card);
        });

        this.addButton.addEventListener('click', () => this.addToCart());
        this.setupHeroView();
        this.setupGalleries();
      }

      /*
        Dots under the hero gallery: click jumps to that slide, and an
        IntersectionObserver keeps the active dot synced to whichever slide
        is actually snapped into view (native scroll-snap does the swiping
        itself — this only mirrors that position, it never drives it).
      */
      setupGalleries() {
        this.querySelectorAll('[data-duo-gallery]').forEach((gallery) => {
          const dotsWrap = gallery.parentElement?.querySelector('[data-duo-gallery-dots]');
          const dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll('[data-duo-dot]')) : [];
          const slides = Array.from(gallery.querySelectorAll('[data-duo-slide]'));
          if (!dots.length || !slides.length) return;

          dots.forEach((dot) => {
            dot.addEventListener('click', () => {
              const index = parseInt(dot.dataset.index, 10) || 0;
              slides[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            });
          });

          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const index = slides.indexOf(entry.target);
                if (index === -1) return;
                dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
              });
            },
            { root: gallery, threshold: 0.6 }
          );
          slides.forEach((slide) => observer.observe(slide));
        });
      }

      /*
        Single-duo "product page" view: ?duo=<perfume-handle> in the URL (the
        link snippets/duo-teaser.liquid uses) switches this same page from
        "browse all 6" to a dedicated page for that one fragrance. Every hero
        block already carries the same [data-duo-card] / [data-duo-*-select]
        attributes the grid cards use, so selecting one and rendering its
        price needs no special-casing here — only which view is visible and
        which single hero is unhidden.
      */
      setupHeroView() {
        this.gridView = this.querySelector('[data-duo-grid-view]');
        this.heroView = this.querySelector('[data-duo-hero-view]');
        if (!this.heroView) return;

        const heroes = this.cards.filter((card) => card.hasAttribute('data-duo-hero'));
        const duoParam = new URLSearchParams(window.location.search).get('duo');
        const match = duoParam && heroes.find((card) => card.dataset.bundleHandle === duoParam);

        if (!match) {
          this.heroView.hidden = true;
          return;
        }

        if (this.gridView) this.gridView.hidden = true;
        this.heroView.hidden = false;
        heroes.forEach((card) => {
          card.hidden = card !== match;
        });
        this.selectCard(match);
      }

      /* ------------------------------- pricing -------------------------------- */

      selectedSizeInput(card, groupSelector) {
        return card.querySelector(`${groupSelector} input:checked`);
      }

      cardRetail(card) {
        const perfumeInput = this.selectedSizeInput(card, '[data-duo-perfume-group]');
        const rollonInput = this.selectedSizeInput(card, '[data-duo-rollon-group]');
        const perfumePrice = parseInt(perfumeInput?.dataset.price, 10) || 0;
        const rollonPrice = parseInt(rollonInput?.dataset.price, 10) || 0;
        return perfumePrice + rollonPrice;
      }

      bundlePrice(retail) {
        if (!this.useDiscount) return retail;
        if (this.discountType === 'fixed') {
          return Math.max(0, retail - this.discountAmount * 100);
        }
        return Math.round(retail * (1 - this.discountAmount / 100));
      }

      /* ------------------------------- selection ------------------------------ */

      selectCard(card) {
        this.selectedCard = card;
        this.cards.forEach((c) => {
          c.classList.toggle('offer-card--selected', c === card);
          c.classList.toggle('offer-card--dimmed', c !== card);
        });
        this.renderCard(card);
        this.renderBar();
      }

      /* -------------------------------- render -------------------------------- */

      renderCard(card) {
        const retail = this.cardRetail(card);
        const bundle = this.bundlePrice(retail);
        const saving = retail - bundle;

        const priceElement = card.querySelector('[data-duo-price]');
        const retailElement = card.querySelector('[data-duo-retail]');

        if (priceElement) priceElement.textContent = formatDuoMoney(bundle, this.moneyFormat);

        if (retailElement) {
          if (saving > 0) {
            retailElement.hidden = false;
            retailElement.innerHTML = `<s>${formatDuoMoney(retail, this.moneyFormat)}</s>`;
          } else {
            retailElement.hidden = true;
          }
        }

        if (card === this.selectedCard) this.renderBar();
      }

      renderBar() {
        const card = this.selectedCard;
        const ready = !!card;

        if (this.selectedNameElement) {
          this.selectedNameElement.textContent = ready ? card.dataset.fragrance : '—';
        }

        if (this.picksElement) {
          if (ready) {
            const perfumeInput = this.selectedSizeInput(card, '[data-duo-perfume-group]');
            const rollonInput = this.selectedSizeInput(card, '[data-duo-rollon-group]');
            const perfumeLabel = perfumeInput?.nextElementSibling?.textContent || '';
            const rollonLabel = rollonInput?.nextElementSibling?.textContent || '';
            this.picksElement.textContent = `Perfume ${perfumeLabel} · Roll-on ${rollonLabel}`;
          } else {
            this.picksElement.textContent = '';
          }
        }

        if (ready) {
          const retail = this.cardRetail(card);
          const bundle = this.bundlePrice(retail);
          const saving = retail - bundle;

          if (this.barPriceElement) this.barPriceElement.textContent = formatDuoMoney(bundle, this.moneyFormat);

          if (this.barWorthElement) {
            if (saving > 0) {
              this.barWorthElement.hidden = false;
              this.barWorthElement.innerHTML = `<s>${formatDuoMoney(retail, this.moneyFormat)}</s> <b>save ${formatDuoMoney(
                saving,
                this.moneyFormat
              )}</b>`;
            } else {
              this.barWorthElement.hidden = true;
            }
          }
        } else if (this.barPriceElement) {
          this.barPriceElement.textContent = 'Select a duo';
          if (this.barWorthElement) this.barWorthElement.hidden = true;
        }

        this.addButton.disabled = !ready;
        this.addLabel.textContent = ready ? this.readyLabel : 'Select a duo';
        this.hideError();
      }

      /* ------------------------------- add to cart ----------------------------- */

      addToCart() {
        if (this.addButton.disabled || !this.selectedCard) return;

        const card = this.selectedCard;
        const perfumeInput = this.selectedSizeInput(card, '[data-duo-perfume-group]');
        const rollonInput = this.selectedSizeInput(card, '[data-duo-rollon-group]');
        const perfumeVariantId = perfumeInput?.value;
        const rollonVariantId = rollonInput?.value;
        if (!perfumeVariantId || !rollonVariantId) return;

        const retail = this.cardRetail(card);
        const bundlePrice = this.bundlePrice(retail);
        const bundleId = `${card.dataset.bundleHandle}-duo-${Date.now()}`;

        const properties = {
          Offer: `${card.dataset.fragrance} Duo`,
          _bundle: bundleId,
          _bundle_price: (bundlePrice / 100).toFixed(2),
          _bundle_size: '2',
        };

        const items = [
          { id: perfumeVariantId, quantity: 1, properties: { ...properties } },
          { id: rollonVariantId, quantity: 1, properties: { ...properties } },
        ];

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';

        const body = { items };

        if (this.cart) {
          body.sections = this.cart.getSectionsToRender().map((section) => section.id);
          body.sections_url = window.location.pathname;
          this.cart.setActiveElement(document.activeElement);
        }

        config.body = JSON.stringify(body);
        this.setLoading(true);

        sessionStorage.setItem('cartMutationAt', String(Date.now()));

        fetch(window.routes.cart_add_url, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'duo-pairs',
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

            this.cart.renderContents(response);
          })
          .catch((error) => {
            console.error(error);
            this.showError('Something went wrong adding this duo. Please try again.');
          })
          .finally(() => this.setLoading(false));
      }

      setLoading(loading) {
        this.addButton.classList.toggle('loading', loading);
        this.addButton.setAttribute('aria-busy', String(loading));
        if (this.spinner) this.spinner.classList.toggle('hidden', !loading);
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
