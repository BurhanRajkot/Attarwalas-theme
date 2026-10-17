if (!customElements.get('product-sticky-bar')) {
  customElements.define(
    'product-sticky-bar',
    class ProductStickyBar extends HTMLElement {
      constructor() {
        super();
        this.observer = null;
        this.variantUnsubscriber = null;
        this.cartUnsubscribers = [];
        this.loadingTimeout = null;
      }

      /* DOM lookups live here, not in the constructor: when the element is
         upgraded before its children exist (created by the parser after the
         definition is registered, or cloned), querySelector came back null
         and the constructor threw on /products/signature-duo. By the time
         it's connected its children are always there. */
      queryParts() {
        this.sectionId = this.dataset.sectionId;
        this.priceElement = this.querySelector('[data-sticky-bar-price]');
        this.button = this.querySelector('[data-sticky-bar-add]');
        this.buttonLabel = this.button ? this.button.querySelector('span') : null;
        // The Buy Now button when this product has one (it's the last
        // button in the row), else Add to cart — not the whole
        // .product-form__buttons wrapper. Burhan wants the bar to appear
        // "just after the buy now button" specifically, and watching the
        // wrapper meant the trigger point was whatever the row's own box
        // happened to be (its border/padding included), not the actual
        // button a customer sees leave the screen.
        this.buyButtons = document.querySelector(
          `#ProductInfo-${this.sectionId} .product-form__buttons > button:last-of-type`
        );
        /* The bar repeats the product's title and price. On a phone the buy
           buttons sit below the fold while the real price is still on screen,
           so watching the buttons alone put the bar up with the price showing
           twice, a few pixels apart (reported by Burhan). Watch the price
           block too and only take over once BOTH have gone. */
        this.mainPrice = document.getElementById(`price-${this.sectionId}`);
        this.onScreen = new Set();
      }

      connectedCallback() {
        this.queryParts();
        if (!this.button) {
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.isConnected && this.connectedCallback(), {
              once: true,
            });
          }
          return;
        }
        if (!this.buyButtons) {
          this.classList.add('is-visible');
          return;
        }

        /* threshold was 0.1, which only flips isIntersecting to false once
           the target is down to its last 10% visible — so the buy buttons
           had to be scrolled almost entirely past before the bar showed up,
           reading as laggy (Burhan: wants it "as soon as the buy button
           leaves the page... a little faster"). 0 is the earliest an
           IntersectionObserver can fire: it flips the moment the target has
           zero pixels left on screen, no later. */
        this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) this.onScreen.add(entry.target);
              else this.onScreen.delete(entry.target);
            });
            this.classList.toggle('is-visible', this.onScreen.size === 0);
          },
          { rootMargin: '0px 0px -10% 0px', threshold: 0 }
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
          /* <product-gift-picker> (snippets/product-gift-picker.liquid) can
             require picking a free gift before this button is submittable,
             and it re-locks it via its own variantChange subscription right
             before this one runs (it sits earlier in the DOM, so it
             subscribes first — see assets/pubsub.js, callbacks run in
             subscription order). Overwriting `disabled` here with only the
             sold-out state would silently re-enable a still-gift-locked
             button on every variant change. `data-gift-locked` is the
             picker's own marker for "disabled by this component", so OR it
             in rather than ignoring it. */
          const giftLocked = this.button.dataset.giftLocked === 'true';
          this.button.disabled = soldOut || giftLocked;
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