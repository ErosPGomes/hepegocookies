/* cardapio.js — Hépego · Site 2.0 · motor do carrinho/sheet/checkout/filtros.
   Clássico, defer, depois de shared.js. Engine da v1 revisada. */
(function () {
  "use strict";

  var CFG = window.HEPEGO_CONFIG || {};
  var MENU = window.HEPEGO_MENU || [];
  var track = (window.HEPEGO && window.HEPEGO.track) || function () {};
  var waNumber = (window.HEPEGO && window.HEPEGO.waNumber) || function () { return (CFG.whatsapp || "").replace(/\D/g, ""); };
  var reduceMotion = window.HEPEGO ? window.HEPEGO.reduceMotion
    : window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var STORE_KEY = "hepego_cart_v1";
  var MIN_ORDER = 20;
  var byId = {};
  MENU.forEach(function (i) { byId[i.id] = i; });

  var cart = {};
  var funnelStarted = false;
  var sheetOpen = false, lastFocus = null;
  var currentFilter = "todos";
  var cardFlowSelected = false;
  var reopenSheetAfterConsent = false;
  var checkoutBusy = false;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function money(n) { return "R$ " + n.toFixed(2).replace(".", ","); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function totalQty() { var t = 0; for (var k in cart) t += cart[k]; return t; }
  function totalPrice() { var t = 0; for (var k in cart) t += cart[k] * byId[k].price; return t; }
  function meetsMinimum() { return totalPrice() >= MIN_ORDER; }

  /* ---------- persistência ---------- */
  function save() { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch (e) {} }
  function load() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return false;
      var obj = JSON.parse(raw), has = false;
      for (var k in obj) { if (byId[k] && obj[k] > 0) { cart[k] = obj[k]; has = true; } }
      return has;
    } catch (e) { return false; }
  }

  /* ---------- pílulas / controles ---------- */
  function pills(item) {
    var out = "";
    if (item.special) out += '<span class="pill pill-gold">Especial</span>';
    if (item.seasonal) out += '<span class="pill pill-fest">Festivo · Julho</span>';
    return out;
  }
  function controlHTML(item) {
    var q = cart[item.id] || 0, n = esc(item.name);
    if (q > 0) {
      return '<div class="stepper" data-ctl="' + item.id + '">' +
        '<button type="button" class="stp stp-minus" data-act="dec" data-id="' + item.id +
        '" aria-label="Remover um ' + n + '">–</button>' +
        '<span class="stp-qty" aria-live="polite">' + q + '</span>' +
        '<button type="button" class="stp stp-plus" data-act="inc" data-id="' + item.id +
        '" aria-label="Adicionar um ' + n + '">+</button></div>';
    }
    return '<div class="ctl-wrap" data-ctl="' + item.id + '">' +
      '<button type="button" class="btn-add" data-act="add" data-id="' + item.id +
      '" aria-label="Adicionar um ' + n + '">Adicionar</button></div>';
  }
  function syncControls(id) {
    var item = byId[id];
    var q = cart[id] || 0;
    $$('[data-ctl="' + id + '"]').forEach(function (el) {
      var isStepper = el.classList.contains("stepper");
      if (q > 0 && isStepper) {
        // stepper continua stepper: só atualiza a quantidade (preserva DOM e foco)
        var qty = el.querySelector(".stp-qty");
        if (qty) qty.textContent = q;
        return;
      }
      // transição de forma (Adicionar <-> stepper): recria preservando o foco
      var hadFocus = el.contains(document.activeElement);
      var prevAct = hadFocus && document.activeElement.getAttribute ?
        document.activeElement.getAttribute("data-act") : null;
      var wrap = document.createElement("div");
      wrap.innerHTML = controlHTML(item);
      var next = wrap.firstChild;
      el.parentNode.replaceChild(next, el);
      if (hadFocus) {
        var want = q > 0 ? (prevAct === "dec" ? "dec" : "inc") : "add";
        var target = next.querySelector('[data-act="' + want + '"]') || next.querySelector("[data-act]");
        if (target) target.focus();
      }
    });
  }

  /* ---------- render grid ---------- */
  function menuCard(item) {
    return '<article class="mcard" id="card-' + item.id + '" data-card="' + item.id + '">' +
      '<div class="mthumb"><img src="' + item.img + '" alt="' + esc(item.name) +
      ' · Hépego" width="480" height="480" loading="lazy" decoding="async">' +
      '<div class="mpills">' + pills(item) + '</div></div>' +
      '<div class="mbody">' +
      '<h3 class="mname">' + esc(item.name) + '</h3>' +
      '<p class="mblurb">' + esc(item.blurb) + '</p>' +
      '<div class="mline"><span class="dots" aria-hidden="true"></span>' +
      '<span class="mprice">' + money(item.price) + '</span></div>' +
      controlHTML(item) + '</div></article>';
  }
  function renderMenu() {
    var grid = $("[data-menu-grid]");
    if (!grid) return;
    var groups = [
      { key: "biscoitos", title: "Biscoitos artesanais" },
      { key: "premium", title: "Cookies premium" }
    ];
    var html = "";
    groups.forEach(function (g) {
      var items = MENU.filter(function (i) { return i.section === g.key; });
      if (!items.length) return;
      html += '<h3 class="subsec" data-subsec="' + g.key + '"><span>' + g.title + '</span></h3>';
      html += items.map(menuCard).join("");
    });
    grid.innerHTML = html;
  }

  /* ---------- filtros ---------- */
  function matchFilter(item, f) {
    if (f === "todos") return true;
    if (f === "especiais") return !!item.special;
    if (f === "festivo") return !!item.seasonal;
    if (f === "biscoitos") return item.section === "biscoitos";
    return true;
  }
  function applyFilter(f, opts) {
    opts = opts || {};
    currentFilter = f;
    var grid = $("[data-menu-grid]");
    function paint() {
      var visibleBySection = { biscoitos: 0, premium: 0 };
      var total = 0;
      MENU.forEach(function (item) {
        var card = $('[data-card="' + item.id + '"]');
        if (!card) return;
        var show = matchFilter(item, f);
        card.classList.toggle("is-hidden", !show);
        if (show) { visibleBySection[item.section]++; total++; }
      });
      // esconde subseção sem itens visíveis
      $$('[data-subsec]').forEach(function (h) {
        var key = h.getAttribute("data-subsec");
        h.classList.toggle("is-hidden", visibleBySection[key] === 0);
      });
      var empty = $("[data-empty]");
      if (empty) empty.hidden = total > 0;
    }
    // chips estado + roving tabindex (padrão radiogroup)
    $$("[data-filter]").forEach(function (chip) {
      var on = chip.getAttribute("data-filter") === f;
      chip.classList.toggle("is-active", on);
      chip.setAttribute("aria-checked", on ? "true" : "false");
      chip.tabIndex = on ? 0 : -1;
    });
    if (grid && !reduceMotion && !opts.instant) {
      grid.style.transition = "opacity .2s ease";
      grid.style.opacity = "0";
      window.setTimeout(function () {
        paint();
        grid.style.opacity = "1";
        updateFilterLabels();
      }, 200);
    } else {
      paint();
      updateFilterLabels();
    }
    if (!opts.silent) track("filter_change", { filter: f });
  }
  function updateFilterLabels() {
    $$("[data-filter]").forEach(function (chip) {
      var f = chip.getAttribute("data-filter");
      var count = MENU.filter(function (i) { return matchFilter(i, f); }).length;
      var base = chip.textContent.replace(/\s*·\s*\d+\s*sabores?$/, "").trim();
      chip.setAttribute("aria-label", base + ", " + count + (count === 1 ? " sabor" : " sabores"));
    });
  }

  /* ---------- barra fixa + header cta ---------- */
  function updateCartUI() {
    var q = totalQty(), price = totalPrice();
    var bar = $("[data-orderbar]");
    if (bar) {
      if (q > 0 && !sheetOpen) {
        bar.hidden = false;
        $("[data-bar-count]").textContent = q + (q === 1 ? " item" : " itens");
        $("[data-bar-total]").textContent = money(price);
        var barMinimum = $("[data-bar-minimum]");
        if (barMinimum) {
          barMinimum.textContent = meetsMinimum() ? "Pedido mínimo atingido" : "Faltam " + money(MIN_ORDER - price);
          barMinimum.classList.toggle("is-ready", meetsMinimum());
        }
      } else { bar.hidden = true; }
    }
    var hcta = $(".header-cta[data-cart-open]");
    var badge = $("[data-cart-badge]");
    if (hcta) {
      hcta.hidden = q === 0;
      hcta.setAttribute("aria-label", "Ver pedido, " + q + (q === 1 ? " item" : " itens"));
    }
    if (badge) badge.textContent = q;
  }

  /* ---------- sheet ---------- */
  function sheetItemsHTML() {
    var rows = "";
    MENU.forEach(function (item) {
      var q = cart[item.id] || 0;
      if (q <= 0) return;
      var n = esc(item.name);
      rows += '<li class="srow" data-id="' + item.id + '">' +
        '<div class="srow-info"><span class="srow-name">' + n + '</span>' +
        '<span class="srow-sub">' + money(item.price * q) + '</span></div>' +
        '<div class="stepper" data-ctl="' + item.id + '">' +
        '<button type="button" class="stp stp-minus" data-act="dec" data-id="' + item.id +
        '" aria-label="Remover um ' + n + '">–</button>' +
        '<span class="stp-qty" aria-live="polite">' + q + '</span>' +
        '<button type="button" class="stp stp-plus" data-act="inc" data-id="' + item.id +
        '" aria-label="Adicionar um ' + n + '">+</button></div></li>';
    });
    return rows;
  }
  function renderSheet() {
    var list = $("[data-sheet-items]");
    if (list) {
      var ids = MENU.filter(function (i) { return (cart[i.id] || 0) > 0; })
        .map(function (i) { return i.id; });
      var existing = $$(".srow", list).map(function (li) { return li.getAttribute("data-id"); });
      var same = ids.length === existing.length &&
        ids.every(function (v, i) { return v === existing[i]; });
      if (same) {
        // mesmo conjunto de linhas: atualiza qty/subtotal em lugar (preserva DOM e foco)
        ids.forEach(function (id) {
          var li = list.querySelector('.srow[data-id="' + id + '"]');
          if (!li) return;
          var q = cart[id];
          var qty = li.querySelector(".stp-qty");
          if (qty) qty.textContent = q;
          var sub = li.querySelector(".srow-sub");
          if (sub) sub.textContent = money(byId[id].price * q);
        });
      } else {
        // linhas entraram/saíram: reconstrói devolvendo o foco ao equivalente
        var hadFocus = list.contains(document.activeElement);
        var focusId = hadFocus && document.activeElement.getAttribute ?
          document.activeElement.getAttribute("data-id") : null;
        var focusAct = hadFocus && document.activeElement.getAttribute ?
          document.activeElement.getAttribute("data-act") : null;
        list.innerHTML = sheetItemsHTML();
        if (hadFocus) {
          var t = focusId ? list.querySelector('[data-id="' + focusId + '"][data-act="' + focusAct + '"]') : null;
          if (!t) t = list.querySelector("[data-act]") || $("[data-sheet-close]");
          if (t) t.focus();
        }
      }
    }
    var tot = $("[data-sheet-total]");
    var price = totalPrice();
    if (tot) tot.textContent = money(price);
    var minimum = $("[data-sheet-minimum]");
    if (minimum) {
      if (price === 0) {
        minimum.textContent = "Pedido mínimo de " + money(MIN_ORDER) + ".";
        minimum.classList.remove("is-ready");
      } else if (!meetsMinimum()) {
        minimum.textContent = "Faltam " + money(MIN_ORDER - price) + " para atingir o pedido mínimo de " + money(MIN_ORDER) + ".";
        minimum.classList.remove("is-ready");
      } else {
        minimum.textContent = "Pedido mínimo atingido.";
        minimum.classList.add("is-ready");
      }
    }
    var send = $("[data-sheet-send]");
    var whatsapp = $("[data-sheet-whatsapp]");
    var cardSwitch = $("[data-sheet-card]");
    var micro = $("[data-sheet-micro]");
    if (send) {
      send.hidden = !cardFlowSelected;
      send.disabled = totalQty() === 0 || !meetsMinimum() || checkoutBusy;
      send.setAttribute("aria-disabled", send.disabled ? "true" : "false");
    }
    if (whatsapp) {
      whatsapp.hidden = false;
      whatsapp.className = cardFlowSelected ? "sheet-switch" : "btn btn--wa btn--lg";
      whatsapp.textContent = cardFlowSelected ? "Prefiro finalizar direto no WhatsApp" : "Finalizar pedido no WhatsApp";
      whatsapp.disabled = totalQty() === 0 || !meetsMinimum() || checkoutBusy;
    }
    if (cardSwitch) cardSwitch.hidden = cardFlowSelected;
    if (micro) {
      micro.textContent = cardFlowSelected
        ? "Produtos pagos pela InfinitePay. Frete combinado depois e pago via Pix."
        : "O valor do frete será combinado no WhatsApp.";
    }
  }
  function focusablesIn(root) {
    return $$('button:not([disabled]), [href], input, textarea, [tabindex]:not([tabindex="-1"])', root)
      .filter(function (el) { return el.offsetParent !== null; });
  }
  function onSheetKey(e) {
    if (e.key === "Escape") { e.preventDefault(); closeSheet(); return; }
    if (e.key !== "Tab") return;
    var sheet = $("[data-sheet]");
    var f = focusablesIn(sheet);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openSheet() {
    if (sheetOpen || totalQty() === 0) return;
    // exclusão mútua com o menu mobile (um overlay modal por vez)
    if (window.HEPEGO && typeof window.HEPEGO.closeMenu === "function") window.HEPEGO.closeMenu();
    renderSheet();
    lastFocus = document.activeElement;
    var sheet = $("[data-sheet]"), bd = $("[data-backdrop]");
    bd.hidden = false; sheet.hidden = false;
    void sheet.offsetWidth;
    document.body.classList.add("sheet-on");
    sheetOpen = true;
    updateCartUI();
    track("cart_view", { items_count: totalQty(), cart_total: totalPrice() });
    var close = $("[data-sheet-close]");
    if (close) close.focus();
    document.addEventListener("keydown", onSheetKey);
  }
  function closeSheet() {
    if (!sheetOpen) return;
    document.body.classList.remove("sheet-on");
    var sheet = $("[data-sheet]"), bd = $("[data-backdrop]");
    sheetOpen = false;
    document.removeEventListener("keydown", onSheetKey);
    window.setTimeout(function () { sheet.hidden = true; bd.hidden = true; }, 300);
    updateCartUI();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- mutações ---------- */
  function setQty(id, q, origin) {
    if (!byId[id]) return;
    var prev = cart[id] || 0;
    if (q <= 0) delete cart[id]; else cart[id] = q;
    save();
    syncControls(id);
    updateCartUI();
    if (sheetOpen) renderSheet();
    var tp = totalPrice();
    if (q > prev) {
      if (!funnelStarted) { funnelStarted = true; track("funnel_start", { item_id: id }); }
      var payload = { item_id: id, qty: q, cart_total: tp };
      if (origin) payload.origin = origin;
      track("add_to_cart", payload);
    } else if (q < prev) {
      track("remove_from_cart", { item_id: id, qty: q, cart_total: tp });
    }
  }

  /* ---------- entrega + checkout ---------- */
  function fieldValue(id) { return (($(id) && $(id).value) || "").trim(); }
  function deliveryFormData() {
    return {
      dropoff_name: fieldValue("#f-nome"),
      dropoff_phone: fieldValue("#f-phone"),
      dropoff_address: {
        cep: fieldValue("#f-cep"),
        street: fieldValue("#f-street"),
        number: fieldValue("#f-number"),
        complement: fieldValue("#f-complement"),
        neighborhood: fieldValue("#f-neighborhood"),
        city: fieldValue("#f-city"),
        state: fieldValue("#f-state").toUpperCase()
      }
    };
  }
  function setCheckoutStatus(message, isError) {
    var status = $("[data-checkout-status]");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", !!isError);
  }
  function validateDeliveryForm() {
    var ids = ["#f-nome", "#f-phone", "#f-cep", "#f-street", "#f-number", "#f-neighborhood", "#f-city", "#f-state", "#f-email"];
    for (var i = 0; i < ids.length; i++) {
      var input = $(ids[i]);
      if (input && !input.checkValidity()) { input.reportValidity(); input.focus(); return false; }
    }
    if (fieldValue("#f-cep").replace(/\D/g, "").length !== 8) {
      setCheckoutStatus("Informe um CEP com 8 números.", true); $("#f-cep").focus(); return false;
    }
    if (fieldValue("#f-state").length !== 2) {
      setCheckoutStatus("Informe a UF com 2 letras.", true); $("#f-state").focus(); return false;
    }
    return true;
  }
  async function apiPost(path, body) {
    var response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    var data = {};
    try { data = await response.json(); } catch (e) {}
    if (!response.ok) throw new Error(data.error || "Não foi possível concluir. Tente novamente.");
    return data;
  }
  function checkoutItems() {
    return MENU.filter(function (item) { return (cart[item.id] || 0) > 0; }).map(function (item) {
      return { id: item.id, description: item.name, quantity: cart[item.id], price: Math.round(item.price * 100) };
    });
  }
  function newOrderNsu() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return "hep_" + window.crypto.randomUUID().replace(/-/g, "");
    return "hep_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 14);
  }
  async function sendOrder(btn) {
    if (!meetsMinimum() || !validateDeliveryForm() || checkoutBusy) { renderSheet(); return; }
    if (!cardFlowSelected) { openCardConsent(true); return; }
    checkoutBusy = true;
    setCheckoutStatus("Preparando o pagamento seguro…", false);
    if (btn) { btn.disabled = true; btn.classList.add("is-loading"); }
    try {
      var form = deliveryFormData();
      var result = await apiPost("/api/checkout", {
        order_nsu: newOrderNsu(),
        checkout_mode: "card_whatsapp_freight",
        freight_terms_accepted: true,
        items: checkoutItems(),
        customer: { name: form.dropoff_name, phone_number: form.dropoff_phone, email: fieldValue("#f-email") },
        dropoff_address: form.dropoff_address,
        notes: fieldValue("#f-obs")
      });
      track("funnel_complete", { items_count: totalQty(), cart_total: totalPrice(), payment: "InfinitePay", shipping_fee: 0 });
      window.location.href = result.url;
    } catch (error) {
      setCheckoutStatus(error.message, true);
      checkoutBusy = false;
      if (btn) { btn.disabled = false; btn.classList.remove("is-loading"); }
      renderSheet();
    }
  }

  /* ---------- alternativa WhatsApp ---------- */
  function buildOrderMessage() {
    var lines = ["*Pedido Hépego* 🍪", ""];
    MENU.forEach(function (item) {
      var q = cart[item.id] || 0;
      if (q <= 0) return;
      lines.push("• " + q + "x " + item.name + " — " + money(item.price * q));
    });
    lines.push("");
    lines.push("*Subtotal:* " + money(totalPrice()));
    var nome = fieldValue("#f-nome");
    if (nome) lines.push("*Cliente:* " + nome);
    var phone = fieldValue("#f-phone");
    if (phone) lines.push("*Telefone:* " + phone);
    var address = deliveryFormData().dropoff_address;
    if (address.street) {
      lines.push("*Entrega:* " + address.street + ", " + address.number +
        (address.complement ? " · " + address.complement : "") + " · " + address.neighborhood +
        " · " + address.city + "/" + address.state + " · CEP " + address.cep);
    }
    var obs = fieldValue("#f-obs");
    if (obs) lines.push("*Obs:* " + obs);
    lines.push("");
    lines.push("*Frete:* a combinar pelo WhatsApp");
    return lines.join("\n");
  }
  function sendWhatsApp(btn) {
    if (totalQty() === 0 || !meetsMinimum() || !validateDeliveryForm()) { renderSheet(); return; }
    track("funnel_complete", { items_count: totalQty(), cart_total: totalPrice(), payment: "WhatsApp" });
    var url = "https://wa.me/" + waNumber() + "?text=" + encodeURIComponent(buildOrderMessage());
    if (btn) {
      btn.disabled = true; btn.classList.add("is-loading");
      window.setTimeout(function () { btn.disabled = false; btn.classList.remove("is-loading"); }, 2000);
    }
    window.open(url, "_blank", "noopener");
  }

  /* ---------- consentimento cartão + frete separado ---------- */
  function syncCardBanner() {
    var button = $("[data-card-flow-start]");
    if (!button) return;
    button.textContent = cardFlowSelected ? "Cartão selecionado" : "Quero pagar com cartão";
    button.setAttribute("aria-pressed", cardFlowSelected ? "true" : "false");
  }
  function openCardConsent(fromSheet) {
    var dialog = $("[data-card-consent]");
    if (!dialog) return;
    reopenSheetAfterConsent = !!fromSheet || totalQty() > 0;
    var show = function () {
      var check = $("[data-card-consent-check]");
      var proceed = $("[data-card-consent-continue]");
      if (check) check.checked = false;
      if (proceed) proceed.disabled = true;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      if (check) check.focus();
      track("card_terms_view", { cart_total: totalPrice() });
    };
    if (sheetOpen) { closeSheet(); window.setTimeout(show, 320); }
    else show();
  }
  function acceptCardConsent() {
    var dialog = $("[data-card-consent]");
    var check = $("[data-card-consent-check]");
    if (!dialog || !check || !check.checked) return;
    cardFlowSelected = true;
    syncCardBanner();
    track("card_terms_accept", { cart_total: totalPrice() });
    if (typeof dialog.close === "function") dialog.close("accepted");
    else dialog.removeAttribute("open");
    if (reopenSheetAfterConsent && totalQty() > 0) window.setTimeout(openSheet, 80);
    else {
      var grid = $("[data-menu-grid]");
      if (grid) grid.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
  }

  /* ---------- snackbar ---------- */
  function showSnack() {
    var s = $("[data-snack]");
    if (!s) return;
    s.hidden = false;
    void s.offsetWidth;
    s.classList.add("show");
    window.setTimeout(hideSnack, 6000);
  }
  function hideSnack() {
    var s = $("[data-snack]");
    if (!s) return;
    s.classList.remove("show");
    window.setTimeout(function () { s.hidden = true; }, 300);
  }
  function resetCart() {
    cart = {}; save();
    MENU.forEach(function (i) { syncControls(i.id); });
    updateCartUI();
    if (sheetOpen) renderSheet();
    hideSnack();
  }

  /* ---------- delegação ---------- */
  function onClick(e) {
    var act = e.target.closest("[data-act]");
    if (act) {
      var id = act.getAttribute("data-id");
      var a = act.getAttribute("data-act");
      var q = cart[id] || 0;
      if (a === "add" || a === "inc") setQty(id, q + 1);
      else if (a === "dec") setQty(id, q - 1);
      return;
    }
    if (e.target.closest("[data-cart-open]")) { openSheet(); return; }
    if (e.target.closest("[data-sheet-close]")) { closeSheet(); return; }
    if (e.target.closest("[data-backdrop]")) { closeSheet(); return; }
    if (e.target.closest("[data-card-flow-start]")) { openCardConsent(false); return; }
    if (e.target.closest("[data-sheet-card]")) { openCardConsent(true); return; }
    if (e.target.closest("[data-card-consent-continue]")) { acceptCardConsent(); return; }
    if (e.target.closest("[data-sheet-send]")) { sendOrder(e.target.closest("[data-sheet-send]")); return; }
    if (e.target.closest("[data-sheet-whatsapp]")) { sendWhatsApp(e.target.closest("[data-sheet-whatsapp]")); return; }
    if (e.target.closest("[data-snack-reset]")) { resetCart(); return; }
    var chip = e.target.closest("[data-filter]");
    if (chip) { applyFilter(chip.getAttribute("data-filter")); return; }
  }

  /* ---------- observers ---------- */
  function observeMenu() {
    var target = $("[data-menu-grid]");
    if (!target || !("IntersectionObserver" in window)) return;
    var fired = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !fired) { fired = true; track("menu_view", {}); io.disconnect(); }
      });
    }, { threshold: 0.2 });
    io.observe(target);
  }

  /* ---------- deep links (?add= e #festivos) ---------- */
  function scrollToCard(id, pulse) {
    var card = $('[data-card="' + id + '"]');
    if (!card) return;
    card.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    if (pulse && !reduceMotion) {
      card.classList.add("is-pulse");
      window.setTimeout(function () { card.classList.remove("is-pulse"); }, 950);
    }
  }
  function handleDeepLinks() {
    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { params = null; }
    var addId = params && params.get("add");
    if (addId && byId[addId]) {
      setQty(addId, (cart[addId] || 0) + 1, "landing");
      window.setTimeout(function () { scrollToCard(addId, true); }, 260);
    }
    // só ativa o filtro festivo se não esconderia o card recém-adicionado
    if (location.hash === "#festivos" && (!addId || (byId[addId] && byId[addId].seasonal))) {
      applyFilter("festivo", { silent: true });
      var grid = $("[data-menu-grid]");
      window.setTimeout(function () {
        if (grid) grid.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      }, 220);
    }
  }

  /* ---------- teclado do radiogroup de filtros ---------- */
  function initChipsKeyboard() {
    var row = $(".filters-row");
    if (!row) return;
    row.addEventListener("keydown", function (e) {
      var keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
      if (keys.indexOf(e.key) === -1) return;
      var list = $$("[data-filter]", row);
      var idx = list.indexOf(document.activeElement);
      if (idx === -1) return;
      e.preventDefault();
      var next;
      if (e.key === "Home") next = 0;
      else if (e.key === "End") next = list.length - 1;
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % list.length;
      else next = (idx - 1 + list.length) % list.length;
      list[next].focus();
      applyFilter(list[next].getAttribute("data-filter"));
    });
  }

  /* ---------- init ---------- */
  function init() {
    renderMenu();
    applyFilter("todos", { instant: true, silent: true });
    initChipsKeyboard();
    syncCardBanner();

    document.addEventListener("click", onClick);
    document.addEventListener("input", function (e) {
      if (e.target.matches("[data-card-consent-check]")) {
        var proceed = $("[data-card-consent-continue]");
        if (proceed) proceed.disabled = !e.target.checked;
      }
    });
    var consent = $("[data-card-consent]");
    if (consent) consent.addEventListener("close", function () {
      if (consent.returnValue !== "accepted" && reopenSheetAfterConsent && totalQty() > 0) {
        window.setTimeout(openSheet, 80);
      }
      reopenSheetAfterConsent = false;
    });

    var hadCart = load();
    if (hadCart) {
      MENU.forEach(function (i) { syncControls(i.id); });
      updateCartUI();
      showSnack();
      funnelStarted = true;
    }

    observeMenu();
    handleDeepLinks();

    window.addEventListener("beforeunload", function () {
      if (totalQty() > 0) track("funnel_abandon", { items_count: totalQty(), cart_total: totalPrice() });
    });

    // exposto p/ shared.js fechar o sheet ao abrir o menu mobile
    if (window.HEPEGO) window.HEPEGO.closeSheet = closeSheet;
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
