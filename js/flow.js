/* flow.js — Hépego · Site 2.0 · CONFIG + MENU (dados). Script clássico, carrega primeiro. */
(function () {
  "use strict";

  window.HEPEGO_CONFIG = {
    whatsapp: "5541987172296",
    ifoodUrl: "",                       // vazio → elementos [data-ifood] ocultos
    instagram: "https://www.instagram.com/hepegocookies/",
    intro: true,                        // intro de marca 1x/sessão (sessionStorage hepego_intro)
    seasonal: { enabled: true, ids: ["milho", "pacoquita", "maca-do-amor", "pe-de-moca"] },
    featured: ["ninho-nutella", "triplo-chocolate", "kinder", "chocolatudo", "oreo",
      "red-velvet", "floresta-negra", "torta-limao", "bicho-de-pe", "tradicional"],
    tracking: { ga4_id: "", meta_pixel_id: "", custom_webhook: "" }
  };

  // Campos: id, name, price, section("biscoitos"|"premium"), special?, seasonal?, blurb, img, thumb
  function item(id, name, price, section, flags, blurb) {
    return {
      id: id, name: name, price: price, section: section,
      special: !!(flags && flags.special),
      seasonal: !!(flags && flags.seasonal),
      blurb: blurb,
      img: "assets/img/flavors/" + id + ".webp",
      thumb: "assets/img/menu/" + id + ".webp"
    };
  }

  window.HEPEGO_MENU = [
    item("farinha-lactea", "Biscoito de Farinha Láctea", 12, "biscoitos", null,
      "Biscoitinhos com gosto de infância na casa da avó."),
    item("tradicional", "Tradicional", 6, "premium", null,
      "O clássico com gotas de chocolate: onde todo mundo começa."),
    item("nutella", "Nutella™", 12, "premium", null,
      "O carro-chefe: recheio cremoso de Nutella™ até a borda."),
    item("chocolatudo", "Chocolatudo", 12, "premium", null,
      "Para dias que pedem chocolate de verdade, sem meio-termo."),
    item("kinder", "Kinder", 15, "premium", { special: true },
      "Chocolate ao leite e branco no centro, com gostinho de Kinder."),
    item("ninho-frutas", "Ninho + Frutas Vermelhas", 12, "premium", null,
      "Creme de Ninho com frutas vermelhas: doce e ácido na medida."),
    item("triplo-chocolate", "Triplo Chocolate", 12, "premium", null,
      "O recheio que escorre na primeira mordida."),
    item("ninho-nutella", "Ninho + Nutella™", 12, "premium", { special: true },
      "A dupla que não erra: Ninho cremoso encontrando Nutella™."),
    item("red-velvet", "Red Velvet", 12, "premium", null,
      "Massa vermelha aveludada, recheio cremoso, charme de vitrine."),
    item("mirtilo", "Mirtilo (Blue Velvet)", 12, "premium", null,
      "Azul de mirtilo, para quem gosta de descobrir favoritos."),
    item("cappuccino", "Cappuccino", 12, "premium", null,
      "O café da tarde inteiro em uma mordida."),
    item("floresta-negra", "Floresta Negra", 12, "premium", { special: true },
      "Chocolate e cereja, com charme de confeitaria antiga."),
    item("torta-limao", "Torta de Limão", 12, "premium", null,
      "Massa verde, recheio cítrico e cremoso: um quê de frescor."),
    item("bicho-de-pe", "Bicho de Pé", 12, "premium", null,
      "Morango cremoso que surpreende no centro e na cor."),
    item("merengue", "Merengue de Morango", 12, "premium", null,
      "Morango com suspiro, leve como sobremesa de domingo."),
    item("oreo", "Oreo", 12, "premium", { special: true },
      "Para o time cookies and cream: Oreo do começo ao fim."),
    item("milho", "Milho", 12, "premium", { seasonal: true },
      "O curau da quermesse virou recheio macio e dourado."),
    item("maca-do-amor", "Maçã do Amor", 12, "premium", { seasonal: true },
      "A cobertura vermelha mais amada do arraiá, em cookie."),
    item("pacoquita", "Paçoquita", 12, "premium", { seasonal: true },
      "O amendoim da festa morando no centro do cookie."),
    item("pe-de-moca", "Pé de Moça", 12, "premium", { seasonal: true },
      "Amendoim com doce de leite, à moda antiga.")
  ];
})();
