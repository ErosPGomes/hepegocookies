/* build-blog.mjs — Hépego · gera as páginas do blog a partir dos .md
 *
 * O gerador de posts (Creative Studio) publica SÓ arquivos .md em /blog/,
 * com front-matter YAML simples:
 *
 *   ---
 *   title: "..."
 *   description: "..."
 *   date: 2026-07-20
 *   tags: ["a", "b"]
 *   slug: meu-post
 *   ---
 *   # Título repetido (removido daqui)
 *   ...corpo markdown...
 *
 * Este script transforma isso em HTML estático no design da marca:
 *   blog/<slug>/index.html   página do artigo
 *   blog/index.html          listagem
 *   blog/posts.json          manifesto (usado pela listagem/afins)
 *   sitemap.xml + robots.txt
 *
 * Roda no GitHub Actions a cada push (ver .github/workflows/pages.yml).
 * Rodar local:  npm i marked --no-save && node scripts/build-blog.mjs
 */

import { readFile, writeFile, readdir, mkdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = join(ROOT, "blog");

/* URL pública do site. Quando o domínio próprio entrar, muda só aqui
   (ou define BLOG_BASE_URL no ambiente / workflow). */
const BASE_URL = (process.env.BLOG_BASE_URL || "https://erospgomes.github.io/hepegocookies")
  .replace(/\/+$/, "");

const WHATSAPP = "5541987172296";
const INSTAGRAM = "https://www.instagram.com/hepegocookies/";

/* ------------------------------------------------------------------ utils */
const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function fmtData(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (!m) return String(iso || "").slice(0, 10);
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

/* Front-matter do publish_md: valores em aspas duplas, array JSON em tags.
   Parser tolerante — se o formato mudar um pouco, não quebra o build. */
function parseFrontMatter(raw) {
  const txt = raw.replace(/^﻿/, "");
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(txt);
  if (!m) return { data: {}, body: txt };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();
    if (val.startsWith("[")) {
      try { data[key] = JSON.parse(val); continue; } catch { /* segue como texto */ }
    }
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    data[key] = val;
  }
  return { data, body: txt.slice(m[0].length) };
}

/* O artigo_md começa com "# Título" — o título já vai no <h1> da página,
   então remove essa primeira linha pra não duplicar. */
function stripLeadingH1(md) {
  return md.replace(/^\s*#\s+.*(\r?\n)+/, "");
}

const countWords = (md) => (md.trim().match(/\S+/g) || []).length;

/* ---------------------------------------------------------------- markup */
/* prefixo relativo pra funcionar tanto em subpasta (/hepegocookies/) quanto
   num domínio próprio na raiz — nada de caminho absoluto. */
const rel = (depth) => "../".repeat(depth);

const LOGO_SVG = `<svg class="logo-full" viewBox="0 0 146.94 98.94" fill="currentColor" aria-hidden="true" focusable="false"><g><path d="M22.6,77.72v-11.6h-8.55v11.6c0,2.96.12,4.22.28,5.84h-5.11c.16-1.62.28-2.88.28-5.84v-16.7c0-2.96-.12-4.22-.28-5.84h5.11c-.16,1.62-.28,2.88-.28,5.84v4.14h8.55v-4.14c0-2.96-.12-4.22-.28-5.84h5.11c-.16,1.62-.28,2.88-.28,5.84v16.7c0,2.96.12,4.22.28,5.84h-5.11c.16-1.62.28-2.88.28-5.84Z"/><path d="M32.74,77.72v-16.7c0-2.92-.08-4.3-.28-5.84h12.53v2.39c-2.11-1.09-4.26-1.46-6.77-1.46h-.93v9.28c3.32,0,4.82-.12,6.73-.53v1.99c-1.91-.41-3.41-.53-6.73-.53v16.3h1.22c2.64,0,4.58-.57,6.49-1.46v2.39h-12.53c.16-1.66.28-3,.28-5.84Z"/><path d="M49.2,77.72v-16.7c0-2.96-.12-4.22-.28-5.84h5.84c6.2,0,10.38,1.95,10.38,7.34,0,4.66-3.93,7.62-9.73,8.07v-.65c2.23-.28,4.87-1.99,4.87-7.26,0-4.66-1.7-6.65-5.07-6.65-1.42,0-1.46.2-1.46,1.7v19.99c0,2.96.12,4.22.28,5.84h-5.11c.16-1.62.28-2.88.28-5.84Z"/><path d="M68.1,77.72v-16.7c0-2.92-.08-4.3-.28-5.84h12.53v2.39c-2.11-1.09-4.26-1.46-6.77-1.46h-.93v9.28c3.33,0,4.83-.12,6.73-.53v1.99c-1.91-.41-3.41-.53-6.73-.53v16.3h1.22c2.63,0,4.58-.57,6.49-1.46v2.39h-12.53c.16-1.66.28-3,.28-5.84Z"/><path d="M81.68,69.29c0-8.88,7.58-14.76,15.73-14.76,3.24,0,5.84.57,8.15,1.42l.93,6c-2.47-4.78-6.41-6.28-9.29-6.28-5.39,0-10.62,3.61-10.62,13.62s5.23,13.7,10.22,13.7c2.11,0,4.01-.49,5.15-1.38v-5.88c0-2.55-.16-3.77-.61-4.99h5.59c-.32,1.3-.45,2.31-.45,4.66v6.16c-2.64,1.66-6.2,2.63-9.73,2.63-7.78,0-15.08-5.96-15.08-14.92Z"/><path d="M109.54,69.29c0-8.88,6.61-14.76,14.68-14.76s14.76,5.88,14.76,14.76-6.65,14.92-14.76,14.92-14.68-6-14.68-14.92ZM134.11,69.29c0-10.18-4.7-13.54-9.85-13.54s-9.85,3.37-9.85,13.54,4.7,13.7,9.85,13.7,9.85-3.53,9.85-13.7Z"/></g><path d="M32.95,53.51h10.72c.3,0,.47-.33.3-.58l-.73-1.06c-.08-.11-.21-.17-.34-.16l-9.98,1.06c-.46.05-.43.74.04.74Z"/><g><path d="M73.47,33.81c-.61,0-1.14-.39-1.31-.98l-5.76-19.15,7.07-6.41,7.06,6.41-5.75,19.15c-.18.58-.7.98-1.31.98ZM69.38,14.51l4.09,13.6,4.09-13.6-4.09-3.71-4.09,3.71Z"/><path d="M90.88,41.41h-34.82l-9.72-21.58h11.81l5.55,12.34h19.54l5.55-12.34h11.81l-9.72,21.58ZM57.75,38.8h31.44l7.36-16.35h-6.08l-5.55,12.34h-22.92l-5.55-12.34h-6.08l7.36,16.35Z"/></g></svg>`;

const CROWN_SVG = `<svg class="crown-mark" viewBox="44 4 60 40" aria-hidden="true" focusable="false"><path d="M73.47,33.81c-.61,0-1.14-.39-1.31-.98l-5.76-19.15,7.07-6.41,7.06,6.41-5.75,19.15c-.18.58-.7.98-1.31.98ZM69.38,14.51l4.09,13.6,4.09-13.6-4.09-3.71-4.09,3.71Z"/><path d="M90.88,41.41h-34.82l-9.72-21.58h11.81l5.55,12.34h19.54l5.55-12.34h11.81l-9.72,21.58ZM57.75,38.8h31.44l7.36-16.35h-6.08l-5.55,12.34h-22.92l-5.55-12.34h-6.08l7.36,16.35Z"/></svg>`;

const IG_SVG = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.6"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor"/></svg>`;

function head({ depth, title, description, canonical, ld, ogImage }) {
  const r = rel(depth);
  const img = ogImage || `${BASE_URL}/assets/img/photos/pilha-ninho-nutella.webp`;
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#f7f0e3">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="${depth === 2 ? "article" : "website"}">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${img}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="${r}assets/img/brand/favicon.png">
  <link rel="preload" href="${r}assets/fonts/gyst-light.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${r}assets/fonts/gyst-medium.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${r}css/base.css">
  <link rel="stylesheet" href="${r}css/blog.css">
${ld.map((x) => `  <script type="application/ld+json">\n${JSON.stringify(x, null, 2)}\n  </script>`).join("\n")}`;
}

function header(depth) {
  const r = rel(depth);
  return `<header class="site-header" data-header>
    <div class="container header-inner">
      <a class="header-logo" href="${r}index.html" aria-label="Hépego · página inicial">${LOGO_SVG}</a>
      <nav class="header-nav" aria-label="Seções do site">
        <a href="${r}index.html#sabores">Sabores</a>
        <a href="${r}index.html#julho">Julho</a>
        <a href="${r}index.html#como-funciona">Como funciona</a>
        <a class="is-current" href="${r}blog/">Blog</a>
        <a href="${r}index.html#duvidas">Dúvidas</a>
      </nav>
      <div class="header-actions">
        <a class="icon-btn" href="${INSTAGRAM}" target="_blank" rel="noopener" aria-label="Instagram @hepegocookies (abre em nova aba)">${IG_SVG}</a>
        <a class="btn btn--solid header-cta" href="${r}cardapio.html">Fazer pedido</a>
        <button class="hamburger" type="button" data-menu-open aria-label="Abrir menu" aria-expanded="false" aria-controls="mobile-menu">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
  </header>

  <div class="mobile-menu" id="mobile-menu" data-menu role="dialog" aria-modal="true" aria-label="Menu de navegação" hidden>
    <div class="mm-top">
      <span class="header-logo mm-logo">${LOGO_SVG}</span>
      <button class="mm-close" type="button" data-menu-close aria-label="Fechar menu">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
    </div>
    <nav class="mm-nav" aria-label="Navegação principal">
      <a href="${r}index.html#sabores" data-menu-link>Sabores</a>
      <a href="${r}index.html#julho" data-menu-link>Julho</a>
      <a href="${r}index.html#como-funciona" data-menu-link>Como funciona</a>
      <a href="${r}blog/" data-menu-link>Blog</a>
      <a href="${r}index.html#duvidas" data-menu-link>Dúvidas</a>
      <a href="${r}cardapio.html" data-menu-link>Cardápio</a>
    </nav>
    <div class="mm-foot">
      <a class="btn btn--wa" href="#" data-wa="menu">Pedir no WhatsApp</a>
      <p class="mm-micro">${CROWN_SVG}Piraquara,&nbsp;PR</p>
    </div>
  </div>`;
}

function footer(depth) {
  const r = rel(depth);
  return `<footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <span class="header-logo footer-logo">${LOGO_SVG}</span>
          <p class="footer-tagline">Artesanal desde o primeiro forno</p>
        </div>
        <div class="footer-col">
          <h4>Navegar</h4>
          <ul>
            <li><a href="${r}index.html#sabores">Sabores</a></li>
            <li><a href="${r}index.html#julho">Julho</a></li>
            <li><a href="${r}index.html#como-funciona">Como funciona</a></li>
            <li><a href="${r}blog/">Blog</a></li>
            <li><a href="${r}index.html#duvidas">Dúvidas</a></li>
            <li><a href="${r}cardapio.html">Cardápio</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Contato</h4>
          <ul>
            <li><a class="footer-link-ig" href="${INSTAGRAM}" target="_blank" rel="noopener">${IG_SVG}Instagram @hepegocookies</a></li>
            <li><a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">WhatsApp · Fazer pedido</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        ${CROWN_SVG}
        <span>© ${new Date().getFullYear()} Hépego Cookies · Piraquara,&nbsp;PR</span>
      </div>
    </div>
  </footer>`;
}

function scripts(depth) {
  const r = rel(depth);
  /* flow.js dá o CONFIG (WhatsApp/Instagram) e shared.js liga menu mobile,
     links dinâmicos e tracking. Sem vendor pesado: página de leitura é leve. */
  return `<script defer src="${r}js/flow.js"></script>
  <script defer src="${r}js/shared.js"></script>`;
}

const ctaBlock = (depth) => `<aside class="blog-cta">
      <p class="blog-cta-txt">Deu vontade? Os cookies saem quentinhos da nossa cozinha em Piraquara.</p>
      <div class="blog-cta-acoes">
        <a class="btn btn--solid" href="${rel(depth)}cardapio.html">Ver o cardápio</a>
        <a class="btn btn--outline" href="#" data-wa="blog">Pedir no WhatsApp</a>
      </div>
    </aside>`;

/* ------------------------------------------------------------ post + lista */
function postHTML(post) {
  const canonical = `${BASE_URL}/blog/${post.slug}/`;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      inLanguage: "pt-BR",
      datePublished: post.date,
      dateModified: post.date,
      wordCount: post.words,
      ...(post.cover ? { image: `${canonical}${post.cover}` } : {}),
      author: { "@type": "Organization", name: "Hépego Cookies", url: `${BASE_URL}/` },
      publisher: { "@type": "Organization", name: "Hépego Cookies", url: `${BASE_URL}/` },
      mainEntityOfPage: canonical,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${BASE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog/` },
        { "@type": "ListItem", position: 3, name: post.title },
      ],
    },
  ];
  const capa = post.cover
    ? `\n      <img class="blog-capa" src="${esc(post.cover)}" alt="${esc(post.title)}" width="1600" height="900" fetchpriority="high">`
    : "";
  const tags = (post.tags || []).length
    ? `\n      <ul class="blog-tags">${post.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  ${head({ depth: 2, title: `${post.title} · Hépego Cookies`, description: post.description, canonical, ld, ogImage: post.cover ? `${canonical}${post.cover}` : null })}
</head>
<body>
  <a class="skip-link" href="#main">Pular para o conteúdo</a>
  ${header(2)}
  <main id="main" class="blog-wrap">
    <article class="blog-artigo">
      <a class="blog-voltar" href="../">← Todos os artigos</a>
      <h1>${esc(post.title)}</h1>
      <p class="blog-meta">${fmtData(post.date)} · leitura de ${post.minutes} min</p>${capa}
      ${post.html}${tags}
    </article>
    ${ctaBlock(2)}
  </main>
  ${footer(2)}
  ${scripts(2)}
</body>
</html>
`;
}

function listingHTML(posts) {
  const canonical = `${BASE_URL}/blog/`;
  const desc = "Histórias, bastidores e receitas da Hépego Cookies: cookies artesanais assados em fornadas pequenas em Piraquara, região de Curitiba.";
  const ld = [{
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog · Hépego Cookies",
    url: canonical,
    inLanguage: "pt-BR",
    publisher: { "@type": "Organization", name: "Hépego Cookies", url: `${BASE_URL}/` },
  }];

  const cards = posts.map((p) => {
    const thumb = p.cover
      ? `<img class="blog-card-thumb" src="${esc(p.slug)}/${esc(p.cover)}" alt="" loading="lazy">`
      : "";
    return `<a class="blog-card" href="${esc(p.slug)}/">
        ${thumb}<div class="blog-card-corpo">
          <h2>${esc(p.title)}</h2>
          <p>${esc(p.description)}</p>
          <span class="blog-meta">${fmtData(p.date)} · ${p.minutes} min</span>
        </div>
      </a>`;
  }).join("\n      ");

  const corpo = posts.length
    ? cards
    : `<p class="blog-vazio">Os primeiros artigos estão saindo do forno.</p>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  ${head({ depth: 1, title: "Blog · Hépego Cookies", description: desc, canonical, ld })}
</head>
<body>
  <a class="skip-link" href="#main">Pular para o conteúdo</a>
  ${header(1)}
  <main id="main" class="blog-wrap blog-lista">
    <p class="eyebrow">Do forno para a conversa</p>
    <h1 class="serif">Blog</h1>
    <p class="sub">Bastidores, sabores e o que a gente aprende assando cookies todo dia em Piraquara.</p>
    ${corpo}
  </main>
  ${footer(1)}
  ${scripts(1)}
</body>
</html>
`;
}

/* ------------------------------------------------------------------ build */
async function main() {
  await mkdir(BLOG_DIR, { recursive: true });
  const files = (await readdir(BLOG_DIR)).filter((f) => f.toLowerCase().endsWith(".md"));

  const posts = [];
  for (const file of files) {
    const raw = await readFile(join(BLOG_DIR, file), "utf8");
    const { data, body } = parseFrontMatter(raw);
    const slug = (data.slug || file.replace(/\.md$/i, "")).trim();
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
      console.warn(`  ! slug inválido, ignorando: ${file}`);
      continue;
    }
    const md = stripLeadingH1(body);
    const words = countWords(md);
    /* capa opcional: front-matter `cover:` ou blog/<slug>/cover.jpg já no repo */
    let cover = data.cover || null;
    if (!cover && (await exists(join(BLOG_DIR, slug, "cover.jpg")))) cover = "cover.jpg";

    posts.push({
      slug,
      title: data.title || slug,
      description: data.description || "",
      date: (data.date || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
      tags: Array.isArray(data.tags) ? data.tags : [],
      words,
      minutes: Math.max(2, Math.round(words / 200)),
      cover,
      html: marked.parse(md), // gfm (tabelas) ligado por padrão
    });
  }

  posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  for (const p of posts) {
    const dir = join(BLOG_DIR, p.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), postHTML(p), "utf8");
    console.log(`  · ${p.slug} (${p.words} palavras)`);
  }

  await writeFile(join(BLOG_DIR, "index.html"), listingHTML(posts), "utf8");
  await writeFile(
    join(BLOG_DIR, "posts.json"),
    JSON.stringify(posts.map(({ html, ...p }) => p), null, 2),
    "utf8"
  );

  /* sitemap + robots: o blog só rende se for indexável */
  const hoje = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${BASE_URL}/`, lastmod: hoje, freq: "weekly", pri: "1.0" },
    { loc: `${BASE_URL}/cardapio.html`, lastmod: hoje, freq: "weekly", pri: "0.9" },
    { loc: `${BASE_URL}/blog/`, lastmod: hoje, freq: "weekly", pri: "0.8" },
    ...posts.map((p) => ({ loc: `${BASE_URL}/blog/${p.slug}/`, lastmod: p.date, freq: "monthly", pri: "0.7" })),
  ];
  await writeFile(
    join(ROOT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`).join("\n") +
    `\n</urlset>\n`,
    "utf8"
  );
  await writeFile(
    join(ROOT, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`,
    "utf8"
  );

  console.log(`Blog: ${posts.length} artigo(s) · listagem, posts.json, sitemap e robots atualizados.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
