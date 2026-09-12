/* Load manifest.js first. Paths resolve relative to this file, including Android assets. */
(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const index = new Map(window.BEANSTER_ART.assets.map(a => [a.id, a]));
  window.BeansterArt = {
    get(id) { return index.get(id); },
    url(id, { animated = false, format = 'webp', scale = 2 } = {}) {
      const a = index.get(id);
      if (!a) throw new Error(`Unknown Beanster art ID: ${id}`);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const path = animated && !reduced && a.animation
        ? (a.animation[format] || a.animation.webp)
        : (a.png[`${scale}x`] || a.png['2x']);
      return new URL(path, base).href;
    },
    apply(img, id, options) {
      const a = index.get(id);
      if (!a) throw new Error(`Unknown Beanster art ID: ${id}`);
      img.src = this.url(id, options);
      img.alt = a.label;
      return img;
    }
  };
})();
