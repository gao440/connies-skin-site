import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(await readFile(path.join(root, 'data/catalog.json'), 'utf8'));
const config = JSON.parse(await readFile(path.join(root, 'data/library-config.json'), 'utf8'));
assert.equal(catalog.source.kind, 'anonymous-public-api');
assert.equal(catalog.source.visibility, 'surfaced-only');
assert(catalog.products.length >= 50 && catalog.products.length <= 100, 'Launch library requires 50–100 public products');
const products = [...catalog.products].sort((a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`, 'en'));
const ingredients = [...catalog.ingredients].sort((a, b) => a.name.localeCompare(b.name, 'en'));
const refs = new Map(ingredients.map(item => [item.key, item]));
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const safeURL = value => { const url = new URL(value); assert(['https:', 'http:'].includes(url.protocol), 'Unsafe source URL'); return escape(url.href); };
const date = value => new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
const time = value => `<time datetime="${escape(value)}">${date(value)}</time>`;
const categoryNames = catalog.categoryLabels;
const category = p => categoryNames[p.category] || 'Skincare';
const productURL = p => `/products/${p.slug}/`;
const ingredientURL = i => `/ingredients/${i.slug}/`;
const sourceName = source => ({brand_official:'Brand product page', retailer:'Retailer ingredient source', open_beauty_facts:'Open Beauty Facts'}[source.kind] || 'Product source');
const allSlugs = new Set();
for (const product of products) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug), 'Unsafe product slug');
  assert(!allSlugs.has(product.slug), 'Duplicate product slug'); allSlugs.add(product.slug);
  assert(product.name && product.brand && product.inciText.trim() && product.ingredients.length, 'Incomplete product');
  safeURL(product.source.url);
  assert.equal(product.sourceAudit?.outcome, 'matched-recorded-declaration', 'Product needs a complete source declaration audit');
  safeURL(product.sourceAudit.sourceUrl);
  assert(Number.isFinite(Date.parse(product.sourceAudit.checkedAt)), 'Source audit needs a valid date');
  assert.equal(product.image, null, 'Initial edition uses no product imagery');
}
for (const ingredient of ingredients) {
  assert.equal(ingredient.reviewStatus, 'reviewed');
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ingredient.slug), 'Unsafe ingredient slug');
  assert.equal(ingredient.cosing.matchKind, 'exact', 'Only exact register matches can be published');
  assert(ingredient.cosing.functions.every(f => f.label && f.definition && f.sourceUrl));
}

const generated = [];
const write = async (file, content) => { await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await writeFile(path.join(root, file), content); generated.push(file); };
const header = active => `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header legal-header" data-header><div class="shell nav-shell">
<a class="brand" href="/" aria-label="Connie's Skin home"><img src="/assets/icon-v2.webp" width="42" height="42" alt=""><span>Connie's Skin</span></a>
<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle><span class="sr-only" data-nav-label>Open navigation</span><span aria-hidden="true"></span><span aria-hidden="true"></span></button>
<nav class="site-nav" id="site-nav" aria-label="Primary navigation" data-nav><a href="/products/"${active === 'products' ? ' aria-current="page"' : ''}>Products</a><a href="/ingredients/"${active === 'ingredients' ? ' aria-current="page"' : ''}>Ingredients</a><a href="/guides/">Guides</a><a href="/support.html">Support</a><a class="nav-cta" href="/?source=product-library#waitlist">Join the waitlist</a></nav>
</div></header>`;
const footer = `<footer class="site-footer compact-footer"><div class="shell footer-bottom"><p>© <span data-year>2026</span> Connie's Skin. Cosmetic information, not medical advice.</p><nav aria-label="Footer"><a href="/">Home</a><a href="/products/">Products</a><a href="/ingredients/">Ingredients</a><a href="/guides/">Guides</a><a href="/support.html">Support</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a></nav></div></footer>`;
const breadcrumbs = entries => `<nav aria-label="Breadcrumb"><ol class="breadcrumbs">${entries.map(([label, url]) => `<li${url ? '' : ' aria-current="page"'}>${url ? `<a href="${url}">${escape(label)}</a>` : escape(label)}</li>`).join('')}</ol></nav>`;
function page({title, description, url, body, active, crumbs, entity, collection = false, filter = false}) {
  const canonical = config.siteUrl + url;
  const schema = {'@context':'https://schema.org','@graph':[
    {'@type':collection ? 'CollectionPage' : 'WebPage', '@id':canonical, url:canonical, name:title, description, inLanguage:'en', isAccessibleForFree:true, datePublished:config.publishedAt, dateModified:config.updatedAt, publisher:{'@id':`${config.siteUrl}/#organization`, '@type':'Organization', name:"Connie's Skin", url:config.siteUrl+'/'}, ...(entity ? {mainEntity:entity} : {})},
    {'@type':'BreadcrumbList', itemListElement:crumbs.map(([name, location], n) => ({'@type':'ListItem', position:n+1, name, item:config.siteUrl+(location || url)}))}
  ]};
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0f6e66">
<title>${escape(title)} | Connie's Skin</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="Connie's Skin"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${config.siteUrl}/assets/social-preview-v5.jpg"><meta property="og:image:alt" content="Connie's Skin app logo and welcome screen"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${config.siteUrl}/assets/social-preview-v5.jpg">
<link rel="icon" type="image/png" href="/assets/favicon-v2.png"><link rel="apple-touch-icon" href="/assets/apple-touch-icon-v2.png"><link rel="stylesheet" href="/styles.css?v=10"><link rel="stylesheet" href="/library.css?v=1">
<script type="application/ld+json">${json(schema)}</script></head><body>${header(active)}${body}${footer}<script src="/script.js?v=7"></script>${filter ? '<script src="/library.js?v=1"></script>' : ''}</body></html>\n`;
}
function card(p, searchable = false) {
  const keys = [...new Set(p.ingredients.filter(i => i.reviewStatus === 'reviewed' && refs.has(i.canonicalKey)).map(i => i.canonicalKey))];
  const search = `${p.name} ${p.brand} ${category(p)} ${p.inciText}`;
  return `<li${searchable ? ` data-product="${p.id}" data-name="${escape(p.name)}" data-brand="${escape(p.brand)}" data-category="${escape(p.category)}" data-ingredients="${escape(keys.join('|'))}" data-search="${escape(search)}"` : ''}><a class="product-card" href="${productURL(p)}"><span class="product-brand">${escape(p.brand)}</span><h3>${escape(p.name)}</h3><p class="product-kind">${category(p)}</p><span class="card-footer"><span>${p.ingredients.length} listed ingredients</span><span class="card-arrow" aria-hidden="true">↗</span></span></a></li>`;
}
const cta = source => `<aside class="library-cta" aria-label="Try Connie's Skin"><div><h2>Give your products a place in your routine.</h2><p>Connie’s Skin helps you organize what you own, plan your morning and evening steps, and keep notes about your skin.</p></div><a class="button button-light" href="/?source=${source}#waitlist">Join the waitlist</a></aside>`;
const option = (value, label) => `<option value="${escape(value)}">${escape(label)}</option>`;
const brands = [...new Set(products.map(p => p.brand))].sort((a,b) => a.localeCompare(b, 'en'));
const categories = [...new Set(products.map(p => p.category))].sort((a,b) => (categoryNames[a] || 'Skincare').localeCompare(categoryNames[b] || 'Skincare', 'en'));
const libraryCrumbs = [['Home','/'],['Products',null]];
await write('products/index.html', page({
  title:'Skincare product library', description:`Explore ${products.length} skincare products from ${brands.length} brands. Read ingredient lists, follow sources and browse ingredient references, without an account.`, url:'/products/', active:'products', crumbs:libraryCrumbs, collection:true, filter:true,
  entity:{'@type':'ItemList',numberOfItems:products.length,itemListElement:products.map((p,n) => ({'@type':'ListItem',position:n+1,url:config.siteUrl+productURL(p),name:`${p.brand} ${p.name}`}))},
  body:`<main id="main"><header class="library-hero"><div class="shell">${breadcrumbs(libraryCrumbs)}<p class="kicker">The product library</p><h1>Get to know what’s<br>in your skincare.</h1><p class="library-lede">Find a product, read its ingredient list, and follow the sources. A little more context for the bottles on your shelf.</p><p class="library-meta"><span>${products.length} products</span><span>${brands.length} brands</span><span>Free to browse. No account needed.</span></p></div></header>
  <div class="shell library-main"><form class="library-tools" data-library-filters hidden role="search" aria-label="Filter the product library"><fieldset><legend class="sr-only">Find products</legend><div class="library-fields"><div class="library-field"><label for="product-search">Search products or ingredients</label><input id="product-search" type="search" name="q" placeholder="Try niacinamide or CeraVe" autocomplete="off"></div><div class="library-field"><label for="brand-filter">Brand</label><select id="brand-filter" name="brand">${option('','All brands')}${brands.map(b => option(b,b)).join('')}</select></div><div class="library-field"><label for="category-filter">Product type</label><select id="category-filter" name="category">${option('','All types')}${categories.map(c => option(c,categoryNames[c])).join('')}</select></div></div><div class="library-secondary"><div class="library-field"><label for="ingredient-filter">Common ingredient</label><select id="ingredient-filter" name="ingredient">${option('','Any ingredient')}${ingredients.map(i => option(i.key,i.name)).join('')}</select></div><div class="library-field"><label for="product-sort">Sort by</label><select id="product-sort" name="sort">${option('','Brand, A–Z')}${option('name','Product name, A–Z')}</select></div><button class="library-reset" type="reset">Clear filters</button></div></fieldset></form>
  <noscript><p>All ${products.length} products are listed below. You can also use your browser’s Find command to look for a product or brand.</p></noscript>
  <div class="results-heading"><h2 role="status" aria-live="polite" aria-atomic="true" data-result-count>${products.length} products</h2><a class="text-link" href="/ingredients/">Explore ingredient references →</a></div><ul class="product-grid" data-product-grid>${products.map(p => card(p,true)).join('\n')}</ul><div class="empty-results" data-empty-results hidden><h3>No products match those filters.</h3><p>Try a different spelling, a broader search, or clear your filters. This library starts with ${products.length} products.</p></div>
  <p class="library-note">Ingredient lists describe what is recorded for a product; they don’t establish whether it will suit your skin. Formulas can change, so check the label on your own packaging. <a href="/products/about/">About our sources and this library</a>.</p>${cta('product-library')}</div></main>`
}));

for (const p of products) {
  const crumbs = [['Home','/'],['Products','/products/'],[p.name,null]];
  const hasIngredientSource = p.ingredientSource && p.ingredientSource.url;
  const sources = [{...p.source, label:sourceName(p.source)}, ...(hasIngredientSource ? [{...p.ingredientSource, label:sourceName(p.ingredientSource)}] : [])];
  const description = `Read the recorded ingredient list for ${p.name} by ${p.brand}, with source links and ingredient references.`;
  const matches = products.filter(other => other.id !== p.id && other.brand === p.brand).slice(0,3);
  const list = p.ingredients.map(i => {
    const ref = i.reviewStatus === 'reviewed' && refs.get(i.canonicalKey);
    return `<li>${ref ? `<a href="${ingredientURL(ref)}">${escape(i.label)}</a>` : `<span>${escape(i.label)}</span>`}</li>`;
  }).join('');
  const evidenceDate = hasIngredientSource && p.ingredientSource.retrievedAt;
  await write(`products/${p.slug}/index.html`, page({title:`${p.name} — ingredients`, description, url:productURL(p), crumbs,
    entity:{'@type':'Product',name:p.name,brand:{'@type':'Brand',name:p.brand},category:category(p),url:config.siteUrl+productURL(p),description,sameAs:p.source.url},
    body:`<main id="main" data-product-detail="${p.id}"><header class="library-hero"><div class="shell">${breadcrumbs(crumbs)}<p class="kicker">${escape(p.brand)} · ${category(p)}</p><h1>${escape(p.name)}</h1><p class="library-lede">An ingredient list you can read, with references you can follow.</p><p class="library-meta"><span>${p.ingredients.length} listed ingredients</span><span>Added to the website ${time(config.publishedAt)}</span></p></div></header>
    <div class="shell detail-layout"><article class="detail-body"><h2 id="ingredient-list">What ingredients are listed?</h2><p>These ingredient names appear in the recorded list for this product. Linked names open an ingredient reference. The order is preserved from our catalogue record.</p><ol class="ingredient-list">${list}</ol><details><summary>Read the original ingredient text</summary><p class="formula-text" id="raw-ingredient-list">${escape(p.inciText.trim())}</p></details>
    <h2 id="reading-this-page">How to read this list</h2><p>An ingredient’s presence doesn’t tell us its concentration or how the finished product will work for you. This page is a reference, not a product review or a suitability rating.</p><p>Formulas and regional versions can change. Compare this record with the packaging you have. Product names are the brand’s names; they aren’t claims independently verified by Connie’s Skin.</p>
    <h2 id="sources">Sources and dates</h2><ul class="source-list">${sources.map(s => `<li><a href="${safeURL(s.url)}" rel="noopener noreferrer">${escape(s.label)} — ${escape(new URL(s.url).hostname.replace(/^www\./,''))}</a>${s.retrievedAt ? `<span class="source-detail">Ingredient evidence retrieved ${time(s.retrievedAt)}${s.market ? ` · ${escape(s.market)}` : ''}</span>` : s.lastModifiedAt ? `<span class="source-detail">Source record updated ${time(s.lastModifiedAt)}. This is not a formula verification date.</span>` : ''}</li>`).join('')}</ul>
    ${!evidenceDate ? '<p class="source-detail">A separate ingredient-source retrieval date is not recorded for this product.</p>' : ''}<p class="source-detail">Recorded ingredient declaration compared with the <a href="${safeURL(p.sourceAudit.sourceUrl)}" rel="noopener noreferrer">source declaration</a> on ${time(p.sourceAudit.checkedAt)}. Capitalization, spacing and punctuation may differ; check your packaging for the version you have.</p><p class="source-detail">Public catalogue availability checked ${time(catalog.exportedAt)}. This is a separate catalogue visibility check.</p><p><a href="/products/about/">How this library uses sources</a> · <a href="mailto:support@connieskin.com?subject=${encodeURIComponent(`Product correction: ${p.brand} ${p.name}`)}">Report a correction</a></p></article>
    <aside class="detail-aside" aria-label="Product details"><h2>At a glance</h2><dl><dt>Brand</dt><dd><a href="/products/?brand=${encodeURIComponent(p.brand)}">${escape(p.brand)}</a></dd><dt>Product type</dt><dd>${category(p)}</dd><dt>Ingredient names listed</dt><dd>${p.ingredients.length}</dd>${p.variantName ? `<dt>Variant</dt><dd>${escape(p.variantName)}</dd>` : ''}${p.packageSize ? `<dt>Recorded package size</dt><dd>${escape(p.packageSize)}</dd>` : ''}<dt>Explore</dt><dd><a href="#ingredient-list">Ingredient list</a> · <a href="#sources">Sources</a></dd></dl><a class="button button-primary" href="/?source=product-page#waitlist">Plan your routine with Connie</a><p class="aside-note">Join the waitlist for our free app. You can use products you already own.</p></aside></div>
    <section class="related-products"><div class="shell"><p class="kicker">Keep exploring</p><h2>More from ${escape(p.brand)}</h2><ul class="product-grid">${matches.map(m => card(m)).join('')}</ul></div></section></main>`
  }));
}

const ingredientCrumbs = [['Home','/'],['Ingredients',null]];
await write('ingredients/index.html', page({title:'Skincare ingredient references',description:'Explore ingredient names and reported functions from the EU CosIng register, with links to skincare products that list them.',url:'/ingredients/',active:'ingredients',crumbs:ingredientCrumbs,collection:true,
  body:`<main id="main"><header class="library-hero"><div class="shell">${breadcrumbs(ingredientCrumbs)}<p class="kicker">Ingredient references</p><h1>A name on the label.<br>A source behind it.</h1><p class="library-lede">Explore ${ingredients.length} ingredient references, their reported functions in the EU CosIng register, and products in this library that list them.</p></div></header><div class="shell library-main"><ul class="ingredient-reference-grid">${ingredients.map(i => `<li><a href="${ingredientURL(i)}"><strong>${escape(i.name)}</strong><span>Listed in ${i.listedProductIds.length} library products →</span></a></li>`).join('')}</ul><p class="library-note">Reported functions describe information in a published register. They do not establish the safety, effectiveness, or suitability of a finished product. <a href="/products/about/">Read about our sources</a>.</p>${cta('ingredient-page')}</div></main>`
}));
for (const i of ingredients) {
  const listed = products.filter(p => i.listedProductIds.includes(p.id));
  const crumbs = [['Home','/'],['Ingredients','/ingredients/'],[i.name,null]];
  await write(`ingredients/${i.slug}/index.html`, page({title:`${i.name} — ingredient reference`,description:`Read the reported functions of ${i.name} in the EU CosIng register and explore ${listed.length} products in this library that list it.`,url:ingredientURL(i),crumbs,
    body:`<main id="main"><header class="library-hero"><div class="shell">${breadcrumbs(crumbs)}<p class="kicker">Ingredient reference</p><h1>${escape(i.name)}</h1><p class="library-lede">Listed in ${listed.length} products in our library. Read the register’s reported functions and follow the source.</p></div></header><div class="shell detail-layout"><article class="detail-body"><h2>What does the CosIng register report?</h2><p>The European Commission’s CosIng register lists the following functions for <strong>${escape(i.cosing.inciName)}</strong>. The function names and definitions below reproduce the register’s wording.</p><div class="function-list">${i.cosing.functions.map(f => `<section class="function-entry"><h3>Reported function: ${escape(f.label)}</h3><blockquote><p>${escape(f.definition)}</p></blockquote><a class="source-detail" href="${safeURL(f.sourceUrl)}" rel="noopener noreferrer">Source: European Commission, CosIng</a></section>`).join('')}</div><h2>What does that mean for a product?</h2><p>A reported ingredient function is not a finding that a finished product delivers that result. This reference does not establish safety, efficacy or whether a product suits your skin.</p><h2 id="sources">Source and attribution</h2><p>European Commission, CosIng. Function names and definitions reproduced verbatim under <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener noreferrer">CC BY 4.0</a>. Presentation and formatting have been changed; the quoted wording has not.</p><ul class="source-list">${[...new Set([i.cosing.sourceUrl,...i.sources.filter(url => new URL(url).hostname === 'ec.europa.eu')])].map(url => `<li><a href="${safeURL(url)}" rel="noopener noreferrer">European Commission ingredient reference</a></li>`).join('')}</ul><p class="source-detail">Register data retrieved ${time(i.cosing.retrievedAt)}. Website page published ${time(config.publishedAt)}.</p><p><a href="/products/about/">About our sources</a></p></article><aside class="detail-aside" aria-label="Ingredient reference details"><h2>Follow the label</h2><dl><dt>CosIng ingredient name</dt><dd>${escape(i.cosing.inciName)}</dd><dt>In this library</dt><dd>${listed.length} products</dd><dt>Reference source</dt><dd>European Commission, CosIng</dd></dl><a class="button button-primary" href="#listed-products">See products below</a></aside></div><section class="related-products" id="listed-products"><div class="shell"><h2>Products that list ${escape(i.name)}</h2><p>These products have a recorded ingredient match. This is not a ranking or a recommendation.</p><ul class="product-grid">${listed.map(p => card(p)).join('')}</ul>${cta('ingredient-page')}</div></section></main>`
  }));
}
const aboutCrumbs = [['Home','/'],['Products','/products/'],['About the library',null]];
await write('products/about/index.html', page({title:'About the product library and our sources', description:'How Connie’s Skin publishes product ingredient lists, attributes reference information and records source dates.', url:'/products/about/', crumbs:aboutCrumbs,
  body:`<main id="main"><header class="library-hero"><div class="shell">${breadcrumbs(aboutCrumbs)}<p class="kicker">Our sources</p><h1>Know where the<br>information comes from.</h1><p class="library-lede">The library brings ingredient lists and reference sources into one place, with the limits of those records kept in view.</p></div></header><div class="shell detail-layout"><article class="detail-body"><h2>What is in the first edition?</h2><p>This edition includes ${products.length} products across ${brands.length} brands, selected from the public Connie’s Skin catalogue. Each has a recorded ingredient declaration and a source link. Inclusion isn’t an endorsement, a quality ranking, or confirmation that a product is available to buy.</p><h2>Ingredient lists and product information</h2><p>Product names, brands and ingredient declarations come from the sources linked on each product page. Some ingredient evidence comes from a separately identified retailer page. Product types use our existing catalogue categories. We preserve the recorded ingredient text and the order of its parsed names.</p><p>Check your packaging for the formula you have: names, regional versions and formulas can change. A linked ingredient reference identifies a recorded ingredient; it does not predict a product’s result or tell you an ingredient’s concentration.</p><h2>Reported ingredient functions</h2><p>Our ingredient pages attribute function names and definitions to the European Commission’s CosIng register. We reproduce that wording verbatim under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, with links to the source. Only the layout is changed. A register entry is not approval of a finished product or evidence of its safety or efficacy.</p><h2>Dates mean different things</h2><ul><li><strong>Added to the website:</strong> when we published a page here.</li><li><strong>Source record updated:</strong> the timestamp recorded for the upstream product record. It does not mean we rechecked its ingredient list.</li><li><strong>Ingredient evidence retrieved:</strong> when a separately recorded ingredient source was captured, where that date exists.</li><li><strong>Public catalogue availability checked:</strong> when we confirmed that the record was available through the app’s public catalogue.</li></ul><p>The public catalogue snapshot used for this edition was checked ${time(catalog.exportedAt)}. That availability check is separate from our source audit. For each included product, we also compared the complete recorded ingredient declaration with its source, including the start and end of the list. The date of that comparison appears on the product page. Capitalization, spacing and punctuation may differ. This does not guarantee that every regional version or later bottle has the same formula.</p><h2>Corrections and updates</h2><p>If a name, ingredient list or link needs correcting, <a href="mailto:support@connieskin.com?subject=Product%20library%20correction">email support@connieskin.com</a> with the product page and a source or packaging reference. We update records when we have new evidence; dates are not refreshed just to make a page look new.</p><p>Connie’s Skin provides cosmetic information and routine tools, not medical advice. Brand product names and any statements on linked brand pages belong to their respective brands.</p></article><aside class="detail-aside"><h2>Start with a bottle you know.</h2><p>Find its recorded ingredient list, then follow a name to its reference.</p><a class="button button-primary" href="/products/">Explore products</a><a class="text-link" href="/ingredients/">Browse ingredient references</a></aside></div></main>`
}));

// Keep the original pages and their content dates; append canonical library pages.
const sitemapFile = path.join(root, 'sitemap.xml');
const sitemap = await readFile(sitemapFile, 'utf8');
const oldEntries = [...sitemap.matchAll(/<url>[\s\S]*?<\/url>/g)].map(m => m[0]).filter(entry => !/<loc>https:\/\/connieskin\.com\/(products|ingredients)\//.test(entry));
const generatedURLs = generated.filter(file => file.endsWith('/index.html')).map(file => '/' + file.replace(/index\.html$/, ''));
const updatedEntries = oldEntries;
await writeFile(sitemapFile, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...updatedEntries,...generatedURLs.map(url => `<url><loc>${config.siteUrl}${url}</loc><lastmod>${config.updatedAt}</lastmod></url>`)].map(entry=>'  '+entry).join('\n')}\n</urlset>\n`);
const manifestPath = path.join(root, 'data/generated-files.json');
let previous = [];
try { previous = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const old of previous) {
  assert(/^(products|ingredients)\/(?:[a-z0-9-]+\/)?index\.html$/.test(old), 'Unsafe generated manifest path');
  if (!generated.includes(old)) await rm(path.join(root, old));
}
await writeFile(manifestPath, JSON.stringify(generated,null,2)+'\n');
console.log(`Built ${products.length} product pages, ${ingredients.length} ingredient pages, and 3 library indexes/about pages.`);
