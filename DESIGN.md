---
name: Hépego Cookies
description: Confeitaria artesanal acolhedora, clara e feita para comprar pelo celular.
colors:
  cream: "oklch(96.5% 0.02 85)"
  cream-deep: "oklch(93.5% 0.03 82)"
  card: "oklch(98.5% 0.012 85)"
  espresso: "oklch(29% 0.035 55)"
  espresso-deep: "oklch(24% 0.03 55)"
  brown: "oklch(41% 0.045 55)"
  muted: "oklch(55% 0.035 70)"
  gold: "oklch(72% 0.09 85)"
  gold-text: "oklch(52% 0.09 78)"
  line: "oklch(87% 0.035 82)"
  whatsapp: "oklch(63% 0.17 150)"
typography:
  display:
    fontFamily: "Gyst, Georgia, Times New Roman, serif"
    fontSize: "clamp(3.4rem, 9vw, 7.5rem)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Gyst, Georgia, Times New Roman, serif"
    fontSize: "clamp(2.2rem, 5vw, 4rem)"
    fontWeight: 500
    lineHeight: 1.05
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.22em"
rounded:
  control: "12px"
  surface: "16px"
  sheet: "22px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  section: "clamp(72px, 12vw, 140px)"
components:
  button-primary:
    backgroundColor: "{colors.espresso}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "48px"
  button-whatsapp:
    backgroundColor: "{colors.whatsapp}"
    textColor: "{colors.card}"
    rounded: "{rounded.pill}"
    padding: "0 26px"
    height: "48px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.espresso}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
---

# Design System: Hépego Cookies

## Overview

**Creative North Star: "A caixa de cookies aberta na mesa"**

A interface deve parecer próxima, apetitosa e cuidadosa. Creme, espresso e dourado criam a sensação de embalagem artesanal, enquanto o verde fica reservado às ações que realmente levam ao WhatsApp. As etapas transacionais continuam humanas e nunca assumem estética bancária.

**Key Characteristics:** calor visual, hierarquia direta, imagens reais dos produtos, ações arredondadas e texto transparente sobre pagamento e frete.

## Colors

Creme domina as superfícies; espresso sustenta contraste e autoridade; dourado sinaliza cuidado; verde identifica contato humano pelo WhatsApp.

**The Honest Green Rule.** Verde só aparece em ações ligadas ao WhatsApp ou confirmação inequívoca.

## Typography

**Display Font:** Gyst com fallback Georgia.
**Body Font:** pilha sans-serif nativa.

Gyst dá personalidade de confeitaria às manchetes e aos nomes dos sabores. A sans nativa preserva velocidade e legibilidade em formulários, valores e instruções.

### Hierarchy
- **Display:** leve e expressivo, reservado a grandes chamadas.
- **Headline:** Gyst médio para títulos de seção e diálogo.
- **Body:** 17 px, entrelinha 1.6 e linhas de até 70 caracteres.
- **Label:** 12 px, semibold e espaçamento amplo somente em rótulos curtos.

## Elevation

Sombras ambientais tingidas de espresso separam produtos, barra de pedido e painéis. Superfícies comuns permanecem leves; elevação forte fica restrita a elementos temporários.

### Shadow Vocabulary
- **Low:** sombra curta para botões e cards em repouso.
- **Medium:** sombra difusa para hover e superfícies elevadas.
- **High:** sombra ampla para sheet, diálogo e snackbar.

## Components

### Buttons
- **Shape:** pílula completa, com altura mínima de 48 px.
- **Primary:** espresso com texto creme.
- **WhatsApp:** verde dedicado, nunca usado para cartão.
- **Focus:** contorno dourado de 2 px com afastamento de 3 px.

### Chips
- **Style:** pílulas claras com linha discreta; seleção em espresso.

### Cards / Containers
- **Corner Style:** curvas de 16 px.
- **Background:** creme claro e card quase branco.
- **Shadow Strategy:** sombra baixa em repouso e média em hover.

### Inputs / Fields
- **Style:** fundo de card, curva de 12 px e contorno interno claro.
- **Focus:** contorno interno dourado, sem deslocar o layout.

### Navigation
- Navegação discreta, com CTAs sólidos apenas quando existe ação concreta.

## Do's and Don'ts

### Do:
- **Do** manter o WhatsApp como caminho principal e familiar.
- **Do** separar explicitamente pagamento dos produtos e pagamento do frete.
- **Do** usar imagens reais dos cookies e linguagem curta em português.

### Don't:
- **Don't** criar interfaces bancárias frias ou checkout genérico de marketplace.
- **Don't** esconder custos, taxas ou misturar pagamento dos produtos com entrega.
- **Don't** usar verde para cartão ou ações sem relação com WhatsApp.
- **Don't** usar gradiente em texto, glassmorphism ou faixas laterais decorativas.
