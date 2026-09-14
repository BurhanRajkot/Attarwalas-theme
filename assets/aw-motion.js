/*
  ATTARWALAS motion — tags section content for the shared scroll reveal in
  aw-motion.css and reveals it as it enters the viewport.

  Sections with their own reveal already (Duo carousel, Our promise items,
  Shop by category cards, Customer reviews, Dawn's .scroll-trigger blocks)
  are deliberately not listed here; they use the same curve and trigger
  point through their own CSS/JS.

  Content is never hidden without JavaScript: the hidden state is an
  attribute this script adds, only to elements that start below the fold.
*/
(() => {
  if (window.Shopify && window.Shopify.designMode) return;
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Each group: elements inside `root` revealed in the listed order.
  const GROUPS = [
    {
      root: '.signature-carousel-wrapper',
      steps: ['.signature-carousel__eyebrow', '.signature-carousel__heading h2', '.signature-carousel__line', '.signature-carousel__carousel'],
    },
    { root: '.offer-teaser', steps: ['.offer-teaser__eyebrow', '.offer-teaser__title', '.offer-teaser__subtext'] },
    // The deal cards also render inside the product page's buy box, which
    // already slides in as a whole — don't animate them twice there.
    { root: '.offer-deals', steps: ['.offer-deals__heading', '.offer-deals__item'], exclude: '.product__info-wrapper' },
    { root: '.shop-by-category-wrapper', steps: ['.shop-by-category__header'] },
    { root: '.our-promise-wrapper', steps: ['.our-promise__header'] },
    { root: '[class*="aw-perfumer-template"]', steps: ['.aw-perfumer__eyebrow', '.aw-perfumer__bio', '.aw-perfumer__credit'] },
    {
      root: '.store-location',
      steps: ['.store-location__heading', '.store-location__intro', '.store-location__row', '.store-location__directions', '.store-location__map'],
    },
  ];

  // Photos that unveil rather than rise.
  const MEDIA = ['.our-promise__media', '.aw-perfumer__media'];

  const STAGGER_MS = 90;
  const MAX_STAGGER_STEPS = 6;

  const inOrder = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

  // Once a reveal has played, drop every trace of it so the element is back
  // to exactly its own styles (no lingering translate/clip-path, no delay
  // on its own hover transitions).
  const settle = (el) => {
    el.removeAttribute('data-aw-reveal');
    el.removeAttribute('data-aw-media');
    el.classList.remove('is-inview');
    el.style.removeProperty('--aw-delay');
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const entering = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target)
        .sort(inOrder);

      entering.forEach((el, index) => {
        observer.unobserve(el);
        el.style.setProperty('--aw-delay', `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms`);
        el.classList.add('is-inview');

        let done = false;
        const finish = (event) => {
          if (done || (event && event.target !== el)) return;
          done = true;
          settle(el);
        };
        el.addEventListener('transitionend', (event) => {
          if (event.propertyName === 'translate' || event.propertyName === 'clip-path') finish(event);
        });
        // Backstop for tabs in the background, where transitions don't run.
        setTimeout(finish, 2400 + Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS);
      });
    },
    // Start as soon as the element's top edge is a little way into the
    // screen, so nothing sits blank while it waits to animate.
    { rootMargin: '0px 0px -6% 0px', threshold: 0 }
  );

  const belowFold = (el) => el.getBoundingClientRect().top > window.innerHeight * 0.92;

  const tag = (el, attribute) => {
    if (el.hasAttribute('data-aw-reveal') || el.hasAttribute('data-aw-media')) return;
    // Already on screen when the page loads: leave it alone rather than
    // blinking it out and back in.
    if (!belowFold(el)) return;
    el.setAttribute(attribute, '');
    observer.observe(el);
  };

  const init = () => {
    GROUPS.forEach((group) => {
      document.querySelectorAll(group.root).forEach((root) => {
        if (group.exclude && root.closest(group.exclude)) return;
        group.steps.forEach((selector) => {
          root.querySelectorAll(selector).forEach((el) => tag(el, 'data-aw-reveal'));
        });
      });
    });

    MEDIA.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => tag(el, 'data-aw-media'));
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
