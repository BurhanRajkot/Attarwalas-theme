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
  let out = (format || '{{amount}}').replace(/\{\{\s*(\w+)\s*\}\}/, (_match, name) => {
    switch (name) {
      case 'amount_no_decimals':
      case 'amount_no_decimals_with_comma_separator':
        return withCommas(value, 0);
      case 'amount_with_comma_separator':
        return withCommas(value, 2).replace(/,/g, ' ').replace('.', ',').replace(/ /g, '.');
      default:
        // money_without_trailing_zeros: keep the decimals only when non-zero
        return withCommas(value, 2).replace(/\.00$/, '');
    }
  });

  // The offer UI uses ₹ everywhere (same normalization the Liquid does with
  // `replace: 'Rs.', '₹'`) so the bar price never flips back to "Rs. 699.00".
  return out.replace(/^Rs\.\s*/, '₹').replace('₹ ', '₹');
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

        // Choice mode (offer-2/3/5): the groups are mutually exclusive tabs —
        // "Perfumes" or "Attar Roll-Ons" — and the bundle is made of the open
        // tab only, so exactly one group counts at a time.
        this.choiceMode = this.dataset.groupMode === 'choice';
        this.tabs = Array.from(this.querySelectorAll('[data-offer-choice-tab]'));
        this.activeGroupIndex = this.groups.length ? this.groups[0].dataset.groupIndex : null;

        // Quantity mode (the duo page): at least one group takes a range
        // rather than an exact count, so there's no fixed total to count to.
        this.hasRange = this.countingGroups().some((group) => group.dataset.groupRange);
        this.cards = Array.from(this.querySelectorAll('[data-offer-card]'));
        this.counter = this.querySelector('[data-offer-counter]');
        this.picksElement = this.querySelector('[data-offer-picks]');
        this.worthElement = this.querySelector('[data-offer-worth]');
        this.barPriceElement = this.querySelector('[data-offer-bar-price]');
        this.addButton = this.querySelector('[data-offer-add]');
        this.addLabel = this.querySelector('[data-offer-add-label]');
        this.spinner = this.querySelector('[data-offer-add] .loading__spinner');
        this.errorElement = this.querySelector('[data-offer-error]');
        this.bar = this.querySelector('[data-offer-bar]');
        this.cart = document.querySelector('cart-drawer') || document.querySelector('cart-notification');

        if (!this.addButton) return;

        // key: card element, value: quantity
        this.selections = new Map();

        this.tray = this.querySelector('[data-offer-tray]');
        this.traySlots = [];
        this.shownSaving = 0; // for the count-up on the savings figure

        this.cards.forEach((card) => {
          card.querySelector('[data-offer-card-add]')?.addEventListener('click', () => this.select(card));
          card.querySelector('[data-offer-qty-plus]')?.addEventListener('click', () => this.changeQty(card, 1));
          card.querySelector('[data-offer-qty-minus]')?.addEventListener('click', () => this.changeQty(card, -1));
          card
            .querySelector('[data-offer-variant]')
            ?.addEventListener('change', (event) => this.onVariantChange(card, event.target));

          this.buildSizeChips(card);

          /*
            Tap anywhere on the card to add it. Picking two perfumes used to
            cost four interactions (open dropdown, choose, then hunt for the
            small "Add to bundle" button, twice) which is most of why this
            page read as a form to fill in rather than a bundle to build.

            The button stays in the markup and keeps working — it's the
            keyboard and screen-reader path, and the no-JS fallback. This only
            adds a second, larger hit area on top of it.

            Guard: ignore clicks that land on a control which already does
            something (the size select or chips, the +/- stepper, the add
            button itself), otherwise choosing a size would also toggle the
            card, and pressing "−" would re-add what it just removed.
          */
          card.addEventListener('click', (event) => {
            if (card.classList.contains('offer-card--soldout')) return;
            if (event.target.closest('[data-offer-card-add], [data-offer-card-qty], [data-offer-variant], [data-offer-size-chips]')) return;
            if (this.selections.get(card)) return; // already in the bundle; remove via the tray
            this.select(card);
          });
        });

        this.tabs.forEach((tab) =>
          tab.addEventListener('click', () => this.setActiveGroup(tab.dataset.groupIndex))
        );

        this.addButton.addEventListener('click', () => this.addToCart());

        if (!this.useDiscount && this.offerPrice <= 0) {
          console.warn(
            `[offer-builder] "${this.offerTitle}" has no price set in admin — add-to-cart is disabled so the bundle can't be sold for free.`
          );
        }

        this.publishBarHeight();
        this.render();
      }

      /* --------------------------- size chips (view) -------------------------- */

      /*
        Render the card's size <select> as a row of tappable chips.

        The select stays in the DOM and stays the source of truth — the chips
        only set `select.value` and fire a `change`, so everything downstream
        is untouched: onVariantChange, and in particular syncGroupSize, which
        is what stops a bundle going to checkout with mixed sizes. Rebuilding
        that logic on top of chips would have meant reimplementing it.

        Falls back to the plain select and renders no chips when:
          - there is no select (single-variant product), or
          - there are more than 4 options, where chips would wrap badly and a
            dropdown is genuinely the better control.

        With JS off nothing here runs and the select renders as it always has.
      */
      buildSizeChips(card) {
        const select = card.querySelector('[data-offer-variant]');
        if (!select) return;

        const options = Array.from(select.options);
        if (options.length < 2 || options.length > 4) return;

        const list = document.createElement('div');
        list.className = 'offer-size-chips';
        list.setAttribute('data-offer-size-chips', '');

        options.forEach((option) => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'offer-size-chip';
          chip.textContent = option.dataset.option1 || option.textContent.trim();
          chip.dataset.value = option.value;
          if (option.disabled) chip.disabled = true;
          chip.addEventListener('click', () => {
            if (chip.disabled) return;
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          });
          list.appendChild(chip);
        });

        select.closest('.offer-card__variant-row')?.classList.add('offer-card__variant-row--chips');
        select.closest('.offer-card__variant-row')?.appendChild(list);
        card.__sizeChips = list;
        this.syncSizeChips(card);
      }

      /* Reflect the select's current value onto the chips. Called after any
         variant change, including one cascaded by syncGroupSize from a
         sibling card — that path sets select.value directly, so without this
         the chips would drift out of step with the real selection. */
      syncSizeChips(card) {
        const list = card.__sizeChips;
        if (!list) return;
        const select = card.querySelector('[data-offer-variant]');
        if (!select) return;
        Array.from(list.children).forEach((chip) => {
          chip.classList.toggle('offer-size-chip--active', chip.dataset.value === select.value);
        });
      }

      /* ------------------------------ bundle tray ----------------------------- */

      /*
        One slot per pick the *active* group asks for, filled left to right.

        Why this exists: the bar previously showed "0 / 2" and a comma-joined
        list of names. Nothing about it accumulated, so there was no sense of
        making progress — which is the difference between building a bundle
        and filling in a form.

        Quantity mode (the duo page) has no fixed total to draw slots for, so
        the tray is skipped there and the text summary carries on as before.
      */
      renderTray() {
        if (!this.tray) return;

        if (this.hasRange) {
          this.tray.hidden = true;
          return;
        }

        // Flatten the selections into one entry per unit, so a card picked
        // twice fills two slots.
        const picked = [];
        this.selections.forEach((qty, card) => {
          for (let i = 0; i < qty; i += 1) picked.push(card);
        });

        const want = this.totalPickCount;
        this.tray.hidden = want <= 0;
        if (want <= 0) return;

        // Rebuild only when the slot count changes (a tab switch in choice
        // mode), so filling a slot doesn't re-create the DOM under a running
        // transition and restart it.
        if (this.traySlots.length !== want) {
          this.tray.textContent = '';
          this.traySlots = [];
          for (let i = 0; i < want; i += 1) {
            const slot = document.createElement('li');
            slot.className = 'offer-tray__slot';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'offer-tray__button';
            button.innerHTML =
              '<img class="offer-tray__img" alt="" aria-hidden="true">' +
              '<span class="offer-tray__mark" aria-hidden="true"></span>';
            slot.appendChild(button);
            this.tray.appendChild(slot);
            this.traySlots.push(slot);
          }
        }

        this.traySlots.forEach((slot, i) => {
          const card = picked[i];
          const button = slot.querySelector('.offer-tray__button');
          const img = slot.querySelector('.offer-tray__img');
          const filled = Boolean(card);

          slot.classList.toggle('offer-tray__slot--filled', filled);

          if (filled) {
            const src = card.dataset.image || '';
            // Only touch src when it actually changes; reassigning the same
            // URL restarts the fade-in and makes the tray flicker on every
            // unrelated render (a size change, the other card being added).
            if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
            img.hidden = !src;
            button.disabled = false;
            button.setAttribute('aria-label', `Remove ${card.dataset.productTitle} from your bundle`);
            button.onclick = () => this.changeQty(card, -1);
          } else {
            img.removeAttribute('src');
            img.hidden = true;
            button.disabled = true;
            button.setAttribute('aria-label', 'Empty slot');
            button.onclick = null;
          }
        });
      }

      /* ------------------------------- selection ------------------------------ */

      groupIndexOf(card) {
        return card.dataset.groupIndex;
      }

      /*
        The groups that actually make up the bundle: every group normally, and
        in choice mode just the open tab — the other tabs are hidden and their
        picks were cleared on the way out, so requiring them would leave the
        add button permanently disabled.
      */
      countingGroups() {
        if (!this.choiceMode) return this.groups;
        return this.groups.filter((group) => group.dataset.groupIndex === this.activeGroupIndex);
      }

      /*
        Switches which tab is on screen. One category per bundle is the whole
        point of choice mode, so whatever was picked on the tab being left is
        dropped rather than carried across — a bundle is never half perfumes
        and half attars, and `_bundle_size` always matches one group's count.
      */
      setActiveGroup(groupIndex) {
        if (!this.choiceMode || groupIndex === this.activeGroupIndex) return;

        this.activeGroupIndex = groupIndex;
        this.selections.clear();

        this.groups.forEach((group) => {
          group.hidden = group.dataset.groupIndex !== groupIndex;
        });

        this.tabs.forEach((tab) => {
          const active = tab.dataset.groupIndex === groupIndex;
          tab.classList.toggle('offer-choice__tab--active', active);
          tab.setAttribute('aria-selected', String(active));
        });

        // Each tab carries its own pick count and mode, so the sticky bar's
        // "0 / N" and the progress fill follow the tab rather than staying on
        // whatever the first one rendered with.
        this.totalPickCount = this.groupLimit(groupIndex) || this.totalPickCount;
        this.hasRange = this.countingGroups().some((group) => group.dataset.groupRange);

        this.render();
      }

      countInGroup(groupIndex) {
        let count = 0;
        this.selections.forEach((qty, card) => {
          if (this.groupIndexOf(card) === groupIndex) count += qty;
        });
        return count;
      }

      groupOf(groupIndex) {
        return this.groups.find((element) => element.dataset.groupIndex === groupIndex);
      }

      // The most this group accepts. In exact mode min === max, which is the
      // original "pick exactly N" behaviour every offer page still uses.
      groupLimit(groupIndex) {
        const group = this.groupOf(groupIndex);
        if (!group) return 0;
        return parseInt(group.dataset.groupMax || group.dataset.groupPickCount, 10) || 0;
      }

      // The fewest this group accepts before the bundle can be added.
      groupMin(groupIndex) {
        const group = this.groupOf(groupIndex);
        if (!group) return 0;
        return parseInt(group.dataset.groupMin || group.dataset.groupPickCount, 10) || 0;
      }

      groupSatisfied(groupIndex) {
        const count = this.countInGroup(groupIndex);
        return count >= this.groupMin(groupIndex) && count <= this.groupLimit(groupIndex);
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
        if (this.discountType === 'fixed') {
          return `Flat ${formatOfferMoney(this.discountAmount * 100, this.moneyFormat)} off`;
        }
        const amount = Number.isInteger(this.discountAmount)
          ? this.discountAmount
          : Math.round(this.discountAmount * 100) / 100;
        return `${amount}% off`;
      }

      select(card) {
        if (card.dataset.available !== 'true' || this.selections.has(card)) return;

        const groupIndex = this.groupIndexOf(card);
        if (this.countInGroup(groupIndex) >= this.groupLimit(groupIndex)) {
          this.flashGroup(groupIndex);
          return;
        }

        this.selections.set(card, 1);
        this.syncGroupSize(card);
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
        this.applyVariantOption(card, select, option);
        this.syncGroupSize(card);
        this.render();
      }

      // Writes one <option>'s data onto its card (dataset + visible price) and
      // onto the <select> itself. Shared by a direct user pick (onVariantChange)
      // and a size cascaded in from another card (syncGroupSize) so both paths
      // update state identically.
      applyVariantOption(card, select, option) {
        select.value = option.value;
        card.dataset.variantId = option.value;
        card.dataset.price = option.dataset.price;
        card.dataset.variantTitle = option.dataset.variantTitle || '';
        card.dataset.available = option.dataset.available;

        const priceElement = card.querySelector('[data-offer-price]');
        if (priceElement) priceElement.textContent = option.dataset.priceFormatted;

        // Both callers land here, so this is the one place that keeps the
        // chips honest — including a size cascaded in from a sibling card by
        // syncGroupSize, which sets select.value directly and would otherwise
        // leave the chips highlighting the previous size.
        this.syncSizeChips(card);
      }

      /*
        Keeps one Size across every bottle in a pick group: whichever size the
        customer just set on `sourceCard` is applied to every other card in the
        same group, whether that card is already added to the bundle or not.
        Without this, each card's Size dropdown was fully independent — picking
        50ML on one bottle left a second bottle at 100ML with no way to notice
        until checkout.

        Matches by `data-option1` (the Size option specifically), not the full
        variant title, so a second product option (e.g. attar roll-ons' Box
        Colour) never gets forced to match — only Size does. A sibling with no
        option at that Size (rare — only if a product's Size set doesn't line
        up with the others in its group) is left alone rather than guessed at.

        Runs after every size pick (onVariantChange) and every fresh add
        (select()), so the lock is established by whichever happens first and
        stays in sync afterwards — the customer can still change their mind by
        picking a different size anywhere; that becomes the new lock.
      */
      syncGroupSize(sourceCard) {
        const sourceSelect = sourceCard.querySelector('[data-offer-variant]');
        if (!sourceSelect) return;

        const sourceOption = sourceSelect.options[sourceSelect.selectedIndex];
        const targetSize = sourceOption && sourceOption.dataset.option1;
        if (!targetSize) return;

        // Compared case-insensitively because the Size values aren't cased
        // consistently in admin: five attar roll-ons are "6ML"/"12ML" and four
        // are "6ml"/"12ml". An exact compare silently skipped the other half of
        // the group, which is the exact mixed-size checkout this lock exists to
        // prevent. Perfume bottles are uniformly uppercase, so nothing changes
        // for them.
        const wantedSize = targetSize.toLowerCase();
        const groupIndex = this.groupIndexOf(sourceCard);

        this.cards.forEach((card) => {
          if (card === sourceCard || this.groupIndexOf(card) !== groupIndex) return;

          const select = card.querySelector('[data-offer-variant]');
          if (!select) return;

          const options = Array.from(select.options);
          const sizeOf = (option) => (option.dataset.option1 || '').toLowerCase();
          const match =
            options.find((o) => sizeOf(o) === wantedSize && o.dataset.available === 'true') ||
            options.find((o) => sizeOf(o) === wantedSize);
          if (!match || match.value === select.value) return;

          this.applyVariantOption(card, select, match);
        });
      }

      flashGroup(groupIndex) {
        const pill = this.groupOf(groupIndex)?.querySelector('[data-group-counter]');
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
          const min = this.groupMin(groupIndex);
          const satisfied = this.groupSatisfied(groupIndex);
          const pill = group.querySelector('[data-group-counter]');

          if (pill) {
            // Quantity mode has no "N of N" to count towards, so the pill
            // shows the requirement until it's met, then the running count.
            pill.textContent = group.dataset.groupRange
              ? count === 0
                ? `Min ${min}`
                : `${count} selected`
              : `${count} / ${limit}`;
            pill.classList.toggle('offer-group__pill--complete', satisfied);
          }
          group.classList.toggle('offer-group--complete', satisfied);
        });

        const total = this.totalSelected();
        const counting = this.countingGroups();
        const ready = counting.every((group) => this.groupSatisfied(group.dataset.groupIndex));

        if (this.counter) this.counter.textContent = this.hasRange ? String(total) : `${total} / ${this.totalPickCount}`;
        if (this.picksElement) this.picksElement.textContent = this.picksSummary();

        // Drives the fill line across the top of the sticky bar.
        if (this.bar) {
          // In quantity mode the fill tracks how many groups are satisfied —
          // counting units would read 100% off five perfumes and no attar.
          const progress = this.hasRange
            ? (counting.filter((group) => this.groupSatisfied(group.dataset.groupIndex)).length /
                (counting.length || 1)) *
              100
            : this.totalPickCount > 0
              ? Math.min(100, (total / this.totalPickCount) * 100)
              : 0;
          this.bar.style.setProperty('--offer-progress', `${progress}%`);
          this.bar.classList.toggle('offer-builder__bar--ready', ready);

          /*
            Fire the completion flourish only on the transition into "ready",
            not on every render while it stays ready. Re-adding the class each
            time would restart the animation on unrelated renders (changing a
            size on an already-complete bundle), which reads as a glitch.
          */
          if (ready && !this.wasReady) {
            this.bar.classList.remove('offer-builder__bar--just-ready');
            // Force a reflow so removing and re-adding actually restarts it.
            void this.bar.offsetWidth;
            this.bar.classList.add('offer-builder__bar--just-ready');
          }
          if (!ready) this.bar.classList.remove('offer-builder__bar--just-ready');
          this.wasReady = ready;
        }

        this.renderTray();
        this.renderWorth();

        // A fixed-price offer whose product has no price would travel to the
        // cart as _bundle_price 0.00 — i.e. the discount function would hand
        // the whole bundle over for free. Refuse to add anything instead.
        const priced = this.useDiscount || this.offerPrice > 0;

        this.addButton.disabled = !ready || !priced;
        this.addLabel.textContent = !priced ? 'Offer unavailable' : ready ? this.readyLabel : this.promptLabel(total);

        this.hideError();
      }

      /*
        What the sticky bar says while the bundle is still incomplete.

        A single-group offer just counts down to the total ("Select 2 more").
        That's useless on a duo, where "select 1 more" doesn't say whether the
        customer still owes a perfume or an attar — so once any group names
        what it holds (data-group-noun), the prompt calls out the first group
        that's still short by name instead.
      */
      promptLabel(total) {
        const short = this.countingGroups()
          .map((group) => ({
            noun: group.dataset.groupNoun,
            need: this.groupMin(group.dataset.groupIndex) - this.countInGroup(group.dataset.groupIndex),
          }))
          .filter((group) => group.need > 0);

        if (short.length && short.some((group) => group.noun)) {
          const { noun, need } = short[0];
          const name = noun || 'item';
          return `Add ${need} ${name}${need > 1 ? 's' : ''}`;
        }

        const remaining = this.totalPickCount - total;
        return remaining === this.totalPickCount ? `Select ${this.totalPickCount} items` : `Select ${remaining} more`;
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
          // Reset so the next pick counts up from zero rather than animating
          // down from whatever the last emptied bundle happened to save.
          if (this.savingFrame) cancelAnimationFrame(this.savingFrame);
          this.savingFrame = null;
          this.shownSaving = 0;
          return;
        }

        this.worthElement.hidden = false;
        this.countSavingTo(retail, saving);
      }

      /*
        Count the saving up to its new value instead of snapping to it.

        The saving is the whole point of the offer, and a number that jumps
        silently reads as a recalculated total; one that climbs reads as a
        reward for the pick just made. ~420ms, ease-out.

        Cancels any run already in flight so two quick picks don't animate
        over each other, and skips straight to the final value under
        prefers-reduced-motion or when the change is trivial.
      */
      countSavingTo(retail, saving) {
        const write = (value) => {
          this.worthElement.innerHTML =
            `<s>${formatOfferMoney(retail, this.moneyFormat)}</s> ` +
            `<b>save ${formatOfferMoney(Math.round(value), this.moneyFormat)}</b>`;
        };

        if (this.savingFrame) cancelAnimationFrame(this.savingFrame);

        const from = this.shownSaving || 0;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        /*
          Write the final value synchronously, before any animation.

          requestAnimationFrame is starved while a tab is backgrounded or the
          window is occluded. If the only write happened inside the rAF
          callback, a customer who picked an item and switched tabs would come
          back to an empty savings line — the number the whole offer is
          selling — until something else forced a re-render. Same failure the
          floating launchers hit (see snippets/floating-stack.liquid).

          So: correctness first, flourish second. The loop below overwrites
          this with interpolated values and lands on the same number; if it
          never runs, the right figure is already on screen.
        */
        this.shownSaving = saving;
        write(saving);

        if (reduced || Math.abs(saving - from) < 2) return;

        const start = performance.now();
        const DURATION = 420;
        const step = (now) => {
          const t = Math.min(1, (now - start) / DURATION);
          const eased = 1 - Math.pow(1 - t, 3);
          write(from + (saving - from) * eased);
          if (t < 1) {
            this.savingFrame = requestAnimationFrame(step);
          } else {
            this.savingFrame = null;
            this.shownSaving = saving;
          }
        };
        this.savingFrame = requestAnimationFrame(step);
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

      /*
        The bar is `position: fixed`, so it takes no space in the layout and
        would otherwise cover the last rows of the footer. Publish its measured
        height as `--offer-bar-h` and flag the page, and the stylesheet turns
        that into matching bottom clearance on <body>.

        Measured rather than hardcoded because the height moves: one line or two
        in the bar, `env(safe-area-inset-bottom)` on notched iPhones, and the
        error message that appears under it when an add fails.
      */
      publishBarHeight() {
        if (!this.bar) return;

        document.body.classList.add('offer-page');

        const publish = () => {
          const height = this.bar.getBoundingClientRect().height;
          if (height > 0) {
            document.documentElement.style.setProperty('--offer-bar-h', `${Math.ceil(height)}px`);
          }
        };

        if ('ResizeObserver' in window) {
          new ResizeObserver(publish).observe(this.bar);
        } else {
          window.addEventListener('resize', publish);
        }

        publish();
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

        const body = { items };

        if (this.cart) {
          body.sections = this.cart.getSectionsToRender().map((section) => section.id);
          body.sections_url = window.location.pathname;
          this.cart.setActiveElement(document.activeElement);
        }

        config.body = JSON.stringify(body);
        this.setLoading(true);

        // The cart page uses this timestamp to tell a genuinely empty cart
        // from one that merely rendered before this add finished committing —
        // it reloads once instead of leaving the customer on a blank cart.
        sessionStorage.setItem('cartMutationAt', String(Date.now()));

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

            // Deliberately no cartUpdate publish: cart.js would re-fetch and
            // overwrite the sections renderContents() just wrote, racing this
            // write and doubling the network round trip for no reason (same
            // reasoning as free-gift.js).
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
        // the spinner ships with `hidden` on it — the button's own class isn't
        // enough to reveal it, `.hidden` is !important
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
