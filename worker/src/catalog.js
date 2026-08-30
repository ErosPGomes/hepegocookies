export const CATALOG = Object.freeze({
  "farinha-lactea": { description: "Biscoito de Farinha Láctea", price: 1200 },
  tradicional: { description: "Tradicional", price: 600 },
  nutella: { description: "Nutella™", price: 1200 },
  chocolatudo: { description: "Chocolatudo", price: 1200 },
  kinder: { description: "Kinder", price: 1500 },
  "ninho-frutas": { description: "Ninho + Frutas Vermelhas", price: 1200 },
  "triplo-chocolate": { description: "Triplo Chocolate", price: 1200 },
  "ninho-nutella": { description: "Ninho + Nutella™", price: 1200 },
  "red-velvet": { description: "Red Velvet", price: 1200 },
  mirtilo: { description: "Mirtilo (Blue Velvet)", price: 1200 },
  cappuccino: { description: "Cappuccino", price: 1200 },
  "floresta-negra": { description: "Floresta Negra", price: 1200 },
  "torta-limao": { description: "Torta de Limão", price: 1200 },
  "bicho-de-pe": { description: "Bicho de Pé", price: 1200 },
  merengue: { description: "Merengue de Morango", price: 1200 },
  oreo: { description: "Oreo", price: 1200 },
  milho: { description: "Milho", price: 1200 },
  "maca-do-amor": { description: "Maçã do Amor", price: 1200 },
  pacoquita: { description: "Paçoquita", price: 1200 },
  "pe-de-moca": { description: "Pé de Moça", price: 1200 }
});

export function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
    throw new Error("O pedido precisa ter entre 1 e 30 itens.");
  }

  let subtotal = 0;
  let quantity = 0;
  const normalized = items.map((raw) => {
    const product = CATALOG[String(raw && raw.id || "")];
    const itemQuantity = Number(raw && raw.quantity);
    if (!product || !Number.isInteger(itemQuantity) || itemQuantity < 1 || itemQuantity > 50) {
      throw new Error("Há um item inválido no pedido.");
    }
    if (raw.price != null && Number(raw.price) !== product.price) {
      throw new Error("O cardápio foi atualizado. Recarregue a página.");
    }
    subtotal += product.price * itemQuantity;
    quantity += itemQuantity;
    return {
      id: String(raw.id),
      description: product.description,
      quantity: itemQuantity,
      price: product.price
    };
  });

  if (subtotal < 2000) throw new Error("O pedido mínimo é de R$ 20,00.");
  if (subtotal > 200000 || quantity > 100) throw new Error("Pedido acima do limite para o checkout online.");
  return { items: normalized, subtotal, quantity };
}
