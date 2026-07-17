/* shared.js — Hépego · Site 2.0
   Header, menu mobile, tracking, links dinâmicos, marquee, Lenis, âncoras.
   Script clássico, defer, depois de flow.js. Idempotente e tolerante à falta de vendor. */
(function () {
  "use strict";

  var CFG = window.HEPEGO_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- tracking ---------- */
  function trackEvent(name, data) {
    data = data || {};
    try { console.log("[TRACK]", name, data); } catch (e) {}
    try {
      if (typeof window.gtag === "function" && CFG.tracking && CFG.tracking.ga4_id)
        window.gtag("event", name, data);
      if (typeof window.fbq === "function" && CFG.tracking && CFG.tracking.meta_pixel_id)
        window.fbq("trackCustom", name, data);
      var hook = CFG.tracking && CFG.tracking.custom_webhook;
      if (hook && navigator.sendBeacon) {
        navigator.sendBeacon(hook, new Blob(
          [JSON.stringify({ event: name, data: data, ts: Date.now() })],
          { type: "application/json" }
        ));
      }
    } catch (e) {}
  }

  /* ---------- WhatsApp ---------- */
  function waNumber() { return (CFG.whatsapp || "").replace(/\D/g, ""); }
  function directWhatsApp(origin) {
    trackEvent("whatsapp_direct_click", { origin: origin });
    var msg = "Oi! Vim pelo site e quero fazer um pedido.";
    window.open("https://wa.me/" + waNumber() + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
  }

  /* ---------- expõe namespace p/ cardapio.js ---------- */
  window.HEPEGO = window.HEPEGO || {};
  window.HEPEGO.track = trackEvent;
  window.HEPEGO.reduceMotion = reduceMotion;
  window.HEPEGO.waNumber = waNumber;

  /* ---------- links dinâmicos ---------- */
  function applyLinks() {
    var wa = "https://wa.me/" + waNumber();
    $$("[data-wa-link]").forEach(function (el) { el.href = wa; });
    if (CFG.instagram) $$("[data-ig-link]").forEach(function (el) { el.href = CFG.instagram; });
  }
  function applyIfood() {
    var url = CFG.ifoodUrl || "";
    $$("[data-ifood]").forEach(function (el) {
      if (url) { el.hidden = false; if (el.tagName === "A") el.href = url; }
      else { el.hidden = true; }
    });
  }

  /* ---------- header sticky ---------- */
  function initHeader() {
    var header = $("[data-header]");
    if (!header) return;
    var stuck = false;
    function onScroll() {
      var s = (window.pageYOffset || document.documentElement.scrollTop) > 40;
      if (s !== stuck) { stuck = s; header.classList.toggle("is-stuck", s); }
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- menu mobile (focus trap) ---------- */
  function initMenu() {
    var menu = $("[data-menu]");
    var openBtn = $("[data-menu-open]");
    if (!menu || !openBtn) return;
    var closeBtn = $("[data-menu-close]", menu);
    var lastFocus = null;

    function focusables() {
      return $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', menu)
        .filter(function (el) { return el.offsetParent !== null; });
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function open() {
      // exclusão mútua com o sheet do carrinho (um overlay modal por vez)
      if (window.HEPEGO && typeof window.HEPEGO.closeSheet === "function") window.HEPEGO.closeSheet();
      lastFocus = document.activeElement;
      menu.hidden = false;
      void menu.offsetWidth;
      menu.classList.add("is-open");
      document.body.classList.add("menu-open");
      openBtn.setAttribute("aria-expanded", "true");
      document.addEventListener("keydown", onKey);
      if (closeBtn) closeBtn.focus();
    }
    function close() {
      menu.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      openBtn.setAttribute("aria-expanded", "false");
      document.removeEventListener("keydown", onKey);
      window.setTimeout(function () { menu.hidden = true; }, 320);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    menu.addEventListener("click", function (e) {
      if (e.target === menu) close();
      var link = e.target.closest("[data-menu-link]");
      if (link) { close(); }
    });
    window.HEPEGO.closeMenu = close;
  }

  /* ---------- marquee (largura dinâmica: garante loop sem gap em qualquer tela) ---------- */
  function initMarquee() {
    var mq = $("[data-marquee]");
    if (!mq) return;
    var group = $("[data-marquee-group]", mq);
    var track = $("[data-marquee-track]", mq);
    if (!group || !track) return;
    var phrases = [
      "Artesanal desde o primeiro forno", "Feito em Piraquara", "Fornadas pequenas",
      "Recheio generoso", "20 sabores no cardápio"
    ];
    var unitHTML = phrases.map(function (p) {
      return '<span class="marquee__item">' + p + '</span>' +
        '<img class="marquee__sep" src="assets/img/brand/simbolo-gold.png" alt="" width="14" height="14">';
    }).join("");
    var SPEED = 65; // px/s — velocidade constante independente da largura de tela

    function build() {
      // remove clones de builds anteriores (mantém só o grupo original)
      $$(".marquee__group", track).forEach(function (el) {
        if (!el.hasAttribute("data-marquee-group")) el.remove();
      });
      group.innerHTML = "";
      // repete as frases até o grupo cobrir a viewport com folga (evita gap no loop)
      var vw = document.documentElement.clientWidth || window.innerWidth;
      var target = Math.max(vw, 320) * 1.25;
      var guard = 0;
      while (group.scrollWidth < target && guard < 24) {
        group.insertAdjacentHTML("beforeend", unitHTML);
        guard++;
      }
      // clone único e idêntico: translateX(-50%) fica matematicamente exato
      var clone = group.cloneNode(true);
      clone.removeAttribute("data-marquee-group");
      track.appendChild(clone);
      var w = group.scrollWidth;
      if (w > 0) track.style.animationDuration = (w / SPEED) + "s";
    }
    build();
    if (reduceMotion) mq.classList.add("is-paused");
    var resizeTimer;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 220);
    });
  }

  /* ---------- Lenis (desktop, pointer fino, sem reduced-motion) ---------- */
  function initLenis() {
    var finePointer = window.matchMedia("(pointer: fine)").matches;
    var wide = window.matchMedia("(min-width: 900px)").matches;
    if (reduceMotion || !finePointer || !wide || typeof window.Lenis !== "function") return null;
    var lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
    if (typeof window.gsap !== "undefined") {
      if (typeof window.ScrollTrigger !== "undefined") {
        lenis.on("scroll", window.ScrollTrigger.update);
      }
      window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }
    window.HEPEGO.lenis = lenis;
    return lenis;
  }

  /* ---------- âncoras suaves (mesma página) ---------- */
  function initAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href || href.indexOf("#") === -1) return;
      // resolve destino
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.pathname !== location.pathname || !url.hash) return;
      var target = document.querySelector(url.hash);
      if (!target) return;
      e.preventDefault();
      var behavior = reduceMotion ? "auto" : "smooth";
      if (window.HEPEGO.lenis) {
        window.HEPEGO.lenis.scrollTo(target, { offset: -70 });
      } else {
        target.scrollIntoView({ behavior: behavior, block: "start" });
      }
      if (history.replaceState) history.replaceState(null, "", url.hash);
    });
  }

  /* ---------- WhatsApp / IG / iFood delegados ---------- */
  function initTrackedLinks() {
    document.addEventListener("click", function (e) {
      var wa = e.target.closest("[data-wa]");
      if (wa) { e.preventDefault(); directWhatsApp(wa.getAttribute("data-wa")); return; }
      var ig = e.target.closest("[data-ig-link]");
      if (ig) { trackEvent("instagram_click", {}); return; }
      var fo = e.target.closest("[data-ifood]");
      if (fo) { trackEvent("ifood_click", {}); return; }
    });
  }

  /* ---------- init ---------- */
  function init() {
    applyLinks();
    applyIfood();
    initHeader();
    initMenu();
    initMarquee();
    initLenis();
    initAnchors();
    initTrackedLinks();
    trackEvent("page_view", { url: location.href, referrer: document.referrer });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
