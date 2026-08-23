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

    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.addEventListener('change', this.close.bind(this));
  }

  open() {
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

  onFocusOut(event) {
    if (this.contains(event.relatedTarget)) return;
    this.close();
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
