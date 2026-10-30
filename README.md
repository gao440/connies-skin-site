# Connie’s Skin website

The static website at https://connieskin.com is published by GitHub Pages from
`main`, repository root. Keep `CNAME` and `.nojekyll`. No installation or runtime
database connection is needed to serve the website.

## Product library

`data/catalog.json` is a public, credential-free snapshot of selected products
from the app’s anonymous catalogue. It includes ordered ingredient names, the
original ingredient text, source URLs/dates and reviewed ingredient identities
with exact CosIng matches. It excludes private data, unreviewed ingredient
judgments, prices, ratings, efficacy claims and product imagery.

The first edition is intentionally bounded to 50–100 products. Source auditing
can narrow the selection further within that range. Public catalogue visibility
alone is not proof that a formula is complete: the release audit also checks
product identity, source declarations and product types. Source audit results
and exclusions are retained in `data/source-audit.json`.

Run with Node 22:

```sh
npm run build
npm run check
```

`scripts/build-library.mjs` generates the product index, individual product pages,
ingredient index/reference pages, source policy page and sitemap entries.
`data/generated-files.json` tracks pages owned by the generator so a removed
record does not leave an obsolete page online. Edit the generator and snapshot,
then regenerate; do not edit generated HTML directly.

The pages contain their content and links in the initial HTML. `library.js`
progressively adds search, brand/type/ingredient filters, sorting and shareable
query parameters. Without JavaScript, all products and detail pages still work.
The 18 initial ingredient references reproduce register definitions verbatim
and attribute the European Commission under CC BY 4.0; they do not assess a
finished product’s safety, efficacy or suitability.

## Refreshing the library

1. Read the existing selection using the app’s anonymous/publishable API access.
   Never use or export a service-role key, login session or private record.
2. Exclude products that are no longer public, have incomplete ingredient
   declarations, or cannot be tied to the correct source. Check source formulas
   and product types rather than relying on the catalogue visibility flag alone.
3. Keep the original source dates separate from the public snapshot time and any
   website source audit. Preserve canonical product IDs/slugs for retained pages.
4. Recompute ingredient-to-product links from reviewed identity matches. Retain
   only exact CosIng matches and verbatim function definitions with attribution.
5. Update `data/catalog.json`, its audit, and the genuine content update date in
   `data/library-config.json`; then regenerate and run all checks. A source-only
   timestamp change is not a reason to claim the formula has been verified.

Publishing is manual through the normal reviewed Git change. There is no
background catalogue synchronization or scheduled re-verification. The release
validator checks source visibility, ingredient ordering and content preservation,
reference attribution, local links/fragments, canonicals and sitemap coverage.
CI also checks that the committed pages match the generator and snapshot.

## Preview and signup attribution

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/products/. Check desktop/mobile layouts, filter
combinations, zero results/reset, browser navigation and product/source links.

Library calls to action use a small allowlist of `source` query values.
`script.js` copies those into the existing waitlist form’s source field. No
additional analytics service, cookies or local storage are introduced. This
identifies the source of a submitted signup; it does not measure page views.
