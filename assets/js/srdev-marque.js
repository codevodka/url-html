// ============================================================
//  LogoMarquee plugin (left / right)
//  Usage:
//    LogoMarquee.init({
//      selector: '.marque-1',  // required: wrapper selector
//      direction: 'left',      // 'left' | 'right'
//      speed: 40               // px per second
//    });
//    LogoMarquee.init([{...}, {...}]); // multiple configs at once
// ============================================================

const LogoMarquee = (() => {
  const instances = [];
  let resizeBound = false;

  function debounce(fn, wait = 150) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function imagesLoaded(container) {
    const imgs = [...container.querySelectorAll('img')];
    if (!imgs.length) return Promise.resolve();

    let loaded = 0;
    return new Promise((resolve) => {
      imgs.forEach((img) => {
        if (img.complete && img.naturalWidth !== 0) {
          loaded++;
        } else {
          img.onload = img.onerror = () => {
            if (++loaded === imgs.length) resolve();
          };
        }
      });
      if (loaded === imgs.length) resolve();
    });
  }

  async function fillInstance(instance) {
    const { wrapper, speed } = instance;
    if (!wrapper) return;

    await imagesLoaded(wrapper);

    let marquee = wrapper.querySelector('.marquee');
    if (!marquee) return;

    // keep track of the original items per wrapper
    let originals = [...marquee.children].filter(
      (el) => el.dataset.original === '1'
    );

    if (!originals.length) {
      originals = [...marquee.children];
      originals.forEach((el) => (el.dataset.original = '1'));
    }

    // reset marquee to just the originals
    marquee.innerHTML = '';
    originals.forEach((el) => marquee.appendChild(el));

    // ensure a second marquee exists for seamless loop
    let second = wrapper.querySelector('.marquee[data-copy="1"]');
    if (!second) {
      second = marquee.cloneNode(false);
      second.dataset.copy = '1';
      wrapper.appendChild(second);
    }

    const viewport = wrapper.offsetWidth;
    let guard = 0;

    // clone originals until we have enough width
    while (marquee.scrollWidth < viewport * 2 && guard < 50) {
      originals.forEach((el) => {
        const clone = el.cloneNode(true);
        clone.removeAttribute('id');
        clone.dataset.original = '0';
        marquee.appendChild(clone);
      });
      guard++;
    }

    // mirror content to the second marquee
    second.innerHTML = marquee.innerHTML;

    const pxPerSec = speed || 40;
    const duration = Math.max(15, Math.round(marquee.scrollWidth / pxPerSec));

    wrapper.querySelectorAll('.marquee').forEach((m) => {
      m.style.animationDuration = duration + 's';
    });
  }

  function normalizeConfig(config) {
    const defaults = {
      selector: '',
      direction: 'left', // 'left' | 'right'
      speed: 40,
    };
    return { ...defaults, ...config };
  }

  function applyDirection(wrapper, direction) {
    wrapper.dataset.marqueeDirection = direction;
    wrapper.classList.remove(
      'marquee-dir-left',
      'marquee-dir-right',
      'marquee-dir-top',
      'marquee-dir-bottom' // harmless even if we don't use top/bottom
    );
    wrapper.classList.add(`marquee-dir-${direction}`);
  }

  function initOne(rawConfig) {
    const config = normalizeConfig(rawConfig);
    if (!config.selector) return;

    const wrapper = document.querySelector(config.selector);
    if (!wrapper) return;

    const instance = {
      wrapper,
      speed: config.speed,
      direction: config.direction,
    };

    applyDirection(wrapper, config.direction);
    instances.push(instance);

    // initial layout
    fillInstance(instance);
  }

  function bindResizeOnce() {
    if (resizeBound) return;
    resizeBound = true;

    const rerun = debounce(() => {
      instances.forEach((inst) => fillInstance(inst));
    }, 150);

    window.addEventListener('resize', rerun);
  }

  function init(config) {
    if (Array.isArray(config)) {
      config.forEach((c) => initOne(c));
    } else if (config) {
      initOne(config);
    }

    if (instances.length) {
      bindResizeOnce();
    }
  }

  return {
    init,
  };
})();
