class FragrancePicker extends HTMLElement {
  constructor() {
    super();
    this.searchInput = this.querySelector('[data-fragrance-search]');
    this.clearButton = this.querySelector('[data-fragrance-clear]');
    this.list = this.querySelector('[data-fragrance-list]');
    this.items = Array.from(this.querySelectorAll('[data-fragrance-item]'));
    this.emptyState = this.querySelector('[data-fragrance-empty]');

    if (this.searchInput) {
      this.searchInput.addEventListener('input', this.onSearch.bind(this));
      this.searchInput.addEventListener('keydown', this.onKeydown.bind(this));
      this.searchInput.addEventListener('focus', this.open.bind(this));
    }

    if (this.clearButton) {
      this.clearButton.addEventListener('click', this.onClear.bind(this));
    }

    // Mousedown on a list item blurs the search input (the radio it's
    // labelling is visually-hidden, so the browser can't focus it as part of
    // the same mousedown) before the click that actually checks the radio
    // fires. onFocusOut used to react to that blur immediately and hide the
    // list, so the click landed on whatever was underneath instead of the
    // item — the item appeared to do nothing. Suppressing mousedown's
    // default here keeps focus on the input through the whole click, so the
    // list stays open until onChange closes it deliberately. Mouse only —
    // see onFocusOut for the touch equivalent (preventDefault on touchstart
    // would also block scrolling the list, which mousedown doesn't risk).
    if (this.list) {
      this.list.addEventListener('mousedown', (event) => event.preventDefault());
    }

    this.closeTimeout = null;

    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.addEventListener('change', this.onChange.bind(this));

    // No fragrance is pre-selected (see snippets/fragrance-option-picker.liquid) —
    // Dawn's own price/Add-to-cart state only gets recomputed on a 'change' event,
    // so without this the button would render enabled on first load even though
    // nothing is actually chosen yet. This runs once the moment the picker exists;
    // Dawn's normal VariantSelects.onVariantChange takes over and re-enables it as
    // soon as the customer picks a fragrance (or disables it again for any other
    // genuinely unavailable combination), same as it always has.
    if (!this.querySelector('.fragrance-picker__radio:checked')) {
      const variantSelects = this.closest('variant-selects');
      if (variantSelects && typeof variantSelects.toggleAddButton === 'function') {
        variantSelects.toggleAddButton(true, 'Select a fragrance');
      }
    }
  }

  open() {
    if (this.closeTimeout) {
      window.clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    if (!this.list || !this.list.hidden) return;
    this.list.hidden = false;
    this.keepListInView();
  }

  // The list drops downward, so opening the picker near the bottom of a phone
  // screen would push the options off-screen (worse once the on-screen keyboard
  // takes half the viewport). Nudge the page up by however much is hanging off.
  keepListInView() {
    var overflow = this.list.getBoundingClientRect().bottom - window.innerHeight;
    if (overflow <= 0) return;
    window.scrollBy({ top: overflow + 16, behavior: 'smooth' });
  }

  close() {
    if (this.list) this.list.hidden = true;
  }

  // Picking a fragrance used to leave the search box showing whatever the
  // customer had typed (or empty, showing the placeholder) while the chosen
  // name only appeared in the small legend text next to "Search Your
  // Fragrance" — easy to miss and confusing next to an apparently-empty
  // search box (Burhan, 2026-09-02). The box itself now shows the selection,
  // like a normal combobox.
  onChange() {
    // Reads whichever radio actually ended up checked, rather than trusting
    // event.target to be exactly that radio — label-forwarded activation
    // (tapping/clicking the label, not the input) can be inconsistent about
    // what a bubbled 'change' event reports as its target across mobile
    // browsers, and this is robust to that regardless.
    const radio = this.querySelector('.fragrance-picker__radio:checked');
    if (radio) {
      const item = radio.closest('[data-fragrance-item]');
      const nameEl = item ? item.querySelector('.fragrance-picker__name') : null;
      if (nameEl && this.searchInput) {
        this.searchInput.value = nameEl.textContent.trim();
      }
    }
    this.close();
  }

  // Touch equivalent of the mousedown fix above: tapping a list item blurs
  // the search input at touchstart (mobile browsers dismiss the keyboard
  // immediately on tap-outside), well before the touchend/click that
  // actually selects the item fires — same race, different trigger, and one
  // `mousedown.preventDefault()` can't cover both without also blocking
  // touch-scrolling the list (preventDefault on touchstart kills the
  // gesture's scroll too, not just the blur). Deferring the close instead of
  // doing it synchronously gives that click/tap — and onChange's own
  // close() — a chance to land first; open() cancels this if the list gets
  // refocused before it fires, so a quick re-tap into the search box isn't
  // yanked shut out from under it.
  onFocusOut(event) {
    if (this.contains(event.relatedTarget)) return;
    this.closeTimeout = window.setTimeout(() => {
      this.closeTimeout = null;
      if (this.contains(document.activeElement)) return;
      this.close();
    }, 300);
  }

  onSearch() {
    const query = this.searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    this.items.forEach((item) => {
      const matches = !query || item.dataset.search.includes(query);
      item.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    if (this.emptyState) this.emptyState.hidden = visibleCount !== 0;
    if (this.clearButton) this.clearButton.hidden = query === '';
  }

  onClear() {
    this.searchInput.value = '';
    this.onSearch();
    this.searchInput.focus();
  }

  onKeydown(event) {
    if (event.key === 'Escape') {
      this.close();
      this.searchInput.blur();
      return;
    }

    if (event.key !== 'Enter') return;
    event.preventDefault();

    const firstVisible = this.items.find((item) => !item.hidden && !item.classList.contains('is-disabled'));
    if (!firstVisible) return;

    const radio = firstVisible.querySelector('.fragrance-picker__radio');
    if (!radio) return;

    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

customElements.define('fragrance-picker', FragrancePicker);
