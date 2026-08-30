(function () {
  "use strict";

  var $ = function (selector) { return document.querySelector(selector); };
  var params = new URLSearchParams(window.location.search);
  var orderNsu = params.get("order_nsu") || "";
  var transactionNsu = params.get("transaction_nsu") || "";
  var slug = params.get("slug") || params.get("invoice_slug") || "";
  var busy = false;

  function paint(message, state) {
    var status = $("[data-payment-status]");
    status.classList.toggle("is-paid", state === "paid");
    status.classList.toggle("is-error", state === "error");
    status.querySelector("span:last-child").textContent = message;
  }

  async function verify() {
    if (busy) return;
    if (!orderNsu || !transactionNsu || !slug) {
      paint("Não encontramos os dados de confirmação na URL.", "error");
      $("[data-payment-copy]").textContent = "Se o valor saiu da sua conta, fale com a Hépego e envie o comprovante da InfinitePay.";
      return;
    }
    busy = true;
    $("[data-verify-retry]").hidden = true;
    paint("Consultando a InfinitePay…", "loading");
    try {
      var response = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_nsu: orderNsu, transaction_nsu: transactionNsu, slug: slug })
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível confirmar agora.");
      var reference = $("[data-order-reference]");
      reference.hidden = false;
      reference.textContent = "Referência: " + orderNsu;
      if (!data.paid) {
        paint("Pagamento ainda não confirmado.", "loading");
        $("[data-payment-copy]").textContent = "A confirmação pode levar um pouco mais. Use o botão abaixo para consultar novamente.";
        $("[data-verify-retry]").hidden = false;
        return;
      }
      var nextStep = $("[data-next-step-link]");
      if (data.fulfillment === "card_whatsapp_freight") {
        paint("Pagamento dos produtos confirmado!", "paid");
        $("[data-payment-copy]").textContent = "Agora envie o pedido no WhatsApp para combinarmos o valor do frete, pago separadamente via Pix.";
        if (data.whatsapp_url) {
          nextStep.href = data.whatsapp_url;
          nextStep.textContent = "Combinar frete no WhatsApp";
          nextStep.hidden = false;
          window.setTimeout(function () { window.location.href = data.whatsapp_url; }, 1400);
        }
      } else {
        paint("Pagamento confirmado!", "paid");
        $("[data-payment-copy]").textContent = data.delivery_status === "needs_review"
          ? "Recebemos o pedido. A equipe está revisando a disponibilidade da entrega."
          : "Recebemos o pedido e já estamos preparando a entrega.";
        if (data.tracking_url) {
          nextStep.href = data.tracking_url;
          nextStep.textContent = "Acompanhar entrega";
          nextStep.hidden = false;
        }
      }
      try { sessionStorage.removeItem("hepego_cart_v1"); } catch (e) {}
    } catch (error) {
      paint(error.message, "error");
      $("[data-payment-copy]").textContent = "Seu pagamento não será cobrado novamente ao verificar. Tente mais uma vez ou fale com a Hépego.";
      $("[data-verify-retry]").hidden = false;
    } finally { busy = false; }
  }

  $("[data-verify-retry]").addEventListener("click", verify);
  verify();
})();
