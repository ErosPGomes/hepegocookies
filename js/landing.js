/* landing.js — Hépego · Site 2.0
   Conteúdo da vitrine (sabores/juninos) + intro + coreografia GSAP/ScrollTrigger/Swiper.
   Clássico, defer, depois de shared.js. Conteúdo é construído SEM depender de GSAP;
   as animações só escondem elementos via JS (gsap.set) antes de animar. */
(function () {
  "use strict";

  var CFG = window.HEPEGO_CONFIG || {};
  var MENU = window.HEPEGO_MENU || [];
  var track = (window.HEPEGO && window.HEPEGO.track) || function () {};
  var reduceMotion = window.HEPEGO ? window.HEPEGO.reduceMotion
    : window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var byId = {};
  MENU.forEach(function (i) { byId[i.id] = i; });
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function money(n) { return "R$ " + n.toFixed(2).replace(".", ","); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function pills(item) {
    var out = "";
    if (item.special) out += '<span class="pill pill-gold">Especial</span>';
    if (item.seasonal) out += '<span class="pill pill-fest">Festivo · Julho</span>';
    return out;
  }
  /* emblema oficial (coroa+joia) em vetor puro — mesmo path do header/footer.
     Substitui os antigos ícones simbolo-*.png (logo antigo, floco de neve). */
  var CROWN_SVG = '<svg class="crown-mark" viewBox="44 4 60 40" aria-hidden="true" focusable="false">' +
    '<path d="M73.47,33.81c-.61,0-1.14-.39-1.31-.98l-5.76-19.15,7.07-6.41,7.06,6.41-5.75,19.15c-.18.58-.7.98-1.31.98ZM69.38,14.51l4.09,13.6,4.09-13.6-4.09-3.71-4.09,3.71Z"/>' +
    '<path d="M90.88,41.41h-34.82l-9.72-21.58h11.81l5.55,12.34h19.54l5.55-12.34h11.81l-9.72,21.58ZM57.75,38.8h31.44l7.36-16.35h-6.08l-5.55,12.34h-22.92l-5.55-12.34h-6.08l7.36,16.35Z"/></svg>';

  /* ---------- sabores (carrossel) ---------- */
  function buildFeatured() {
    var trackEl = $("[data-sabores-track]");
    if (!trackEl) return;
    var ids = CFG.featured || [];
    var html = ids.map(function (id) {
      var it = byId[id];
      if (!it) return "";
      return '<div class="swiper-slide flavor-slide">' +
        '<article class="flavor-card">' +
        '<div class="flavor-figure">' +
        '<img src="' + it.img + '" alt="Cookie ' + esc(it.name) + ' da Hépego" width="480" height="480" loading="lazy" decoding="async">' +
        '<div class="flavor-pills">' + pills(it) + '</div></div>' +
        '<div class="flavor-body">' +
        '<h3 class="flavor-name serif">' + esc(it.name) + '</h3>' +
        '<p class="flavor-blurb">' + esc(it.blurb) + '</p>' +
        '<div class="flavor-line"><span class="leader-dots" aria-hidden="true"></span>' +
        '<span class="flavor-price">' + money(it.price) + '</span></div>' +
        '<a class="flavor-cta" href="cardapio.html?add=' + it.id + '" data-featured="' + it.id + '">Pedir este →</a>' +
        '</div></article></div>';
    }).join("");
    html += '<div class="swiper-slide flavor-slide"><a class="flavor-card flavor-card--end" href="cardapio.html">' +
      CROWN_SVG +
      '<span class="end-cta">Ver os 20 sabores →</span></a></div>';
    trackEl.innerHTML = html;

    document.addEventListener("click", function (e) {
      var f = e.target.closest("[data-featured]");
      if (f) track("featured_click", { item_id: f.getAttribute("data-featured") });
    });
  }

  /* ---------- juninos (banner) ---------- */
  function buildJuninos() {
    var list = $("[data-junino-list]");
    if (!list) return;
    var ids = (CFG.seasonal && CFG.seasonal.ids) || [];
    list.innerHTML = ids.map(function (id) {
      var it = byId[id];
      if (!it) return "";
      return '<li class="junino-row">' +
        '<span class="junino-bullet">' + CROWN_SVG + '</span>' +
        '<span class="junino-name">' + esc(it.name) + '</span>' +
        '<span class="junino-price">' + money(it.price) + '</span>' +
        '<span class="junino-blurb">' + esc(it.blurb) + '</span>' +
        '</li>';
    }).join("");
    var cta = $("[data-seasonal-cta]");
    if (cta) cta.addEventListener("click", function () { track("seasonal_click", {}); });
  }

  /* ---------- Swiper ---------- */
  var saboresSwiper = null;
  function initSwiper() {
    var el = $("[data-sabores-swiper]");
    if (!el) return;
    if (typeof window.Swiper !== "function") {
      document.documentElement.classList.add("no-swiper");
      return;
    }
    saboresSwiper = new window.Swiper(el, {
      slidesPerView: 1.15,
      spaceBetween: 16,
      grabCursor: true,
      a11y: { enabled: true },
      keyboard: { enabled: true },
      navigation: { prevEl: "[data-sabores-prev]", nextEl: "[data-sabores-next]" },
      pagination: { el: "[data-sabores-progress]", type: "progressbar" },
      breakpoints: {
        700: { slidesPerView: 2.4, spaceBetween: 18 },
        1100: { slidesPerView: 3.4, spaceBetween: 22 }
      }
    });
  }

  /* ---------- intro de marca ---------- */
  function runIntro() {
    if (!CFG.intro) return;
    if (reduceMotion) return;
    var seen;
    try { seen = sessionStorage.getItem("hepego_intro"); } catch (e) { seen = "1"; }
    if (seen) return;
    if (typeof window.gsap === "undefined") return;
    try { sessionStorage.setItem("hepego_intro", "1"); } catch (e) {}

    var overlay = document.createElement("div");
    overlay.className = "brand-intro";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = CROWN_SVG;
    var mark = overlay.querySelector(".crown-mark");
    document.body.appendChild(overlay);

    var gsap = window.gsap;
    gsap.set(mark, { scale: 0.92, opacity: 0 });
    var tl = gsap.timeline({
      onComplete: function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    });
    tl.to(mark, { opacity: 1, scale: 1, duration: 0.34, ease: "power2.out" })
      .to(overlay, { opacity: 0, duration: 0.3, ease: "power1.inOut" }, "+=0.06");
  }

  /* ---------- hero timeline ---------- */
  function initHero() {
    var gsap = window.gsap;
    var kicker = $$('[data-hero]');
    var lines = $$('[data-hero-line]');
    var photos = $$('[data-hero-photo]');

    /* y:0 zera o translateY(110%) do pré-hide CSS (o GSAP o parseia como
       componente px separado do yPercent — sem isso a linha ficaria presa). */
    gsap.set(kicker, { opacity: 0, y: 14 });
    gsap.set(lines, { y: 0, yPercent: 110 });
    gsap.set(photos, { opacity: 0, scale: 1.06 });

    var tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.to(kicker[0], { opacity: 1, y: 0, duration: 0.5 })
      .to(lines, { yPercent: 0, duration: 0.9, stagger: 0.09 }, "-=0.2")
      .to(kicker.slice(1), { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, "-=0.5")
      .to(photos, { opacity: 1, scale: 1, duration: 0.9, stagger: 0.12 }, "-=0.7");
  }

  /* ---------- reveals de seção (checagem geométrica direta no scroll) ----------
     ScrollTrigger.batch cacheia posições em px no momento da criação; se algo abaixo
     ainda reflui depois, o "once:true" pode nunca disparar de novo e o elemento fica
     preso em opacity:0 pra sempre — foi exatamente o bug visto (conteúdo inteiro
     sumindo abaixo do 1º reveal). IntersectionObserver seria o substituto óbvio, mas
     não é usado aqui: getBoundingClientRect() no listener de scroll (com throttle via
     rAF) é mais simples e não depende de nenhum cache de posição — cada tick recalcula
     do zero contra o viewport atual, então não existe estado antigo pra ficar preso. */
  function initReveals() {
    var gsap = window.gsap;
    var els = $$('[data-reveal]');
    if (!els.length) return;
    gsap.set(els, { opacity: 0, y: 28 });
    var pending = els.slice();

    function check() {
      var vh = document.documentElement.clientHeight || window.innerHeight;
      var stillPending = [], toReveal = [];
      pending.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.9 && r.bottom > 0) toReveal.push(el);
        else stillPending.push(el);
      });
      pending = stillPending;
      if (toReveal.length) {
        gsap.to(toReveal, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 });
      }
      if (!pending.length) {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      }
    }
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { check(); ticking = false; });
    }
    check(); // revela de cara o que já está visível no primeiro paint
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // rede de segurança: nunca deixa nada preso invisível, mesmo se o scroll não
    // disparar como esperado em algum navegador/dispositivo específico.
    window.setTimeout(function () {
      if (pending.length) gsap.to(pending, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
    }, 5000);
  }

  /* ---------- parallax ---------- */
  function initParallax() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    $$('[data-parallax]').forEach(function (el) {
      var amt = parseFloat(el.getAttribute("data-parallax")) || -8;
      gsap.to(el, {
        yPercent: amt,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true }
      });
    });
  }

  /* ---------- fio dourado da anatomia (desktop) ----------
     Posição HORIZONTAL é 100% CSS (centro da coluna fixa de 44px do grid — ver
     .anatomia-item/.anatomia-thread em landing.css), não depende de medição JS
     nem de métrica de fonte. Só a extensão VERTICAL (topo/base) é medida, porque
     a altura dos itens varia com o texto. Defesa extra contra qualquer folga:
     cada número tem fundo opaco (--cream) por cima do fio — mesmo que a linha
     fique 1-2px fora do lugar, ela nunca aparece por cima do dígito. */
  function initAnatomiaThread() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    if (!window.matchMedia("(min-width: 880px)").matches) return;
    var list = $(".anatomia-list");
    if (!list) return;
    var nums = $$(".anatomia-num", list);
    if (nums.length < 2) return;
    list.style.position = "relative";
    var thread = document.createElement("span");
    thread.className = "anatomia-thread";
    thread.setAttribute("aria-hidden", "true");
    list.appendChild(thread);

    function place() {
      var lr = list.getBoundingClientRect();
      var first = nums[0].getBoundingClientRect();
      var last = nums[nums.length - 1].getBoundingClientRect();
      thread.style.top = (first.top + first.height / 2 - lr.top) + "px";
      thread.style.bottom = (lr.bottom - (last.top + last.height / 2)) + "px";
    }
    place();
    gsap.set(thread, { scaleY: 0 });
    gsap.to(thread, {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: list, start: "top 78%", end: "bottom 60%", scrub: true, onRefresh: place }
    });
    window.addEventListener("resize", place);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        place();
        if (ST) ST.refresh();
      });
    }
  }

  /* ---------- sabores juninos: crossfade + zoom lento (Ken Burns) ---------- */
  function initJulhoCycle() {
    var frame = $("[data-julho-frame]");
    if (!frame) return;
    var slides = $$(".julho-slide", frame);
    if (slides.length < 2 || !window.gsap || reduceMotion) return; // sem JS/GSAP: 1ª imagem fica estática (.is-active)
    var gsap = window.gsap;
    var HOLD = 4.5, FADE = 1.1;
    gsap.set(slides, { opacity: 0, scale: 1 });
    gsap.set(slides[0], { opacity: 1 });
    function cycle(i) {
      var current = slides[i];
      var next = slides[(i + 1) % slides.length];
      gsap.set(next, { scale: 1 });
      gsap.to(current, { scale: 1.08, duration: HOLD + FADE, ease: "none" });
      gsap.delayedCall(HOLD, function () {
        gsap.to(current, { opacity: 0, duration: FADE, ease: "power1.inOut" });
        gsap.to(next, {
          opacity: 1, duration: FADE, ease: "power1.inOut",
          onComplete: function () {
            gsap.set(current, { scale: 1 });
            cycle((i + 1) % slides.length);
          }
        });
      });
    }
    cycle(0);
  }

  /* ---------- sabores: nudge lento no carrossel (guia p/ arrastar) ----------
     Usava IntersectionObserver antes; trocado pelo mesmo padrão scroll+rAF dos
     reveals (initReveals) porque o IO se mostrou não confiável em alguns
     ambientes/dispositivos — o carrossel parava de dar o nudge silenciosamente. */
  function initSaboresHint() {
    var section = $("#sabores");
    var swiperEl = $("[data-sabores-swiper]");
    if (!section || !swiperEl || reduceMotion) return;
    var done = false;
    function run() {
      if (done) return;
      done = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.setTimeout(function () {
        var inst = saboresSwiper;
        if (!inst) return;
        inst.slideTo(1, 1500);
        window.setTimeout(function () { inst.slideTo(0, 1500); }, 2200);
      }, 900);
    }
    var ticking = false;
    function check() {
      var vh = document.documentElement.clientHeight || window.innerHeight;
      var r = section.getBoundingClientRect();
      if (r.top < vh * 0.6 && r.bottom > 0) run();
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { check(); ticking = false; });
    }
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  /* ---------- init ---------- */
  function init() {
    // 1) conteúdo (sempre, independente de GSAP)
    buildFeatured();
    buildJuninos();
    initSwiper();
    initSaboresHint();

    // 2) animação (só se GSAP presente e sem reduced-motion)
    var animate = typeof window.gsap !== "undefined" && !reduceMotion;
    if (animate && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
    }
    if (animate) {
      runIntro();
      initHero();
      initJulhoCycle();
      initReveals(); // IntersectionObserver — independente de ScrollTrigger
      if (window.ScrollTrigger) {
        initParallax();
        initAnatomiaThread();
      }
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
