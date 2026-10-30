#!/usr/bin/env node
// Validate the published files themselves: no dev server or browser dependencies.
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const origin = 'https://connieskin.com';
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const ignored = new Set(['scripts', 'tests', 'node_modules', 'outputs']);
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', copy: '©', hellip: '…' };
const decode = (value) => value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, key) => {
  if (key[0] !== '#') return entities[key.toLowerCase()] ?? whole;
  const code = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '\ufffd';
});
const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const nonempty = (value) => typeof value === 'string' && normalize(value).length > 0;
const validDate = (value) => nonempty(value) && Number.isFinite(Date.parse(value));
const safeSlug = (value) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const publicUrl = (value) => {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
};

async function walk(directory) {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.name.startsWith('.') || ignored.has(item.name)) continue;
    const filename = path.join(directory, item.name);
    if (item.isDirectory()) files.push(...await walk(filename));
    else if (item.isFile() && item.name.endsWith('.html')) files.push(filename);
  }
  return files;
}

// Small tokenizer for these static documents. Quotes delimit attributes, while
// script/style content is raw text; '<' in JSON or JavaScript is never a tag.
function parse(html, filename) {
  const document = { tag: '#document', attrs: {}, children: [] };
  const stack = [document];
  const nodes = [];
  let cursor = 0;
  while (cursor < html.length) {
    if (html[cursor] !== '<') {
      const end = html.indexOf('<', cursor);
      stack.at(-1).children.push(decode(html.slice(cursor, end < 0 ? html.length : end)));
      cursor = end < 0 ? html.length : end;
      continue;
    }
    if (html.startsWith('<!--', cursor)) {
      const end = html.indexOf('-->', cursor + 4);
      check(end >= 0, `${filename}: unclosed HTML comment`);
      cursor = end < 0 ? html.length : end + 3;
      continue;
    }
    let end = cursor + 1;
    let quote = null;
    for (; end < html.length; end++) {
      if (quote) { if (html[end] === quote) quote = null; }
      else if (html[end] === '"' || html[end] === "'") quote = html[end];
      else if (html[end] === '>') break;
    }
    if (end === html.length) { check(false, `${filename}: unclosed HTML tag`); break; }
    const token = html.slice(cursor + 1, end);
    cursor = end + 1;
    if (token.startsWith('!') || token.startsWith('?')) continue;
    if (token.startsWith('/')) {
      const tag = token.slice(1).trim().toLowerCase();
      const index = stack.findLastIndex((node) => node.tag === tag);
      if (index > 0) stack.length = index;
      continue;
    }
    const match = token.match(/^([a-z][\w:-]*)/i);
    if (!match) { stack.at(-1).children.push(`<${token}>`); continue; }
    const tag = match[1].toLowerCase();
    const attrs = {};
    const source = token.slice(match[0].length).replace(/\/$/, '');
    for (const attribute of source.matchAll(/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      const key = attribute[1].toLowerCase();
      check(!(key in attrs), `${filename}: duplicate ${key} attribute on <${tag}>`);
      attrs[key] = decode(attribute[2] ?? attribute[3] ?? attribute[4] ?? '');
      check(!/^on[a-z]+$/.test(key), `${filename}: inline event handler ${key}; keep data text out of executable attributes`);
    }
    const node = { tag, attrs, children: [], parent: stack.at(-1) };
    stack.at(-1).children.push(node);
    nodes.push(node);
    if (tag === 'script' || tag === 'style') {
      const close = new RegExp(`</${tag}\\s*>`, 'ig');
      close.lastIndex = cursor;
      const closing = close.exec(html);
      check(Boolean(closing), `${filename}: unclosed <${tag}>`);
      node.children.push(html.slice(cursor, closing?.index ?? html.length));
      cursor = closing ? close.lastIndex : html.length;
    } else if (!voidTags.has(tag) && !token.endsWith('/')) stack.push(node);
  }
  return { document, nodes };
}

function textContent(node, visible = false) {
  if (typeof node === 'string') return node;
  if (visible && (['script', 'style', 'template', 'head'].includes(node.tag) || 'hidden' in node.attrs || node.attrs['aria-hidden'] === 'true')) return '';
  return node.children.map((child) => textContent(child, visible)).join(' ');
}
const descendants = (node) => node.children.flatMap((child) => typeof child === 'string' ? [] : [child, ...descendants(child)]);
const metadata = (page, key) => page.nodes.filter((node) => node.tag === 'meta' && (node.attrs.name === key || node.attrs.property === key));
const byId = (page, id) => page.nodes.find((node) => node.attrs.id === id);
function sectionContent(page, id) {
  const anchor = byId(page, id);
  if (!anchor || !/^h[1-6]$/.test(anchor.tag)) return anchor;
  const siblings = anchor.parent.children;
  const start = siblings.indexOf(anchor);
  let end = start + 1;
  for (; end < siblings.length; end++) {
    const sibling = siblings[end];
    if (typeof sibling !== 'string' && /^h[1-6]$/.test(sibling.tag) && sibling.tag <= anchor.tag) break;
  }
  return { tag: 'section', attrs: {}, children: siblings.slice(start, end) };
}
const pathFor = (filename) => `/${path.relative(root, filename).split(path.sep).join('/')}`.replace(/index\.html$/, '');

const pages = new Map();
for (const filename of (await walk(root)).sort()) {
  const relative = path.relative(root, filename);
  const html = await readFile(filename, 'utf8');
  const page = { ...parse(html, relative), filename, relative, html, url: new URL(pathFor(filename), origin).href };
  pages.set(filename, page);
  const titles = page.nodes.filter((node) => node.tag === 'title');
  const headings = page.nodes.filter((node) => node.tag === 'h1');
  check(titles.length === 1 && nonempty(textContent(titles[0])), `${relative}: needs one nonempty title`);
  check(headings.length === 1 && nonempty(textContent(headings[0], true)), `${relative}: needs one visible H1`);
  check(page.nodes.some((node) => node.tag === 'html' && nonempty(node.attrs.lang)), `${relative}: missing document language`);
  check(metadata(page, 'viewport').some((node) => node.attrs.content?.includes('width=device-width')), `${relative}: missing responsive viewport`);
  const ids = page.nodes.filter((node) => nonempty(node.attrs.id)).map((node) => node.attrs.id);
  check(new Set(ids).size === ids.length, `${relative}: duplicate IDs`);
  page.indexable = relative !== '404.html' && !metadata(page, 'robots').some((node) => /(?:^|[,\s])noindex(?:$|[,\s])/i.test(node.attrs.content ?? ''));
  const canonicals = page.nodes.filter((node) => node.tag === 'link' && node.attrs.rel?.split(/\s+/).includes('canonical'));
  if (page.indexable) {
    check(canonicals.length === 1 && canonicals[0].attrs.href === page.url, `${relative}: canonical must be exactly ${page.url}`);
    check(metadata(page, 'description').length === 1 && nonempty(metadata(page, 'description')[0].attrs.content), `${relative}: missing unique description`);
  }
  page.jsonld = [];
  for (const script of page.nodes.filter((node) => node.tag === 'script' && node.attrs.type === 'application/ld+json')) {
    try { page.jsonld.push(JSON.parse(textContent(script))); }
    catch (error) { check(false, `${relative}: invalid JSON-LD: ${error.message}`); }
  }
  for (const img of page.nodes.filter((node) => node.tag === 'img')) check('alt' in img.attrs, `${relative}: image missing alt attribute`);
}

let linksChecked = 0;
for (const page of pages.values()) {
  for (const node of page.nodes) {
    for (const attribute of ['href', 'src', 'action', 'poster']) {
      if (!(attribute in node.attrs)) continue;
      const value = node.attrs[attribute];
      if (attribute === 'action' && !value) continue;
      check(!/^\s*(javascript|vbscript):/i.test(value), `${page.relative}: unsafe ${attribute} URL`);
      let url;
      try { url = new URL(value, page.url); }
      catch { check(false, `${page.relative}: invalid URL ${value}`); continue; }
      if (url.origin !== origin) continue;
      let pathname;
      try { pathname = decodeURIComponent(url.pathname); }
      catch { check(false, `${page.relative}: invalid encoded path ${value}`); continue; }
      let target = path.resolve(root, `.${pathname}`);
      if (target !== root && !target.startsWith(`${root}${path.sep}`)) { check(false, `${page.relative}: path escapes site root`); continue; }
      try { if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html'); await stat(target); }
      catch { check(false, `${page.relative}: broken ${attribute} ${value}`); continue; }
      linksChecked++;
      if (url.hash && pages.has(target)) {
        let id;
        try { id = decodeURIComponent(url.hash.slice(1)); }
        catch { check(false, `${page.relative}: invalid fragment ${value}`); continue; }
        if (id && !id.startsWith(':~:text=')) check(Boolean(byId(pages.get(target), id)), `${page.relative}: missing fragment ${value}`);
      }
    }
  }
}

const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8').catch(() => '');
const sitemapUrls = [...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((match) => decode(match[1].trim()));
check(sitemapUrls.length > 0, 'sitemap.xml: missing or empty');
check(new Set(sitemapUrls).size === sitemapUrls.length, 'sitemap.xml: duplicate URLs');
const indexableUrls = new Set([...pages.values()].filter((page) => page.indexable).map((page) => page.url));
for (const url of indexableUrls) check(sitemapUrls.includes(url), `sitemap.xml: missing indexable page ${url}`);
for (const url of sitemapUrls) check(indexableUrls.has(url), `sitemap.xml: URL is not an indexable canonical page: ${url}`);

let catalog;
try { catalog = JSON.parse(await readFile(path.join(root, 'data/catalog.json'), 'utf8')); }
catch (error) { check(false, `data/catalog.json: ${error.message}`); }
const productPages = [...pages.values()].filter((page) => page.nodes.some((node) => node.tag === 'main' && 'data-product-detail' in node.attrs));
check(productPages.length >= 50 && productPages.length <= 100, `expected 50–100 product detail pages, found ${productPages.length}`);

if (catalog) {
  check(catalog.schemaVersion === 1, 'catalog: unsupported schemaVersion');
  check(validDate(catalog.exportedAt), 'catalog: missing valid export date');
  check(catalog.source?.kind === 'anonymous-public-api' && catalog.source?.visibility === 'surfaced-only', 'catalog: publication must use anonymous, surfaced-only source');
  check(Array.isArray(catalog.products) && catalog.products.length >= 50 && catalog.products.length <= 100, 'catalog: expected 50–100 products');
  check(Array.isArray(catalog.ingredients), 'catalog: missing ingredient references');
  const products = Array.isArray(catalog.products) ? catalog.products : [];
  const ingredients = Array.isArray(catalog.ingredients) ? catalog.ingredients : [];
  let sourceAudit;
  try { sourceAudit = JSON.parse(await readFile(path.join(root, 'data/source-audit.json'), 'utf8')); }
  catch (error) { check(false, `source audit: ${error.message}`); }
  if (sourceAudit) {
    check(JSON.stringify([...sourceAudit.approvedProductIds].sort((a,b) => a-b)) === JSON.stringify(products.map(product => product.id).sort((a,b) => a-b)), 'source audit: approved selection differs from the published selection');
    for (const product of products) {
      const audit = sourceAudit.records.find(record => record.id === product.id);
      check(audit?.outcome === 'matched-recorded-declaration', `product ${product.id}: not approved by source audit`);
      check(audit?.recordedDeclarationSha256 === createHash('sha256').update(product.inciText).digest('hex'), `product ${product.id}: declaration changed since source audit`);
      check(audit?.sourceUrl === product.sourceAudit?.sourceUrl && audit?.checkedAt === product.sourceAudit?.checkedAt, `product ${product.id}: source audit provenance differs`);
    }
  }
  check(new Set(products.map((product) => product.slug)).size === products.length, 'catalog: duplicate product slugs');
  check(new Set(products.map((product) => product.id)).size === products.length, 'catalog: duplicate public product IDs');
  check(productPages.length === products.length, 'catalog: product count differs from generated detail pages');
  const productIndex = pages.get(path.join(root, 'products/index.html'));
  check(Boolean(productIndex), 'products/index.html: missing library');
  const linkedFromIndex = new Set(productIndex?.nodes.filter((node) => node.tag === 'a').map((node) => node.attrs.href) ?? []);
  const productKeys = new Set(['id', 'slug', 'name', 'brand', 'brandSlug', 'category', 'source', 'ingredientSource', 'variantName', 'packageSize', 'packageCount', 'image', 'inciText', 'ingredients', 'sourceAudit']);
  for (const product of products) {
    const label = `product ${product.id ?? '(missing id)'}`;
    check(Number.isSafeInteger(product.id) && product.id > 0, `${label}: invalid public ID`);
    check(safeSlug(product.slug) && safeSlug(product.brandSlug), `${label}: unsafe slug`);
    check(nonempty(product.name) && nonempty(product.brand) && nonempty(product.inciText), `${label}: missing identity or original ingredient list`);
    check(publicUrl(product.source?.url), `${label}: missing valid source URL`);
    check(product.sourceAudit?.outcome === 'matched-recorded-declaration' && validDate(product.sourceAudit.checkedAt) && publicUrl(product.sourceAudit.sourceUrl), `${label}: full source declaration audit missing`);
    check(product.image === null, `${label}: image publication requires a separately validated reuse basis`);
    check(Object.keys(product).every((key) => productKeys.has(key)), `${label}: unexpected fields in public payload`);
    if (product.ingredientSource) {
      check(publicUrl(product.ingredientSource.url) && validDate(product.ingredientSource.retrievedAt), `${label}: ingredient provenance missing source or retrieval date`);
    }
    check(Array.isArray(product.ingredients) && product.ingredients.length > 0, `${label}: missing ingredient tokens`);
    const tokens = Array.isArray(product.ingredients) ? product.ingredients : [];
    check(tokens.every((token, index) => token.position === index + 1 && nonempty(token.label)), `${label}: ingredient order has gaps or empty labels`);
    const page = pages.get(path.join(root, 'products', String(product.slug), 'index.html'));
    check(Boolean(page), `${label}: missing detail page`);
    check(linkedFromIndex.has(`/products/${product.slug}/`), `${label}: no crawlable link in the library HTML`);
    if (!page) continue;
    const main = page.nodes.find((node) => node.tag === 'main');
    check(main?.attrs['data-product-detail'] === String(product.id), `${label}: page/public identity mismatch`);
    const visible = normalize(textContent(main ?? page.document, true));
    const raw = byId(page, 'raw-ingredient-list');
    const list = sectionContent(page, 'ingredient-list');
    const sources = sectionContent(page, 'sources');
    check(Boolean(raw && list && sources), `${label}: missing ingredient or source section`);
    check(visible.includes(normalize(product.name)) && visible.includes(normalize(product.brand)), `${label}: identity is not present as visible text`);
    check(raw && normalize(textContent(raw, true)).includes(normalize(product.inciText)), `${label}: original INCI text changed or unavailable without JavaScript`);
    const orderedList = list && descendants(list).find((node) => node.tag === 'ol');
    const listEntries = orderedList ? descendants(orderedList).filter((node) => node.tag === 'li') : [];
    check(listEntries.length === tokens.length, `${label}: rendered ingredient count differs from the record`);
    tokens.forEach((token, index) => {
      const entry = listEntries[index];
      check(entry && normalize(textContent(entry, true)).includes(normalize(token.label)), `${label}: missing, reordered or unescaped ingredient text ${token.label}`);
    });
    const sourceLinks = new Set(sources ? descendants(sources).filter((node) => node.tag === 'a').map((node) => node.attrs.href) : []);
    check(sourceLinks.has(product.source?.url), `${label}: original product source is not linked in Sources`);
    if (product.ingredientSource) check(sourceLinks.has(product.ingredientSource.url), `${label}: ingredient source is not linked in Sources`);
    check(sourceLinks.has(product.sourceAudit?.sourceUrl), `${label}: audited declaration source is not linked`);
    check(page.jsonld.length > 0, `${label}: missing structured page identity`);
    const serialized = JSON.stringify(page.jsonld);
    check(!/"(?:aggregateRating|reviewRating|offers)"\s*:/.test(serialized), `${label}: unsupported rating or offer metadata`);
  }

  check(new Set(ingredients.map((ingredient) => ingredient.key)).size === ingredients.length, 'catalog: duplicate ingredient keys');
  check(new Set(ingredients.map((ingredient) => ingredient.slug)).size === ingredients.length, 'catalog: duplicate ingredient slugs');
  for (const ingredient of ingredients) {
    const label = `ingredient ${ingredient.key}`;
    check(safeSlug(ingredient.slug) && nonempty(ingredient.name), `${label}: missing identity or invalid slug`);
    check(ingredient.reviewStatus === 'reviewed', `${label}: unreviewed reference cannot be published`);
    check(Array.isArray(ingredient.sources) && ingredient.sources.length > 0 && ingredient.sources.every(publicUrl), `${label}: missing public reference source`);
    const page = pages.get(path.join(root, 'ingredients', String(ingredient.slug), 'index.html'));
    check(Boolean(page), `${label}: missing reference page`);
    if (!page) continue;
    const text = normalize(textContent(page.document, true));
    const hrefs = new Set(page.nodes.filter((node) => node.tag === 'a').map((node) => node.attrs.href));
    check(text.includes(normalize(ingredient.name)), `${label}: name missing from static text`);
    for (const source of (ingredient.sources ?? []).filter(url => new URL(url).hostname === 'ec.europa.eu')) check(hrefs.has(source), `${label}: reference source not linked`);
    if (ingredient.cosing) {
      check(ingredient.cosing.license === 'CC BY 4.0' && publicUrl(ingredient.cosing.sourceUrl), `${label}: missing CosIng attribution`);
      check(ingredient.cosing.matchKind === 'exact', `${label}: reference requires an exact register match`);
      check(text.toLowerCase().includes('reported function'), `${label}: CosIng functions need their reported-function qualification`);
      check(text.includes('CC BY 4.0'), `${label}: license attribution missing from page`);
      for (const fn of ingredient.cosing.functions ?? []) {
        check(text.includes(normalize(fn.label)) && text.includes(normalize(fn.definition)), `${label}: CosIng wording differs from its source`);
        check(hrefs.has(fn.sourceUrl), `${label}: CosIng function source not linked`);
      }
    }
    for (const id of ingredient.listedProductIds ?? []) {
      const product = products.find((candidate) => candidate.id === id);
      check(product?.ingredients.some((token) => token.canonicalKey === ingredient.key), `${label}: linked product ${id} does not contain this canonical ingredient`);
      if (product) check(hrefs.has(`/products/${product.slug}/`), `${label}: related product ${id} missing its crawlable link`);
    }
  }
  const privateField = /^(service_role|serviceRole|secret|access_token|refresh_token|password|user_id|userId|email|apiKey|api_key)$/i;
  const inspect = (value, location) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      check(!privateField.test(key), `catalog: private field ${location}.${key}`);
      inspect(child, `${location}.${key}`);
    }
  };
  inspect(catalog, 'root');
}

if (errors.length) {
  console.error(`Site validation failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
  errors.slice(0, 100).forEach((error) => console.error(`- ${error}`));
  if (errors.length > 100) console.error(`- ${errors.length - 100} additional issues omitted`);
  process.exitCode = 1;
} else {
  console.log(`Site validation passed: ${pages.size} HTML pages, ${productPages.length} products, ${catalog.ingredients.length} ingredient references, ${linksChecked} internal links, ${sitemapUrls.length} canonical sitemap URLs.`);
}
