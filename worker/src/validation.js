export function requiredString(value, label, max = 200) {
  const result = String(value == null ? "" : value).trim();
  if (!result || result.length > max) throw new Error(`${label} inválido.`);
  return result;
}

export function optionalString(value, max = 500) {
  const result = String(value == null ? "" : value).trim();
  if (result.length > max) throw new Error("Campo acima do tamanho permitido.");
  return result;
}

export function normalizePhone(value) {
  let digits = String(value == null ? "" : value).replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 15) throw new Error("Telefone inválido.");
  return `+${digits}`;
}

export function normalizeAddress(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Endereço inválido.");
  const state = requiredString(raw.state, "Estado", 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) throw new Error("Estado inválido.");
  const zipCode = requiredString(raw.zip_code || raw.cep, "CEP", 9).replace(/\D/g, "");
  if (zipCode.length !== 8) throw new Error("CEP inválido.");
  const street = requiredString(raw.street || (raw.street_address && raw.street_address[0]), "Rua", 120);
  const number = requiredString(raw.number, "Número", 20);
  const complement = optionalString(raw.complement, 80);
  return {
    street_address: [`${street}, ${number}`, complement],
    city: requiredString(raw.city, "Cidade", 80),
    state,
    zip_code: zipCode,
    country: "BR",
    neighborhood: requiredString(raw.neighborhood, "Bairro", 80),
    number,
    street,
    complement
  };
}

export function publicAddress(address) {
  return {
    cep: address.zip_code,
    street: address.street,
    neighborhood: address.neighborhood,
    number: address.number,
    complement: address.complement
  };
}

export function validOrderNsu(value) {
  const result = String(value == null ? "" : value).trim();
  if (!/^[A-Za-z0-9_-]{12,80}$/.test(result)) throw new Error("Identificador do pedido inválido.");
  return result;
}

export function safeJsonParse(value, label) {
  try { return JSON.parse(value); } catch { throw new Error(`${label} não está em JSON válido.`); }
}
