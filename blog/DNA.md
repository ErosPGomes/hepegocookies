# DNA do blog — Hépego Cookies

Leia este arquivo por inteiro antes de escrever qualquer artigo. Ele é a fonte de
verdade estratégica do blog. Atualize-o quando preços, sabores ou posicionamento
mudarem — o gerador (humano ou agente) sempre confia no que está escrito aqui.

## Quem somos

Hépego Cookies é uma marca de cookies artesanais em fornadas pequenas, sediada em
Piraquara-PR (região metropolitana de Curitiba). Site: `https://hepego.com.br`
(o build lê `BLOG_BASE_URL` do ambiente, definido no workflow — não escreva URL
absoluta no corpo dos artigos). Pedidos por WhatsApp (`https://wa.me/5541987172296`,
botão "Pedir no WhatsApp" no site) ou iFood. Instagram: `@hepegocookies`. Cardápio
completo em `/cardapio.html`.

Diferencial: cookies recheados generosamente, assados em fornadas diárias e
pequenas (não industrial), com ingredientes nobres (Nutella™ original, chocolates
finos) — a casquinha estala, o recheio escorre. Tom da marca: caseiro, caloroso,
orgulhoso do processo artesanal, sem soar corporativo.

## Público-alvo

Moradores de Piraquara e região metropolitana de Curitiba que compram doces
artesanais pra consumo próprio, pra presentear, ou pra ocasiões (aniversário,
visita, café da tarde). Leigo em confeitaria — nunca presuma vocabulário técnico
de pâtisserie. Decide rápido: quer saber sabor, textura, preço e como pedir.

## Tom de voz

- Português do Brasil, **primeira pessoa do plural** ("nós assamos", "nossa
  cozinha") — é a marca falando, não um redator terceirizado.
- Sensorial e caloroso: descreva textura (crocante por fora, macio por dentro,
  recheio que escorre), não só liste ingredientes.
- Direto e prático — o leitor quer decidir o que pedir, não ler um ensaio.
- Evite jargão de marketing ("experiência gastronômica única", "eleve seu
  paladar") e qualquer coisa que soe cara de IA — siga o guia em
  `.claude/skills/humanizer/SKILL.md` (copiado neste repo) antes de entregar
  qualquer texto: sem travessão em excesso, sem "não é só X, é Y" repetido, sem
  abrir toda vez com a mesma fórmula de cena.
- Emoji: no máximo 1, só se dosar naturalmente. Nunca em todo parágrafo.

## Regras de marca inegociáveis (nunca violar)

Estas regras vêm do processo de geração de imagem da marca e valem igualmente
pro texto — um erro aqui é pior que um post mediano:

- **Nutella sempre com o símbolo ™**: "Nutella™", nunca só "Nutella".
- **Kinder NÃO tem creme de avelã.** O recheio é chocolate ao leite e chocolate
  branco. Nunca descreva o Kinder com avelã/Nutella.
- **Selo dourado ("sabor especial")** é só pros premium: Ninho c/ Nutella™,
  Kinder, Combo Nutella™, Floresta Negra, Oreo (e similares). **Sabores
  juninos/sazonais (Milho, Paçoquita, Maçã do Amor, Pé de Moça, Combo Junino)
  são sazonais, NÃO premium — nunca atribua selo dourado a eles.**
- **Acentos corretos, sempre**: Maçã do Amor (cedilha no ç + til no ã — os dois),
  Paçoquita, Pé de Moça, Torta de Limão, Hépego (é).
- **NUNCA invente sabor.** Só existem os sabores da lista canônica abaixo. Se um
  sabor não está nessa lista, ele NÃO EXISTE — não escreva sobre ele, não cite de
  passagem, não use em comparativo, nem que "faça sentido" para o texto. A fonte
  de verdade é `js/flow.js` (array `HEPEGO_MENU`), de onde o cardápio do site é
  montado. Em caso de qualquer divergência entre este arquivo e `js/flow.js`,
  vale o `js/flow.js`.
- **Nunca invente estrutura física ou operacional**: a cozinha/loja fica em
  **Piraquara**, não em Curitiba. Não afirme que existe loja em Curitiba, filial,
  quiosque ou ponto de venda que não esteja documentado aqui.
- **Preços** (confirme antes de citar em qualquer post — mudam com frequência;
  se não tiver certeza do valor atual, não cite número, fale em termos gerais):
  Tradicional R$6, Kinder R$15, premium R$12, sazonais/juninos R$12, Biscoito
  de Farinha Láctea R$12. **Atualize esta lista sempre que o preço mudar.**
- **NUNCA cite validade, prazo de consumo ou tempo de conservação.** Não escreva
  "dura X dias", "até X dias na geladeira", "congele por X dias", nem tabela de
  conservação. A validade varia de cookie para cookie e não está documentada em
  lugar nenhum — qualquer número aqui é invenção, e é afirmação sobre segurança
  de alimento. Se o assunto surgir, oriente a consumir fresco e a falar com a
  gente pelo WhatsApp. Vale também para posts sobre "como armazenar".
- Nunca invente depoimento, avaliação ou número de vendas que não existam.

## Lista canônica de sabores (fonte: `js/flow.js` → `HEPEGO_MENU`)

**Nenhum sabor fora desta lista pode aparecer em qualquer post.** Antes de
publicar, confira cada sabor citado no texto contra esta tabela.

| Sabor | Preço | Selo dourado? | Situação |
| :--- | :--- | :--- | :--- |
| Biscoito de Farinha Láctea | R$12 | não | fixo |
| Tradicional | R$6 | não | fixo |
| Nutella™ | R$12 | não | fixo |
| Chocolatudo | R$12 | não | fixo |
| Kinder | R$15 | **sim** | fixo |
| Ninho + Frutas Vermelhas | R$12 | não | fixo |
| Triplo Chocolate | R$12 | não | fixo |
| Ninho + Nutella™ | R$12 | **sim** | fixo |
| Red Velvet | R$12 | não | fixo |
| Mirtilo (Blue Velvet) | R$12 | não | fixo |
| Cappuccino | R$12 | não | fixo |
| Floresta Negra | R$12 | **sim** | fixo |
| Torta de Limão | R$12 | não | fixo |
| Bicho de Pé | R$12 | não | fixo |
| Merengue de Morango | R$12 | não | fixo |
| Oreo | R$12 | **sim** | fixo |
| Milho | R$12 | não | **sazonal junino** |
| Maçã do Amor | R$12 | não | **sazonal junino** |
| Paçoquita | R$12 | não | **sazonal junino** |
| Pé de Moça | R$12 | não | **sazonal junino** |

### Janela dos sazonais juninos

Os quatro sabores juninos (Milho, Maçã do Amor, Paçoquita, Pé de Moça) só ficam
no cardápio na **campanha de junho a agosto** — depois saem. Regra para o blog:

- **De junho a agosto**: pode escrever sobre eles livremente.
- **Fora dessa janela**: não escreva post cujo tema central seja sabor junino, e
  não os cite como se estivessem disponíveis. Se precisar mencioná-los, deixe
  claro que voltam na campanha de junho.
- Sazonal **nunca** tem selo dourado, mesmo dentro da janela.

Quando um sabor novo for lançado ou removido, atualize `js/flow.js` **e** esta
tabela juntos.

## Palavras-chave e SEO local

- Localidade-alvo: **Piraquara** (principal) e **Curitiba/região metropolitana**
  (secundário, quando o tema permitir "capital paranaense" etc. — não force).
- Intenção GEO: cada post deve responder, de forma autocontida numa seção, uma
  pergunta real de quem pesquisa (ex.: "qual cookie da Hépego escolher pra
  presente", "onde comprar cookie artesanal em Piraquara", "como pedir delivery
  de cookie quentinho").
- Uma palavra-chave primária por post, presente no título, na meta description,
  no primeiro parágrafo e em pelo menos um H2.

## Pilares de conteúdo (para não repetir tema)

Antes de escolher o tema, leia os arquivos `.md` já existentes em `/blog/` (título
e slug) — nunca repita um ângulo já coberto. Pilares, com exemplos já publicados:

1. **Comparativo de sabores** — "X vs Y: qual pedir" (já feito: Nutella™ vs
   Kinder). Só compare sabores da lista canônica acima.
2. **Guia de compra/presente/delivery** — como pedir, onde comprar, presentear
   (já feito: guia de delivery, presente em Piraquara).
3. **Sazonalidade/clima** — sabores por estação, harmonização com bebidas
   quentes/frias (já feito: sabores de inverno, bebidas quentes).
4. **Bastidores/qualidade** — processo artesanal, ingredientes, o que diferencia
   do industrial (já feito: massa de Nutella™ assada na hora).
5. **Ocasiões e datas** — aniversário, visita, café da tarde, datas comemorativas.
   Calendário de referência (hemisfério sul, use o mês corrente para decidir):

   | Mês | Gancho |
   | :--- | :--- |
   | Janeiro | Volta às aulas, férias, calor |
   | Fevereiro | Carnaval (data móvel) |
   | Março | Dia da Mulher (8), início do outono |
   | Abril | Páscoa (data móvel, pode cair em março) |
   | Maio | Dia das Mães (2º domingo) |
   | Junho | Festas juninas, Dia dos Namorados (12), início do inverno |
   | Julho | Férias escolares, auge do frio |
   | Agosto | Dia dos Pais (2º domingo), fim da campanha junina |
   | Setembro | Início da primavera (23) |
   | Outubro | Dia das Crianças (12), Dia do Professor (15) |
   | Novembro | Black Friday (última sexta) |
   | Dezembro | Natal, confraternizações, presentes de fim de ano |

   Não invente "dia nacional do cookie" nem data comemorativa que você não tenha
   certeza que existe. Na dúvida, use ocasião genérica do dia a dia.

Distribua entre os pilares — não escreva dois posts seguidos do mesmo pilar.

## Regras de estrutura por artigo

- 900 a 2500 palavras (os posts já publicados variam nessa faixa — sem
  problema ser mais longo se o tema pedir).
- Título até ~70 caracteres, formato pergunta ou comparativo.
- Meta description (`description` no front-matter) entre 140-160 caracteres,
  com a palavra-chave, terminando com um motivo pra clicar.
- Introdução que já situa o problema/dúvida; 3-6 seções H2; conclusão que
  termina levando ao pedido (CTA já vem automático no template — não precisa
  escrever CTA de venda dentro do corpo, só fechar bem o assunto).
- Cite fontes reais quando fizer sentido (ex.: hábitos de consumo, associações
  do setor) sem inventar números — o post de Nutella™ vs Kinder já faz isso bem
  citando a ABIP.

## Como publicar (mecânica do repositório — NÃO pule etapas)

Este blog usa um pipeline **markdown → HTML automático via GitHub Actions**
(`scripts/build-blog.mjs`, disparado em todo push pra `main` — ver
`.github/workflows/pages.yml`). Publicar um post é **só**:

1. Criar `blog/<slug>.md` com este front-matter exato:
   ```
   ---
   title: "Título do artigo"
   description: "Meta description, 140-160 caracteres"
   date: AAAA-MM-DD
   tags: []
   slug: <slug>
   ---
   ```
   seguido do corpo em markdown puro (H2 `##`, listas, **negrito**, tabelas se
   fizer sentido). NÃO repita o título como `# Título` no corpo — o template já
   renderiza o H1 a partir do front-matter.
2. **Capa (obrigatória — reaproveite o banco existente, não gere nem baixe nada
   novo)**: adicione no front-matter o campo `cover:` apontando pra uma foto já
   commitada em `assets/img/photos/`, com caminho relativo à pasta do post:
   `cover: "../../assets/img/photos/<arquivo>.webp"`. O build já sabe usar isso
   (tanto na página do artigo quanto na miniatura da listagem) — não precisa
   copiar arquivo nem criar pasta `blog/<slug>/` à mão. Escolha o arquivo cujo
   nome corresponda ao sabor central do post. Fotos disponíveis (todas em
   `assets/img/photos/`, uma por sabor ou combo): combo-duplo-nutella,
   combo-tradicional, combo-tropical,
   hero-bicho-de-pe, hero-maca-do-amor, hero-milho, hero-ninho-frutas-vermelhas,
   hero-nutella, hero-pacoquita, hero-pe-de-moca, hero-torta-de-limao,
   macro-ninho-nutella, macro-triplo, maos-chocolatudo, maos-merengue,
   maos-oreo, mesa-farinha, mesa-kinder, mesa-redvelvet, mordida-kinder,
   mordida-triplo, pilha-floresta, pilha-mirtilo, pilha-ninho-nutella,
   pilha-tradicional, pilha-triplo. Se o post não tiver um sabor central único
   (ex.: post de guia geral), use uma foto de combo ou `pilha-tradicional`.
3. **Não** editar `blog/index.html`, `blog/posts.json`, `sitemap.xml` ou
   `robots.txt` na mão — o GitHub Action regenera tudo isso sozinho a partir do
   `.md` no próximo push. Editar esses arquivos manualmente só causa conflito.
4. `git add blog/<slug>.md` (+ a pasta de capa se criada), commit
   `Blog: adiciona artigo '<título>'`, `git pull --rebase` (proteção contra
   corrida com outro push), `git push`.
5. O GitHub Action builda e publica sozinho — não precisa rodar
   `node scripts/build-blog.mjs` localmente (mas pode, pra conferir antes de
   commitar, se tiver Node disponível no ambiente de execução).
