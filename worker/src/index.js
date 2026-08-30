import { normalizeItems } from "./catalog.js";
import {
  normalizeAddress, normalizePhone, optionalString, publicAddress,
  requiredString, safeJsonParse, validOrderNsu
} from "./validation.js";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const INFINITEPAY_BASE = "https://api.checkout.infinitepay.io";
const UBER_API_BASE = "https://api.uber.com/v1/customers";
const UBER_AUTH_URL = "https://auth.uber.com/oauth/v2/token";
const MAX_EXTERNAL_RESPONSE_BYTES = 100_000;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    if (request.method === "OPTIONS") return corsPreflight(request, env);

    try {
      const route = `${request.method} ${url.pathname}`;
      if (route === "GET /api/health") return withCors(request, env, json({ ok: true }));
      assertConfiguration(env);
      if (route === "POST /api/frete/cotacao") {
        assertBrowserOrigin(request, env);
        await rateLimit(request, env, "quote", 20, 600);
        return withCors(request, env, await createQuote(request, env));
      }
      if (route === "POST /api/checkout") {
        assertBrowserOrigin(request, env);
        await rateLimit(request, env, "checkout", 10, 600);
        return withCors(request, env, await createCheckout(request, env));
      }
      if (route === "POST /api/checkout/verify") {
        assertBrowserOrigin(request, env);
        await rateLimit(request, env, "verify", 20, 600);
        return withCors(request, env, await verifyCheckout(request, env));
      }
      if (route === "POST /api/webhook/infinitepay") {
        const raw = await request.text();
        const payload = parseJsonBody(raw);
        if (!payload.order_nsu || !payload.transaction_nsu || !(payload.invoice_slug || payload.slug)) {
          return json({ error: "Webhook inválido" }, 400);
        }
        ctx.waitUntil(processInfinitePayWebhook(payload, raw, env));
        return new Response(null, { status: 200 });
      }
      if (route === "POST /api/webhook/uber") return handleUberWebhook(request, env);
      if (route === "POST /api/entrega/criar") {
        assertAdmin(request, env);
        const body = await readJson(request);
        const result = await createDeliveryForOrder(validOrderNsu(body.order_nsu), env, true);
        return json(result);
      }
      return json({ error: "Not found" }, 404);
    } catch (error) {
      logError("request failed", error, { method: request.method, path: url.pathname });
      const status = error.status || (error.message && /inválid|precisa|mínimo|limite|atualizado|expirou/i.test(error.message) ? 400 : 500);
      return withCors(request, env, json({ error: status >= 500 ? "Não foi possível concluir agora. Tente novamente." : error.message }, status));
    }
  }
};

function assertConfiguration(env) {
  const required = ["DB", "INFINITEPAY_HANDLE", "UBER_CLIENT_ID", "UBER_CLIENT_SECRET", "UBER_CUSTOMER_ID", "SITE_ORIGIN", "PICKUP_ADDRESS", "PICKUP_PHONE_NUMBER", "PICKUP_LATITUDE", "PICKUP_LONGITUDE"];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) throw new Error(`Configuração ausente: ${missing.join(", ")}`);
  getPickupCoordinates(env);
}

async function createQuote(request, env) {
  const body = await readJson(request);
  const address = normalizeAddress(body.dropoff_address);
  const phone = normalizePhone(body.dropoff_phone);
  const name = requiredString(body.dropoff_name, "Nome", 100);
  const token = await getUberToken(env);
  const pickup = getPickupAddress(env);
  const pickupCoordinates = getPickupCoordinates(env);
  const quote = await externalJson(`${UBER_API_BASE}/${encodeURIComponent(env.UBER_CUSTOMER_ID)}/delivery_quotes`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      pickup_address: JSON.stringify(uberAddress(pickup)),
      pickup_latitude: pickupCoordinates.latitude,
      pickup_longitude: pickupCoordinates.longitude,
      dropoff_address: JSON.stringify(uberAddress(address))
    })
  }, "Uber Direct");

  if (!quote.id || !Number.isInteger(quote.fee) || !quote.expires) throw new Error("A Uber retornou uma cotação incompleta.");
  await env.DB.prepare(`INSERT OR REPLACE INTO quotes
    (quote_id, fee, currency, expires_at, dropoff_address_json, dropoff_phone, dropoff_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(quote.id, quote.fee, String(quote.currency || "brl").toLowerCase(), quote.expires,
      JSON.stringify(address), phone, name, new Date().toISOString()).run();

  return json({
    quote_id: quote.id,
    fee: quote.fee,
    currency: String(quote.currency || "brl").toLowerCase(),
    expires_at: quote.expires,
    dropoff_eta: quote.dropoff_eta || null,
    duration: quote.duration || null,
    pickup_duration: quote.pickup_duration || null
  });
}

async function createCheckout(request, env) {
  const body = await readJson(request);
  const orderNsu = validOrderNsu(body.order_nsu);
  const normalized = normalizeItems(body.items);
  const checkoutMode = body.checkout_mode === "card_whatsapp_freight" ? "card_whatsapp_freight" : "uber_delivery";
  const customer = body.customer || {};
  const name = requiredString(customer.name, "Nome", 100);
  const phone = normalizePhone(customer.phone_number);
  const email = optionalString(customer.email, 160);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  let quote = null;
  let quoteId = null;
  let quoteExpiresAt = null;
  let address;
  let deliveryFee = 0;
  let currency = "brl";
  let deliveryStatus = "manual";
  let freightTermsAcceptedAt = null;

  if (checkoutMode === "card_whatsapp_freight") {
    if (body.freight_terms_accepted !== true) {
      throw new HttpError("Confirme que o frete será combinado e pago separadamente.", 400);
    }
    address = normalizeAddress(body.dropoff_address);
    freightTermsAcceptedAt = new Date().toISOString();
  } else {
    quoteId = requiredString(body.quote_id, "Cotação", 120);
    quote = await env.DB.prepare("SELECT * FROM quotes WHERE quote_id = ?").bind(quoteId).first();
    if (!quote || quote.used_by_order_nsu) throw new Error("Cotação inválida ou já utilizada.");
    if (Date.parse(quote.expires_at) <= Date.now() + 30_000) throw new Error("A cotação expirou. Calcule a entrega novamente.");
    if (phone !== quote.dropoff_phone || name !== quote.dropoff_name) throw new Error("Os dados da cotação foram alterados. Calcule novamente.");
    quoteExpiresAt = quote.expires_at;
    address = JSON.parse(quote.dropoff_address_json);
    deliveryFee = Number(quote.fee);
    currency = quote.currency;
    deliveryStatus = "pending";
  }

  const total = normalized.subtotal + deliveryFee;
  const now = new Date().toISOString();
  const insertOrder = env.DB.prepare(`INSERT INTO orders
    (order_nsu, status, checkout_mode, freight_terms_accepted_at, items_json, product_subtotal,
     delivery_fee, total_amount, currency, quote_id, quote_expires_at, dropoff_address_json,
     dropoff_phone, dropoff_name, customer_email, notes, delivery_status, created_at, updated_at)
    VALUES (?, 'checkout_creating', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(orderNsu, checkoutMode, freightTermsAcceptedAt, JSON.stringify(normalized.items),
      normalized.subtotal, deliveryFee, total, currency, quoteId, quoteExpiresAt,
      JSON.stringify(address), phone, name, email || null, optionalString(body.notes, 500) || null,
      deliveryStatus, now, now);

  if (quoteId) {
    const result = await env.DB.batch([
      insertOrder,
      env.DB.prepare("UPDATE quotes SET used_by_order_nsu = ? WHERE quote_id = ? AND used_by_order_nsu IS NULL")
        .bind(orderNsu, quoteId)
    ]);
    if (!result[1].meta || result[1].meta.changes !== 1) throw new Error("Não foi possível reservar a cotação.");
  } else {
    await insertOrder.run();
  }

  const checkoutItems = normalized.items.map(({ description, quantity, price }) => ({ description, quantity, price }));
  if (deliveryFee > 0) checkoutItems.push({ description: "Entrega Uber Direct", quantity: 1, price: deliveryFee });
  const checkoutPayload = {
    handle: env.INFINITEPAY_HANDLE,
    redirect_url: `${stripSlash(env.SITE_ORIGIN)}/obrigado/?order_nsu=${encodeURIComponent(orderNsu)}`,
    webhook_url: `${stripSlash(env.SITE_ORIGIN)}/api/webhook/infinitepay`,
    order_nsu: orderNsu,
    items: checkoutItems,
    customer: { name, phone_number: phone, ...(email ? { email } : {}) },
    address: publicAddress(address)
  };

  try {
    const checkout = await externalJson(`${INFINITEPAY_BASE}/links`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(checkoutPayload)
    }, "InfinitePay");
    if (!checkout.url || !/^https:\/\//.test(checkout.url)) throw new Error("A InfinitePay não retornou o link de pagamento.");
    await env.DB.prepare("UPDATE orders SET status = 'pending_payment', infinitepay_checkout_url = ?, updated_at = ? WHERE order_nsu = ?")
      .bind(checkout.url, new Date().toISOString(), orderNsu).run();
    return json({ url: checkout.url, order_nsu: orderNsu });
  } catch (error) {
    const statements = [
      env.DB.prepare("UPDATE orders SET status = 'checkout_failed', updated_at = ? WHERE order_nsu = ?")
        .bind(new Date().toISOString(), orderNsu)
    ];
    if (quoteId) statements.push(
      env.DB.prepare("UPDATE quotes SET used_by_order_nsu = NULL WHERE quote_id = ? AND used_by_order_nsu = ?")
        .bind(quoteId, orderNsu)
    );
    await env.DB.batch(statements);
    throw error;
  }
}

async function processInfinitePayWebhook(payload, raw, env) {
  const eventId = await sha256Hex(`infinitepay:${raw}`);
  const inserted = await insertWebhookEvent(env, eventId, "infinitepay", raw);
  if (!inserted) return;
  try {
    await reconcilePayment({
      order_nsu: payload.order_nsu,
      transaction_nsu: payload.transaction_nsu,
      slug: payload.invoice_slug || payload.slug
    }, env);
    await finishWebhookEvent(env, eventId, "processed", null);
  } catch (error) {
    logError("InfinitePay webhook processing failed", error, { order_nsu: payload.order_nsu });
    await finishWebhookEvent(env, eventId, "failed", String(error.message || error).slice(0, 1000));
  }
}

async function verifyCheckout(request, env) {
  const body = await readJson(request);
  const result = await reconcilePayment({
    order_nsu: validOrderNsu(body.order_nsu),
    transaction_nsu: requiredString(body.transaction_nsu, "Transação", 120),
    slug: requiredString(body.slug, "Código da fatura", 120)
  }, env);
  return json(result);
}

async function reconcilePayment(input, env) {
  const orderNsu = validOrderNsu(input.order_nsu);
  let order = await env.DB.prepare("SELECT * FROM orders WHERE order_nsu = ?").bind(orderNsu).first();
  if (!order) throw new HttpError("Pedido não encontrado.", 404);
  if (order.transaction_nsu && order.transaction_nsu !== input.transaction_nsu) throw new HttpError("Transação não corresponde ao pedido.", 409);
  if (order.invoice_slug && order.invoice_slug !== input.slug) throw new HttpError("Fatura não corresponde ao pedido.", 409);

  if (!order.paid_at) {
    const payment = await externalJson(`${INFINITEPAY_BASE}/payment_check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handle: env.INFINITEPAY_HANDLE, order_nsu: orderNsu, transaction_nsu: input.transaction_nsu, slug: input.slug })
    }, "InfinitePay");
    if (!payment.success || payment.paid !== true) {
      await env.DB.prepare("UPDATE orders SET invoice_slug = ?, transaction_nsu = ?, updated_at = ? WHERE order_nsu = ?")
        .bind(input.slug, input.transaction_nsu, new Date().toISOString(), orderNsu).run();
      return { paid: false, order_nsu: orderNsu, status: order.status };
    }
    if (Number(payment.amount) !== Number(order.total_amount)) {
      await env.DB.prepare("UPDATE orders SET status = 'payment_amount_mismatch', invoice_slug = ?, transaction_nsu = ?, paid_amount = ?, updated_at = ? WHERE order_nsu = ?")
        .bind(input.slug, input.transaction_nsu, Number(payment.paid_amount || payment.amount), new Date().toISOString(), orderNsu).run();
      throw new HttpError("O valor confirmado não corresponde ao pedido. A equipe foi avisada.", 409);
    }
    const paidAt = new Date().toISOString();
    const paidStatus = order.checkout_mode === "card_whatsapp_freight" ? "paid_freight_pending" : "paid";
    await env.DB.prepare(`UPDATE orders SET status = ?, invoice_slug = ?, transaction_nsu = ?,
      paid_amount = ?, paid_at = ?, updated_at = ? WHERE order_nsu = ? AND paid_at IS NULL`)
      .bind(paidStatus, input.slug, input.transaction_nsu, Number(payment.paid_amount || payment.amount), paidAt, paidAt, orderNsu).run();
  }

  if (order.checkout_mode !== "card_whatsapp_freight") {
    try { await createDeliveryForOrder(orderNsu, env, false); }
    catch (error) { logError("Delivery creation deferred", error, { order_nsu: orderNsu }); }
  }
  order = await env.DB.prepare("SELECT * FROM orders WHERE order_nsu = ?").bind(orderNsu).first();
  return {
    paid: true, order_nsu: orderNsu, status: order.status,
    fulfillment: order.checkout_mode,
    delivery_status: order.delivery_status,
    tracking_url: order.delivery_tracking_url || null,
    whatsapp_url: order.checkout_mode === "card_whatsapp_freight" ? paidOrderWhatsAppUrl(order, env) : null
  };
}

async function createDeliveryForOrder(orderNsu, env, force) {
  let order = await env.DB.prepare("SELECT * FROM orders WHERE order_nsu = ?").bind(orderNsu).first();
  if (!order || !order.paid_at) throw new HttpError("O pedido ainda não está pago.", 409);
  if (order.checkout_mode === "card_whatsapp_freight") throw new HttpError("Este pedido tem frete combinado pelo WhatsApp.", 409);
  if (order.delivery_id) return { delivery_id: order.delivery_id, status: order.delivery_status, tracking_url: order.delivery_tracking_url };

  const allowed = force ? ["pending", "failed", "needs_review"] : ["pending", "failed"];
  if (!allowed.includes(order.delivery_status)) return { status: order.delivery_status };
  const locked = await env.DB.prepare(`UPDATE orders SET delivery_status = 'creating', updated_at = ?
    WHERE order_nsu = ? AND delivery_id IS NULL AND delivery_status = ?`)
    .bind(new Date().toISOString(), orderNsu, order.delivery_status).run();
  if (!locked.meta || locked.meta.changes !== 1) return { status: "already_processing" };

  try {
    let quoteId = order.quote_id;
    let actualFee = Number(order.delivery_fee);
    if (Date.parse(order.quote_expires_at) <= Date.now() + 30_000) {
      const refreshed = await refreshQuoteForOrder(order, env);
      quoteId = refreshed.id;
      actualFee = refreshed.fee;
      const maxIncrease = Number(env.MAX_FEE_INCREASE_CENTS || 300);
      if (!force && actualFee > Number(order.delivery_fee) + maxIncrease) {
        await env.DB.prepare("UPDATE orders SET delivery_status = 'needs_review', delivery_fee_actual = ?, delivery_error = ?, updated_at = ? WHERE order_nsu = ?")
          .bind(actualFee, "Nova cotação acima do limite automático", new Date().toISOString(), orderNsu).run();
        return { status: "needs_review" };
      }
    }

    const token = await getUberToken(env);
    const items = JSON.parse(order.items_json);
    const address = JSON.parse(order.dropoff_address_json);
    const pickup = getPickupAddress(env);
    const pickupCoordinates = getPickupCoordinates(env);
    const payload = {
      quote_id: quoteId,
      pickup_name: "Hépego Cookies",
      pickup_address: JSON.stringify(uberAddress(pickup)),
      pickup_latitude: pickupCoordinates.latitude,
      pickup_longitude: pickupCoordinates.longitude,
      pickup_phone_number: normalizePhone(env.PICKUP_PHONE_NUMBER),
      dropoff_name: order.dropoff_name,
      dropoff_address: JSON.stringify(uberAddress(address)),
      dropoff_phone_number: order.dropoff_phone,
      manifest_items: items.map((item) => ({ name: item.description, quantity: item.quantity })),
      manifest_reference: orderNsu,
      pickup_notes: "Pedido Hépego Cookies",
      dropoff_notes: order.notes || undefined
    };
    const delivery = await externalJson(`${UBER_API_BASE}/${encodeURIComponent(env.UBER_CUSTOMER_ID)}/deliveries`, {
      method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(payload)
    }, "Uber Direct");
    const deliveryId = delivery.id || delivery.delivery_id;
    if (!deliveryId) throw new Error("A Uber não retornou o identificador da entrega.");
    const tracking = delivery.tracking_url || delivery.tracking_url_public || null;
    const status = delivery.status || "pending";
    await env.DB.prepare(`UPDATE orders SET status = 'delivery_created', delivery_id = ?, delivery_status = ?,
      delivery_tracking_url = ?, delivery_fee_actual = ?, delivery_error = NULL, updated_at = ? WHERE order_nsu = ?`)
      .bind(deliveryId, status, tracking, actualFee, new Date().toISOString(), orderNsu).run();
    return { delivery_id: deliveryId, status, tracking_url: tracking };
  } catch (error) {
    await env.DB.prepare("UPDATE orders SET delivery_status = 'failed', delivery_error = ?, updated_at = ? WHERE order_nsu = ?")
      .bind(String(error.message || error).slice(0, 1000), new Date().toISOString(), orderNsu).run();
    throw error;
  }
}

async function refreshQuoteForOrder(order, env) {
  const token = await getUberToken(env);
  const pickup = getPickupAddress(env);
  const pickupCoordinates = getPickupCoordinates(env);
  const address = JSON.parse(order.dropoff_address_json);
  const quote = await externalJson(`${UBER_API_BASE}/${encodeURIComponent(env.UBER_CUSTOMER_ID)}/delivery_quotes`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      pickup_address: JSON.stringify(uberAddress(pickup)),
      pickup_latitude: pickupCoordinates.latitude,
      pickup_longitude: pickupCoordinates.longitude,
      dropoff_address: JSON.stringify(uberAddress(address))
    })
  }, "Uber Direct");
  if (!quote.id || !Number.isInteger(quote.fee) || !quote.expires) throw new Error("A Uber retornou uma nova cotação incompleta.");
  const addressJson = JSON.stringify(address);
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT OR REPLACE INTO quotes
      (quote_id, fee, currency, expires_at, dropoff_address_json, dropoff_phone, dropoff_name, used_by_order_nsu, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(quote.id, quote.fee, String(quote.currency || "brl").toLowerCase(), quote.expires,
        addressJson, order.dropoff_phone, order.dropoff_name, order.order_nsu, now),
    env.DB.prepare("UPDATE orders SET quote_id = ?, quote_expires_at = ?, updated_at = ? WHERE order_nsu = ?")
      .bind(quote.id, quote.expires, now, order.order_nsu)
  ]);
  return quote;
}

async function handleUberWebhook(request, env) {
  if (!env.UBER_WEBHOOK_SIGNING_KEY) throw new Error("Configuração ausente: UBER_WEBHOOK_SIGNING_KEY");
  const raw = await request.text();
  const signature = request.headers.get("x-uber-signature") || request.headers.get("x-postmates-signature") || "";
  const expected = await hmacSha256Hex(env.UBER_WEBHOOK_SIGNING_KEY, raw);
  if (!timingSafeEqual(signature.toLowerCase(), expected)) return json({ error: "Assinatura inválida" }, 401);
  const payload = parseJsonBody(raw);
  const eventId = String(payload.event_id || payload.id || await sha256Hex(`uber:${raw}`));
  const inserted = await insertWebhookEvent(env, eventId, "uber", raw);
  if (!inserted) return new Response(null, { status: 200 });
  try {
    const deliveryId = payload.delivery_id || (payload.data && payload.data.id) || (payload.meta && (payload.meta.order_id || payload.meta.delivery_id));
    const status = payload.status || (payload.data && payload.data.status) || (payload.meta && payload.meta.status);
    const tracking = payload.tracking_url || (payload.data && payload.data.tracking_url) || null;
    if (deliveryId && status) {
      await env.DB.prepare(`UPDATE orders SET delivery_status = ?, delivery_tracking_url = COALESCE(?, delivery_tracking_url),
        status = CASE WHEN ? IN ('delivered','COMPLETED') THEN 'completed' WHEN ? IN ('canceled','FAILED') THEN 'delivery_failed' ELSE status END,
        updated_at = ? WHERE delivery_id = ?`)
        .bind(String(status), tracking, String(status), String(status), new Date().toISOString(), String(deliveryId)).run();
    }
    await finishWebhookEvent(env, eventId, "processed", null);
    return new Response(null, { status: 200 });
  } catch (error) {
    await finishWebhookEvent(env, eventId, "failed", String(error.message || error).slice(0, 1000));
    throw error;
  }
}

async function getUberToken(env) {
  const cached = await env.DB.prepare("SELECT access_token, expires_at FROM oauth_tokens WHERE provider = 'uber'").first();
  if (cached && Date.parse(cached.expires_at) > Date.now() + 300_000) return cached.access_token;
  const form = new URLSearchParams({
    client_id: env.UBER_CLIENT_ID,
    client_secret: env.UBER_CLIENT_SECRET,
    grant_type: "client_credentials",
    scope: "eats.deliveries"
  });
  const token = await externalJson(UBER_AUTH_URL, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form.toString()
  }, "Uber OAuth");
  if (!token.access_token || !Number(token.expires_in)) throw new Error("A Uber não retornou um token válido.");
  const expiresAt = new Date(Date.now() + Number(token.expires_in) * 1000).toISOString();
  await env.DB.prepare(`INSERT INTO oauth_tokens (provider, access_token, expires_at, updated_at) VALUES ('uber', ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET access_token = excluded.access_token, expires_at = excluded.expires_at, updated_at = excluded.updated_at`)
    .bind(token.access_token, expiresAt, new Date().toISOString()).run();
  return token.access_token;
}

function getPickupAddress(env) {
  const parsed = safeJsonParse(env.PICKUP_ADDRESS, "PICKUP_ADDRESS");
  if (!parsed.country) parsed.country = "BR";
  return parsed;
}

function getPickupCoordinates(env) {
  const latitude = Number(env.PICKUP_LATITUDE);
  const longitude = Number(env.PICKUP_LONGITUDE);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("PICKUP_LATITUDE inválida.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("PICKUP_LONGITUDE inválida.");
  }
  return { latitude, longitude };
}

function uberAddress(address) {
  return {
    street_address: address.street_address,
    city: address.city,
    state: address.state,
    zip_code: address.zip_code,
    country: address.country || "BR"
  };
}

function paidOrderWhatsAppUrl(order, env) {
  const items = JSON.parse(order.items_json);
  const address = JSON.parse(order.dropoff_address_json);
  const lines = [
    "*Pedido Hépego pago no cartão* 🍪",
    `*Número:* ${order.order_nsu}`,
    `*Cliente:* ${order.dropoff_name}`,
    `*WhatsApp:* ${order.dropoff_phone}`,
    ""
  ];
  for (const item of items) lines.push(`• ${item.quantity}x ${item.description} — ${formatBrl(item.price * item.quantity)}`);
  lines.push("", `*Produtos pagos:* ${formatBrl(order.product_subtotal)}`);
  lines.push(`*Entrega:* ${address.street_address[0]}${address.street_address[1] ? `, ${address.street_address[1]}` : ""} · ${address.neighborhood} · ${address.city}/${address.state} · CEP ${address.zip_code}`);
  if (order.notes) lines.push(`*Observações:* ${order.notes}`);
  lines.push("", "*Frete pendente:* combinar valor por aqui e pagar separadamente via Pix.");
  const number = String(env.PICKUP_PHONE_NUMBER || "").replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function formatBrl(cents) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(cents) / 100);
}

async function externalJson(url, init, provider) {
  const response = await fetch(url, init);
  const text = await readLimitedText(response, MAX_EXTERNAL_RESPONSE_BYTES);
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text.slice(0, 300) }; }
  if (!response.ok) {
    console.error(JSON.stringify({
      message: "external provider rejected request",
      provider,
      status: response.status,
      provider_error_code: String(data.code || data.error || "").slice(0, 100),
      provider_error_message: String(data.message || data.error_description || "").slice(0, 200)
    }));
    const error = new Error(`${provider} recusou a solicitação (${response.status}).`);
    error.status = response.status >= 400 && response.status < 500 ? 422 : 502;
    throw error;
  }
  return data;
}

async function readLimitedText(response, limit) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > limit) {
    await response.body?.cancel();
    throw new HttpError("A API externa retornou uma resposta acima do limite.", 502);
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new HttpError("A API externa retornou uma resposta acima do limite.", 502);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

async function readJson(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 30_000) throw new HttpError("Corpo da solicitação muito grande.", 413);
  return parseJsonBody(await request.text());
}

function parseJsonBody(raw) {
  if (raw.length > 30_000) throw new HttpError("Corpo da solicitação muito grande.", 413);
  try { return JSON.parse(raw); } catch { throw new HttpError("JSON inválido.", 400); }
}

async function rateLimit(request, env, bucket, limit, windowSeconds) {
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const key = await sha256Hex(`${bucket}:${ip}`);
  const windowStart = Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds;
  const result = await env.DB.prepare(`INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
    ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1 RETURNING count`)
    .bind(key, windowStart).first();
  if (Number(result.count) > limit) throw new HttpError("Muitas tentativas. Aguarde alguns minutos.", 429);
}

async function insertWebhookEvent(env, eventId, provider, raw) {
  const result = await env.DB.prepare(`INSERT OR IGNORE INTO webhook_events
    (event_id, provider, payload_json, status, received_at) VALUES (?, ?, ?, 'processing', ?)`)
    .bind(eventId, provider, raw, new Date().toISOString()).run();
  if (result.meta && result.meta.changes === 1) return true;
  const existing = await env.DB.prepare("SELECT status FROM webhook_events WHERE event_id = ?").bind(eventId).first();
  if (existing && existing.status === "processed") return false;
  await env.DB.prepare("UPDATE webhook_events SET status = 'processing', error = NULL, received_at = ? WHERE event_id = ?")
    .bind(new Date().toISOString(), eventId).run();
  return true;
}

async function finishWebhookEvent(env, eventId, status, error) {
  await env.DB.prepare("UPDATE webhook_events SET status = ?, error = ?, processed_at = ? WHERE event_id = ?")
    .bind(status, error, new Date().toISOString(), eventId).run();
}

function assertBrowserOrigin(request, env) {
  const origin = request.headers.get("origin");
  const allowed = allowedOrigins(env);
  if (!origin || !allowed.includes(origin)) throw new HttpError("Origem não autorizada.", 403);
}

function assertAdmin(request, env) {
  if (!env.ADMIN_API_KEY) throw new HttpError("Endpoint administrativo desativado.", 404);
  if (request.headers.get("authorization") !== `Bearer ${env.ADMIN_API_KEY}`) throw new HttpError("Não autorizado.", 401);
}

function allowedOrigins(env) {
  const origins = [stripSlash(env.SITE_ORIGIN)];
  if (env.ENVIRONMENT !== "production") origins.push("http://localhost:8787", "http://127.0.0.1:8787", "http://localhost:8080", "http://127.0.0.1:8080");
  return origins;
}

function corsPreflight(request, env) {
  const origin = request.headers.get("origin") || "";
  if (!allowedOrigins(env).includes(origin)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-max-age": "86400",
    vary: "Origin"
  } });
}

function withCors(request, env, response) {
  const origin = request.headers.get("origin");
  if (origin && allowedOrigins(env).includes(origin)) {
    response.headers.set("access-control-allow-origin", origin);
    response.headers.set("vary", "Origin");
  }
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("cache-control", "no-store");
  return response;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function stripSlash(value) { return String(value).replace(/\/+$/, ""); }

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function hmacSha256Hex(secret, value) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(signature));
}

function bytesToHex(bytes) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""); }

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

function logError(message, error, fields = {}) {
  console.error(JSON.stringify({
    message,
    error: error instanceof Error ? error.message : String(error),
    ...fields
  }));
}

class HttpError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export const __test = { hmacSha256Hex, timingSafeEqual, allowedOrigins, getPickupCoordinates, paidOrderWhatsAppUrl };
