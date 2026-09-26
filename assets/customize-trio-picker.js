/**
 * <customize-trio-picker> — reveals the Customize Trio gift-set page's 3
 * fragrance fields (2 perfumes, 1 roll-on) one at a time, and gates the page's
 * own Add to cart / Buy Now / sticky-bar buttons until all 3 are chosen. See
 * snippets/customize-trio-picker.liquid for why there's nothing here to
 * actually add to the cart — every field is a plain named input inside (via
 * its `form` attribute) the page's own <product-form>, so Dawn's existing
 * FormData submission already carries them as line-item properties on the
 * gift-set's single variant with zero changes to that shared file.
 *
 * Mirrors assets/product-gift-picker.js's own required-pick gating
 * (getBuyButtons()/updateBuyButtons(), the data-trio-locked marker so a
 * later re-enable only ever touches buttons this component itself disabled,
 * and the repeated warning line injected above the buttons since this
 * picker can be scrolled out of view by the time a customer reaches them).
 */
if (!customElements.get('customize-trio-picker')) {
  class CustomizeTrioPicker extends HTMLElement {
    constructor() {
      super();

      this.sectionId = this.dataset.section;
      this.productFormId = this.dataset.productFormId;
      this.requiredHint = this.querySelector('[data-trio-required-hint]');
      this.fieldGroups = Array.from(this.querySelectorAll('[data-trio-group]'));
      this.fragranceFields = Array.from(this.querySelectorAll('[data-trio-fragrance-field]'));
      this.buyWarning = this.createBuyWarning();

      this.addEventListener('change', () => {
        this.revealNextGroup();
        this.updateBuyButtons();
      });
      this.revealNextGroup();
      this.updateBuyButtons();
    }

    // Each field group holds exactly one fragrance field, in the same order
    // as this.fieldGroups, so index i's fragrance field being picked reveals
    // group i + 1. Once revealed a group stays revealed — these are radio
    // fragrance pickers, there's no "unpick" action that should re-hide it.
    revealNextGroup() {
      for (let i = 0; i < this.fieldGroups.length - 1; i += 1) {
        const chosen = this.fragranceFields[i] && this.fragranceFields[i].querySelector('input:checked');
        if (chosen) this.fieldGroups[i + 1].hidden = false;
      }
    }

    // See assets/product-gift-picker.js's own createBuyWarning() — same
    // reasoning, placed as the previous sibling of .product-form__buttons
    // so it reads before the buy buttons rather than between them.
    createBuyWarning() {
      const form = document.getElementById(this.productFormId);
      const buttons = form ? form.querySelector('.product-form__buttons') : null;
      if (!buttons) return null;
      const existing = buttons.parentElement.querySelector('[data-trio-buy-warning]');
      if (existing) return existing;
      const warning = document.createElement('p');
      warning.className = 'customize-trio-picker__buy-warning';
      warning.setAttribute('data-trio-buy-warning', '');
      warning.textContent = '*Choose all 3 fragrances above before you can buy this gift set.';
      warning.hidden = true;
      buttons.parentElement.insertBefore(warning, buttons);
      return warning;
    }

    allChosen() {
      return this.fragranceFields.every((field) => field.querySelector('input:checked'));
    }

    // Every button that can submit this product's form — the Add to cart
    // and Buy Now buttons inside <product-form>, plus the sticky bar's own
    // Add button, which lives outside the form and targets it via the
    // `form` attribute instead. Mirrors product-gift-picker.js's own
    // getBuyButtons(), including the `button` scoping so this doesn't also
    // pick up every fragrance radio on the page, which carries the same
    // `form` attribute.
    getBuyButtons() {
      const buttons = [];
      const form = document.getElementById(this.productFormId);
      if (form) {
        const addButton = form.querySelector('[name="add"]');
        if (addButton) buttons.push(addButton);
        const buyNowButton = form.querySelector('[name="checkout"]');
        if (buyNowButton) buttons.push(buyNowButton);
      }
      document.querySelectorAll(`button[form="${this.productFormId}"]`).forEach((button) => {
        if (!buttons.includes(button)) buttons.push(button);
      });
      return buttons;
    }

    updateBuyButtons() {
      const ready = this.allChosen();

      this.getBuyButtons().forEach((button) => {
        if (ready) {
          if (button.dataset.trioLocked === 'true') {
            button.removeAttribute('disabled');
            delete button.dataset.trioLocked;
          }
        } else {
          button.setAttribute('disabled', 'disabled');
          button.dataset.trioLocked = 'true';
        }
      });

      if (this.requiredHint) this.requiredHint.hidden = ready;
      if (this.buyWarning) this.buyWarning.hidden = ready;
    }
  }

  customElements.define('customize-trio-picker', CustomizeTrioPicker);
}
