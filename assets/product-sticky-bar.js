if (!customElements.get('product-sticky-bar')) {
  customElements.define(
    'product-sticky-bar',
    class ProductStickyBar extends HTMLElement {
      constructor() {
        super();
        this.sectionId = this.dataset.sectionId;
        this.priceElement = this.querySelector('[data-sticky-bar-price]');
        this.button = this.querySelector('[data-sticky-bar-add]');
        this.buttonLabel = this.button.querySelector('span');
        this.buyButtons = document.querySelector(
          `#ProductInfo-${this.sectionId} .product-form__buttons`
        );
        /* The bar repeats the product's title and price. On a phone the buy
           buttons sit below the fold while the real price is still on screen,
           so watching the buttons alone put the bar up with the price showing
           twice, a few pixels apart (reported by Burhan). Watch the price
           block too and only take over once BOTH have gone. */
        this.mainPrice = document.getElementById(`price-${this.sectionId}`);
        this.onScreen = new Set();
        this.observer = null;
        this.variantUnsubscriber = null;
        this.cartUnsubscribers = [];
        this.loadingTimeout = null;
      }

      connectedCallback() {
        if (!this.buyButtons) {
          this.classList.add('is-visible');
          return;
        }

        this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) this.onScreen.add(entry.target);
              else this.onScreen.delete(entry.target);
            });
            this.classList.toggle('is-visible', this.onScreen.size === 0);
          },
          { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
        );
        this.observer.observe(this.buyButtons);
        if (this.mainPrice) this.observer.observe(this.mainPrice);

        this.variantUnsubscriber = subscribe(
          PUB_SUB_EVENTS.variantChange,
          this.onVariantChange.bind(this)
        );

        this.cartUnsubscribers = [
          subscribe(PUB_SUB_EVENTS.cartUpdate, () => this.setLoading(false)),
          subscribe(PUB_SUB_EVENTS.cartError, () => this.setLoading(false)),
        ];

        this.button.addEventListener('click', this.onAddClick.bind(this));
      }

      onAddClick() {
        if (this.button.disabled || this.button.getAttribute('aria-disabled') === 'true') {
          return;
        }
        this.setLoading(true);
        clearTimeout(this.loadingTimeout);
        this.loadingTimeout = setTimeout(() => this.setLoading(false), 4000);
      }

      setLoading(loading) {
        this.button.classList.toggle('loading', loading);
        this.button.setAttribute('aria-disabled', String(loading));
      }

      onVariantChange(event) {
        const { sectionId, html, variant } = event.data;
        if (sectionId !== this.sectionId) return;

        const updatedPrice = html.getElementById(`price-${sectionId}`);
        if (updatedPrice && this.priceElement) {
          this.priceElement.innerHTML = updatedPrice.innerHTML;
        }

        /* global.js keys sold-out state off the re-rendered submit button's
           disabled attribute rather than variant.available (the embedded
           JSON can say available:true while the server renders it sold
           out), so mirror that instead of trusting the variant object. */
        const updatedAddButton = html.getElementById(`ProductSubmitButton-${sectionId}`);
        const soldOut = updatedAddButton
          ? updatedAddButton.hasAttribute('disabled')
          : variant && !variant.available;

        if (this.button && this.buttonLabel) {
          this.button.disabled = soldOut;
          this.buttonLabel.textContent = soldOut
            ? window.variantStrings.soldOut
            : window.variantStrings.addToCart;
        }
      }

      disconnectedCallback() {
        if (this.observer) this.observer.disconnect();
        if (this.variantUnsubscriber) this.variantUnsubscriber();
        this.cartUnsubscribers.forEach((unsubscribe) => unsubscribe());
        clearTimeout(this.loadingTimeout);
      }
    }
  );
}