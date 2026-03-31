/* ============================================================
   🧩 MAIN SCRIPT WITH BARBA + PLUGIN INIT
   Author: (Samiran Roy)
   Description: Handles global transitions, SEO updates, plugin initialization,
   and loader management for WordPress themes using Barba.js.
=============================================================== */

document.addEventListener("DOMContentLoaded", function () {

// first page loader
  $(document).ready(function () {
    $("#loader").css("display", "flex");
});

$(window).on("load", function () {
    setTimeout(function () {
        $("#loader").fadeOut(300);
    }, 200);
});


  /* ============================================================
     🔧 INIT ALL PLUGINS (FIRST RUN)
  ============================================================ */
  initPlugins();
  /* ============================================================
     🔧 END INIT ALL PLUGINS (FIRST RUN)
  ============================================================ */

  /* ============================================================
     🌀 LOADER HANDLING
  ============================================================ */
  function showLoader() {
    document.getElementById("loader").style.display = "flex";
  } // --- END showLoader()

  function hideLoader() {
    document.getElementById("loader").style.display = "none";
  } // --- END hideLoader()
  /* ============================================================
     🌀 END LOADER HANDLING
  ============================================================ */

  /* ============================================================
     ⚡ BARBA INITIALIZATION
  ============================================================ */
  
  // ---- Initialize Barba Transitions ----
  barba.init({
    transitions: [
      {
        name: "fade",
        async leave(data) {
          showLoader();
          data.current.container.classList.add("is-leaving");
          await new Promise((resolve) => setTimeout(resolve, 500));
        },
        async enter(data) {
          data.next.container.classList.add("is-entering");
          await new Promise((resolve) => setTimeout(resolve, 50));
          data.next.container.classList.replace("is-entering", "is-entered");
          hideLoader();
        },
      },
    ],
  });
  // ---- END Barba initialization ----

  
/* ============================================================
   📜 SMART SCROLL HANDLING (WITH USER-INTERACTION GUARD)
   - Prevents unexpected jump-to-top if user scrolls after navigation
   - Cancelable, MutationObserver-backed, handles no-target links -> top
   - Integrates with Barba hooks
   - DEBUG flag for troubleshooting
============================================================ */
(() => {
  const DEBUG = false; // set true while debugging
  const log = (...args) => { if (DEBUG) console.log('[smart-scroll]', ...args); };

  // Prevent browser scroll restoration interference
  if ('scrollRestoration' in history) {
    try { history.scrollRestoration = 'manual'; } catch (e) { log('scrollRestoration err', e); }
  }

  // CSS.escape polyfill
  if (!window.CSS) window.CSS = {};
  if (typeof window.CSS.escape !== 'function') {
    window.CSS.escape = function (sel) {
      return String(sel).replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g, ch =>
        '\\' + ch.charCodeAt(0).toString(16).toUpperCase() + ' '
      );
    };
  }

  // -------------------------
  // User interaction guard
  // -------------------------
  let lastUserInteraction = 0;
  const markUserInteraction = () => { lastUserInteraction = Date.now(); };
  // Capture a broad set of interaction events
  ['wheel', 'touchstart', 'pointerdown', 'keydown', 'scroll'].forEach(evt =>
    window.addEventListener(evt, markUserInteraction, { passive: true })
  );

  // Track when we last started a navigation / attempted programmatic scroll
  let lastNavigationTime = 0;
  function markNavigationStart() { lastNavigationTime = Date.now(); log('navStart', lastNavigationTime); }

  // -------------------------
  // Helpers
  // -------------------------
  function normalizeHash(raw) {
    if (!raw || raw === '#') return '';
    return raw.startsWith('#') ? raw : `#${raw}`;
  }

  function findTarget(hash) {
    if (!hash) return null;
    const id = hash.slice(1);
    return (
      document.getElementById(id) ||
      document.querySelector(`[name="${CSS.escape(id)}"]`) ||
      (hash && document.querySelector(hash))
    );
  }

  function scrollToElement(el, behavior = 'auto') {
    if (!el) { window.scrollTo({ top: 0, left: 0, behavior }); return; }
    try {
      el.scrollIntoView({ behavior, block: 'start', inline: 'nearest' });
    } catch (err) {
      const top = el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top, behavior });
    }
  }

  function forceCSSScrollBehavior(behavior) {
    try {
      const html = document.documentElement;
      html.__prevScrollBehavior = html.style.scrollBehavior || '';
      html.style.scrollBehavior = behavior;
      return true;
    } catch (e) {
      log('forceCSSScrollBehavior err', e);
      return false;
    }
  }
  function restoreCSSScrollBehavior() {
    try {
      const html = document.documentElement;
      if (html.__prevScrollBehavior !== undefined) {
        html.style.scrollBehavior = html.__prevScrollBehavior;
        delete html.__prevScrollBehavior;
      }
    } catch (e) {
      log('restoreCSSScrollBehavior err', e);
    }
  }

  // -------------------------
  // waitForElement: wait for target + images + small stability delay
  // -------------------------
  function waitForElement(hash, { timeout = 2500, stableDelay = 40 } = {}) {
    return new Promise((resolve) => {
      const start = Date.now();
      let lastMutation = Date.now();

      const checkAndResolve = async () => {
        const el = findTarget(hash);
        if (el) {
          const imgs = Array.from(el.querySelectorAll('img')).filter(i => !i.complete);
          if (imgs.length > 0) {
            let remaining = imgs.length;
            const onLoaded = () => { remaining--; if (remaining <= 0) resolve(el); };
            imgs.forEach(img => { img.addEventListener('load', onLoaded, { once: true }); img.addEventListener('error', onLoaded, { once: true }); });
            setTimeout(() => resolve(el), 1200);
            return;
          }
          setTimeout(() => resolve(el), stableDelay);
          return;
        }
        if (Date.now() - start > timeout) return resolve(null);
        requestAnimationFrame(() => {
          if (Date.now() - lastMutation > stableDelay) {
            const el2 = findTarget(hash);
            if (el2) return setTimeout(() => resolve(el2), stableDelay);
          }
          setTimeout(() => resolve(waitForElement(hash, { timeout: Math.max(0, timeout - (Date.now() - start)), stableDelay })), 45);
        });
      };

      const mo = new MutationObserver(() => { lastMutation = Date.now(); });
      mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      setTimeout(() => mo.disconnect(), timeout + 200);
      checkAndResolve();
    });
  }

  // -------------------------
  // Cancelable token
  // -------------------------
  let token = { cancelled: false, id: 0 };
  function cancelToken() { token.cancelled = true; token = { cancelled: false, id: token.id + 1 }; }

  // -------------------------
  // Decide whether to avoid forcing scroll (if user already interacted)
  // -------------------------
  function shouldAvoidForcedScroll() {
    // if the user interacted (scroll/touch/etc.) after the last navigation start,
    // do not force-scroll. Also give a short grace window.
    const userAfterNav = lastUserInteraction > lastNavigationTime;
    if (!lastNavigationTime) return false;
    // if user interacted within 50-100ms after nav, consider that interaction intentional
    return userAfterNav && (lastUserInteraction - lastNavigationTime) >= 0;
  }

  // -------------------------
  // Core: tryHashScroll (with guard)
  // -------------------------
  async function tryHashScroll(hash) {
    const myId = token.id;
    if (token.cancelled) { log('tryHashScroll cancelled early', hash); return false; }
    log('tryHashScroll start', hash, 'token', myId);

    // If user already interacted after navigation, skip forcing scroll (let user control)
    if (shouldAvoidForcedScroll()) {
      log('User interacted after navigation - skipping forced scroll for', hash);
      return false;
    }

    // Temporarily disable CSS smooth to avoid fight with browser
    forceCSSScrollBehavior('auto');

    // Wait for element and stable layout
    const el = await waitForElement(hash, { timeout: 3000, stableDelay: 30 });
    if (token.id !== myId || token.cancelled) { log('tryHashScroll cancelled after wait', hash); restoreCSSScrollBehavior(); return false; }

    // If user interacted during wait, avoid forcing scroll
    if (shouldAvoidForcedScroll()) {
      log('User interacted during wait - skipping final forced scroll for', hash);
      restoreCSSScrollBehavior();
      return false;
    }

    if (el) {
      // instant placement
      scrollToElement(el, 'auto');
      // small delay then smooth nudge
      await new Promise(r => setTimeout(r, 35));
      if (token.id !== myId || token.cancelled) { restoreCSSScrollBehavior(); return false; }
      if (shouldAvoidForcedScroll()) { log('User interacted before smooth nudge - skipping'); restoreCSSScrollBehavior(); return false; }
      scrollToElement(el, 'smooth');

      try {
        if (document.activeElement !== el) {
          el.setAttribute('tabindex', '-1');
          el.focus({ preventScroll: true });
        }
      } catch (e) { /* ignore */ }

      log('tryHashScroll success', hash, el);
      restoreCSSScrollBehavior();
      return true;
    } else {
      // fallback -> top, but only if user hasn't interacted
      if (shouldAvoidForcedScroll()) {
        log('No element but user interacted - skip top fallback', hash);
        restoreCSSScrollBehavior();
        return false;
      }
      scrollToElement(null, 'auto');
      restoreCSSScrollBehavior();
      log('tryHashScroll fallback -> top', hash);
      return false;
    }
  }

  // -------------------------
  // Click handler: handles no-hash/top and hash -> tryHashScroll
  // -------------------------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    let href = a.getAttribute('href') || '';
    if (/^(javascript:|mailto:|tel:|#\!)/i.test(href)) return;
    let url;
    try { url = new URL(href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;

    const targetHash = normalizeHash(url.hash); // '' if none or '#'
    const samePath = url.pathname.replace(/\/+$/, '') === location.pathname.replace(/\/+$/, '');

    if (samePath) {
      // we will handle the same-path link -> prevent native
      e.preventDefault();

      // Update URL cleanly (preserve search)
      if (history.replaceState) {
        const newUrl = url.pathname + (url.search || '') + (targetHash ? targetHash : '');
        history.replaceState(null, '', newUrl);
      } else {
        location.hash = targetHash;
      }

      // mark navigation start and cancel previous attempts
      markNavigationStart();
      cancelToken();

      // If no hash -> top (but skip forced top if user already interacted)
      if (!targetHash) {
        if (!shouldAvoidForcedScroll()) {
          scrollToElement(null, 'auto');
          setTimeout(() => { if (!token.cancelled && !shouldAvoidForcedScroll()) scrollToElement(null, 'smooth'); }, 35);
        } else {
          log('User interacted - not forcing top for no-hash link');
        }
        return;
      }

      // For a real hash, attempt to scroll to it (will fallback to top if not found)
      tryHashScroll(targetHash);
    } else {
      // Different path navigation - let normal navigation happen (or Barba will handle)
      // Mark navigation start so afterEnter guard can use it
      markNavigationStart();
    }
  }, false);

  // -------------------------
  // Hashchange (back/forward)
  // -------------------------
  window.addEventListener('hashchange', () => {
    markNavigationStart();
    cancelToken();
    tryHashScroll(normalizeHash(location.hash));
  });

  // -------------------------
  // Initial load
  // -------------------------
  const init = () => { markNavigationStart(); cancelToken(); tryHashScroll(normalizeHash(location.hash)); };
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 0);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
  }

  // -------------------------
  // Barba integration
  // -------------------------
  if (window.barba && window.barba.hooks) {
    window.barba.hooks.before(() => {
      // cancel during leave
      cancelToken();
      markNavigationStart();
    });
    window.barba.hooks.afterEnter(() => {
      // after enter, small delay to let Barba DOM swap/animations settle
      setTimeout(() => { markNavigationStart(); cancelToken(); tryHashScroll(normalizeHash(location.hash)); }, 10);
    });
  }

  log('smart-scroll (user-guard) initialized');
})();

/* ============================================================
   📜 END SMART SCROLL HANDLING (FINAL FIXED + TOP SCROLL)
============================================================ */


  /* ============================================================
     🔍 SEO META UPDATE HOOKS
  ============================================================ */
  barba.hooks.afterEnter((data) => {
    const html = data.next.html;

    // ----- Update <title> -----
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) document.title = titleMatch[1];

    // ----- Update <meta name="description"> -----
    const metaDesc = html.match(
      /<meta name=["']description["'] content=["'](.*?)["']>/i
    );
    if (metaDesc && metaDesc[1]) {
      let metaTag = document.querySelector('meta[name="description"]');
      if (metaTag) metaTag.setAttribute("content", metaDesc[1]);
      else {
        metaTag = document.createElement("meta");
        metaTag.name = "description";
        metaTag.content = metaDesc[1];
        document.head.appendChild(metaTag);
      }
    }

    // ----- Update <meta property="og:title"> -----
    const ogTitle = html.match(
      /<meta property=["']og:title["'] content=["'](.*?)["']>/i
    );
    if (ogTitle && ogTitle[1]) {
      let ogTag = document.querySelector('meta[property="og:title"]');
      if (ogTag) ogTag.setAttribute("content", ogTitle[1]);
    }

    // ----- Update <meta property="og:description"> -----
    const ogDesc = html.match(
      /<meta property=["']og:description["'] content=["'](.*?)["']>/i
    );
    if (ogDesc && ogDesc[1]) {
      let ogTag = document.querySelector('meta[property="og:description"]');
      if (ogTag) ogTag.setAttribute("content", ogDesc[1]);
    }

    // ----- Update <meta property="og:image"> -----
    const ogImage = html.match(
      /<meta property=["']og:image["'] content=["'](.*?)["']>/i
    );
    if (ogImage && ogImage[1]) {
      let ogImgTag = document.querySelector('meta[property="og:image"]');
      if (ogImgTag) ogImgTag.setAttribute("content", ogImage[1]);
    }

    // ----- Update <link rel="canonical"> -----
    const canonical = html.match(
      /<link rel=["']canonical["'] href=["'](.*?)["']>/i
    );
    if (canonical && canonical[1]) {
      let canonTag = document.querySelector('link[rel="canonical"]');
      if (canonTag) canonTag.setAttribute("href", canonical[1]);
      else {
        canonTag = document.createElement("link");
        canonTag.rel = "canonical";
        canonTag.href = canonical[1];
        document.head.appendChild(canonTag);
      }
    }

    // ----- Optional: Google Analytics Pageview -----
    if (typeof gtag === "function") {
      gtag("config", "GA_MEASUREMENT_ID", {
        page_path: data.next.url.path,
      });
    }
	  
	  
  });
  /* ============================================================
     🔍 END SEO META UPDATE HOOKS
  ============================================================ */

  /* ============================================================
     ♻️ RE-INIT PLUGINS AFTER EACH BARBA TRANSITION
  ============================================================ */
  barba.hooks.after(() => {
    initPlugins();
  });
  /* ============================================================
     ♻️ END RE-INIT PLUGINS AFTER EACH BARBA TRANSITION
  ============================================================ */

  /* ============================================================
     🔧 PLUGIN INITIALIZATION FUNCTION
  ============================================================ */
  function initPlugins() {


//Navigation
jQuery(function ($) {
    $('.stellarnav').stellarNav({
        theme: 'dark', // adds default color to nav. (light, dark)
        breakpoint: 991, // number in pixels to determine when the nav should turn mobile friendly
        menuLabel: '&nbsp', // label for the mobile nav
        sticky: false, // makes nav sticky on scroll (desktop only)
        position: 'left', // 'static', 'top', 'left', 'right' - when set to 'top', this forces the mobile nav to be placed absolutely on the very top of page
        openingSpeed: 250, // how fast the dropdown should open in milliseconds
        closingDelay: 250, // controls how long the dropdowns stay open for in milliseconds
        showArrows: true, // shows dropdown arrows next to the items that have sub menus
        phoneBtn: '', // adds a click-to-call phone link to the top of menu - i.e.: "18009084500"
        phoneLabel: 'Call Us', // label for the phone button
        locationBtn: '', // adds a location link to the top of menu - i.e.: "/location/", "http://site.com/contact-us/"
        locationLabel: 'Location', // label for the location button
        closeBtn: false, // adds a close button to the end of nav
        closeLabel: 'Close', // label for the close button
        mobileMode: false,
        scrollbarFix: false // fixes horizontal scrollbar issue on very long navs
    });

});


// sub title center
(() => {
  document.querySelectorAll('[class^="sub-title-"].text-center').forEach(el => {
    const wrapper = document.createElement('div');
    wrapper.className = 'd-flex justify-content-center';
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
    });
})();


// swiper slider home hero setion
(() => {
    if (!document.querySelector('.hero-section .mySwiper')) return;
    const swiper = new Swiper('.hero-section .mySwiper', {
      slidesPerView: 1,
      loop: true,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
        renderBullet: function (index, className) {
          const num = String(index + 1).padStart(2, '0');
          return `
            <span class="${className}">
              <span class="num">${num}</span>
              <span class="line"></span>
            </span>
          `;
        },
      },
    });

})();

// swiper slider testimonials setion
(() => {
    if (!document.querySelector('.testimonials-section .mySwiper')) return;
    const swiper = new Swiper('.testimonials-section .mySwiper', {
      slidesPerView: 1,
      loop: true,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
        renderBullet: function (index, className) {
          const num = String(index + 1).padStart(2, '0');
          return `
            <span class="${className}">
              <span class="num">${num}</span>
              <span class="line"></span>
            </span>
          `;
        },
      },
    });

})();


// counter js 
(() => {
  if (!document.querySelector('.counter-number')) return;
  const counters = document.querySelectorAll(".counter-number");
  if (!counters.length) return;

  const parseTarget = (el) => {
    const dt = el.getAttribute("data-target");
    if (dt != null) {
      const cleaned = dt.trim().toLowerCase();
      if (cleaned.includes("k")) {
        return Math.round(parseFloat(cleaned.replace(/[^0-9.]/g, "")) * 1000);
      }
      return parseInt(cleaned.replace(/[^\d-]/g, ""), 10) || 0;
    }

    const txt = (el.textContent || "").trim().toLowerCase();
    if (!txt) return 0;
    if (txt.includes("k")) {
      const num = parseFloat(txt.replace(/[^0-9.]/g, "")) || 0;
      return Math.round(num * 1000);
    }
    return parseInt(txt.replace(/[^\d-]/g, ""), 10) || 0;
  };

  const hasModeK = (el) => el.hasAttribute("data-mode-k");
  const hasPlus = (el) => el.hasAttribute("data-plus");

  const formatDisplay = (value, useKMode, addPlus) => {
    const plus = addPlus ? "+" : "";

    if (!useKMode) return `${value}${plus}`;

    if (value < 1000) return `${value}${plus}`;

    const thousands = value / 1000;
    const formatted = thousands.toFixed(2);

    return `${formatted}k${plus}`;
  };

  const startCounter = (counterEl) => {
    const rawTarget = parseTarget(counterEl);
    const useK = hasModeK(counterEl);
    const plus = hasPlus(counterEl);

    const speed = (() => {
      const s = counterEl.getAttribute("data-speed");
      if (!s) return 2000;
      const n = parseInt(s, 10);
      return Number.isFinite(n) && n > 0 ? Math.max(50, n) : 2000;
    })();

    const frameMs = 16;
    const frames = Math.max(1, Math.round(speed / frameMs));
    const step = Math.max(1, Math.ceil(rawTarget / frames));

    let current = 0;
    counterEl.textContent = formatDisplay(0, useK, plus);

    const id = setInterval(() => {
      current += step;
      if (current >= rawTarget) {
        counterEl.textContent = formatDisplay(rawTarget, useK, plus);
        clearInterval(id);
      } else {
        counterEl.textContent = formatDisplay(current, useK, plus);
      }
    }, frameMs);
  };

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((c) => observer.observe(c));
})();


// circle text (IIFE, safe, multi-element)
(() => {
  function makeEmblem(element, text) {
    element.innerHTML = '';
    for (var i = 0; i < text.length; i++) {
      var letter = text[i];
      var span = document.createElement('span');
      var node = document.createTextNode(letter);
      var r = (360 / text.length) * i;
      var x = (Math.PI / text.length).toFixed(0) * i;
      var y = (Math.PI / text.length).toFixed(0) * i;

      span.appendChild(node);
      span.style.webkitTransform =
        'rotateZ(' + r + 'deg) translate3d(' + x + 'px,' + y + 'px,0)';
      span.style.transform =
        'rotateZ(' + r + 'deg) translate3d(' + x + 'px,' + y + 'px,0)';

      element.appendChild(span);
    }
  }

  var elements = document.querySelectorAll('.emblem');
  if (!elements.length) return;

  elements.forEach(function (el) {
    var text = el.innerHTML || '';
    makeEmblem(el, text);
  });
})();


// logo marque init
  LogoMarquee.init([
    {
      selector: '.marque-1',
      direction: 'left',
      speed: 40,
    },
  ]);




//back to top button
(() =>{
    var btn = $('#back-to-top-button');

  $(window).scroll(function() {
    if ($(window).scrollTop() > 300) {
      btn.addClass('show');
    } else {
      btn.removeClass('show');
    }
  });

  btn.on('click', function(e) {
    e.preventDefault();
    $('html, body').animate({scrollTop:0}, '300');
  });
})();


    


// // Hide Ajax Search Lite dropdown when a result is clicked
// (function(){
//     // if (!document.querySelector('  ')) return;
//     document.addEventListener("click", (e) => {
//     const resultLink = e.target.closest(".asl_r a");
//     if (resultLink) {
//       document.querySelectorAll(".asl_r").forEach((dropdown) => {
//         dropdown.style.display = "none";
//         dropdown.classList.remove("open", "visible");
//       });

//       // optional: blur input so keyboard closes on mobile
//       document.querySelectorAll(".asl_s input.orig").forEach((input) => {
//         input.blur();
//       });
//     }
//   });
// })();



// fancybox init
// (function(){
//     if (!document.querySelector('[data-fancybox]')) return;
//     Fancybox.bind("[data-fancybox]", {});
// })();


    
  }
  /* ============================================================
     🔧 END PLUGIN INITIALIZATION FUNCTION
  ============================================================ */
	   

});