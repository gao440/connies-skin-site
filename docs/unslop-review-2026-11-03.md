# Website design review — November 3, 2026

Applied the polish workflow from [Unslop](https://github.com/heydamir/unslop)
by [Damir Sokolovsky](https://x.com/heydamir), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Reference revision: `a6f121eee5f29c2f74976b75456feae8b66afb3a`.
This is a project-specific adaptation of that workflow, not a copy of its example designs.

## Direction

- Product: help people understand their skincare and organize a routine.
- Character: calm, warm and precise.
- World: a personal skincare notebook, using the existing green palette and serif type.
- Visual emphasis: the real app captures already on the website.
- Signature detail: numbered steps and ingredient lists.

## Audit and changes

The existing brand and content called for a polish pass. The audit found a radial
hero wash and orb, colored shadows, decorative glyph tiles/circles, uppercase
tracked labels, oversized pill controls, hover lifts and uneven component spacing.
The library introduction also put the search and results too far down the page.

| Pass | Result |
| --- | --- |
| Spacing | Aligned active card, field and section spacing around a 4px rhythm; device frame geometry retained. |
| Color | Flat existing pale surfaces, neutral shadows, teal actions and readable muted text; removed hero wash and orb. |
| Icons | Removed decorative step, support and policy glyphs; kept functional arrows, menu and disclosure indicators. |
| Copy | Named the browsing page “Skincare product library”; removed terminal periods from marketing headings. |
| Type | Preserved serif headlines and system interface text; sentence-case labels, lighter weights, larger source labels and tabular counts. |
| Layout | Kept section order and data grids; made the library index introduction shorter and the hero phone/caption flow naturally. |
| Details | Simpler control/card corners, visible current navigation item, higher-contrast focus rings and step numbers. |
| Visuals | Retained genuine app screenshots, removed surrounding filler. No generated image or image prompt was needed. |
| Motion | Removed hover lifts; explicit short color/transform transitions and a short mobile menu entrance; retained reduced-motion support. |

The catalog snapshot, source audits, ingredient order, original declarations,
CosIng quotations, source dates and JavaScript behavior are unchanged. Stylesheet
versions were updated in both authored pages and the generator. Data timestamps
were not changed for a visual edit.

## Verification

- Automated site checks: 83 HTML pages, 53 products, 18 ingredient references,
  3,377 internal links and 82 sitemap URLs.
- Browser review at 1280px desktop, 900px tablet and 390px mobile widths.
- Search + brand filtering, zero results/reset, filter persistence after reload,
  mobile menu/Escape, original ingredient disclosure and source reference display.
- No horizontal overflow on the reviewed homepage, library, product, ingredient,
  guide, support, privacy or terms pages; no browser errors/warnings observed.
- Waitlist layout and source wiring reviewed without submitting an email.
- Independent source review confirmed preserved data and valid focus contrast.
