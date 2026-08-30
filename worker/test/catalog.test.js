import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { CATALOG, normalizeItems } from "../src/catalog.js";
import { normalizeAddress, normalizePhone } from "../src/validation.js";
import { __test } from "../src/index.js";

test("normaliza itens usando o preço canônico", () => {
  const result = normalizeItems([{ id: "tradicional", quantity: 2, price: 600 }, { id: "kinder", quantity: 1, price: 1500 }]);
  assert.equal(result.subtotal, 2700);
  assert.equal(result.quantity, 3);
});

test("recusa adulteração de preço", () => {
  assert.throws(() => normalizeItems([{ id: "kinder", quantity: 2, price: 100 }]), /atualizado/);
});

test("catálogo do Worker acompanha o cardápio público", () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(new URL("../../js/flow.js", import.meta.url), "utf8"), context);
  const publicMenu = context.window.HEPEGO_MENU;
  assert.equal(publicMenu.length, Object.keys(CATALOG).length);
  for (const item of publicMenu) {
    assert.deepEqual(CATALOG[item.id], { description: item.name, price: item.price * 100 });
  }
});

test("normaliza telefone brasileiro e endereço", () => {
  assert.equal(normalizePhone("(41) 98717-2296"), "+5541987172296");
  const address = normalizeAddress({ street: "Rua A", number: "10", neighborhood: "Centro", city: "Piraquara", state: "pr", cep: "83300-000" });
  assert.equal(address.state, "PR");
  assert.equal(address.street_address[0], "Rua A, 10");
});

test("HMAC e comparação segura", async () => {
  const signature = await __test.hmacSha256Hex("segredo", "mensagem");
  assert.equal(signature.length, 64);
  assert.equal(__test.timingSafeEqual(signature, signature), true);
  assert.equal(__test.timingSafeEqual(signature, "0".repeat(64)), false);
});

test("monta WhatsApp do pedido pago sem incluir frete no cartão", () => {
  const url = __test.paidOrderWhatsAppUrl({
    order_nsu: "hep_123456789012",
    dropoff_name: "Cliente Teste",
    dropoff_phone: "+5541999999999",
    product_subtotal: 1200,
    items_json: JSON.stringify([{ description: "Cookie Tradicional", quantity: 2, price: 600 }]),
    dropoff_address_json: JSON.stringify({
      street_address: ["Rua A, 10", ""], neighborhood: "Centro", city: "Piraquara", state: "PR", zip_code: "83301000"
    }),
    notes: null
  }, { PICKUP_PHONE_NUMBER: "+5541987172296" });
  const decoded = decodeURIComponent(url);
  assert.match(decoded, /hep_123456789012/);
  assert.match(decoded, /Produtos pagos/);
  assert.match(decoded, /Frete pendente/);
  assert.doesNotMatch(decoded, /Frete pago/);
});
