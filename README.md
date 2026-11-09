# Personal Research Portfolio Website

Static research portfolio for Selman Ali Dokumacı, documenting independent research in computational biophysics, molecular dynamics simulation, free energy calculations, and condition-responsive macromolecular therapeutic design.

The site is a bilingual (EN/TR) static research index: a researcher profile and research
record on the homepage, web-native research dossiers for each project, and a technical
bibliography of supporting reports.

## Tech Stack

- **HTML5**: Semantic, accessible markup. No framework, no client-side routing.
- **Tailwind CSS v4**: Compiled ahead of time from `src/input.css` to `assets/css/style.css`
  using the standalone CLI. No npm install and no CDN at runtime.
- **Fonts**: Instrument Serif (display), Hanken Grotesk (body and UI), IBM Plex Mono
  (data, labels, stamps) and Caveat (handwritten annotations), served from Google Fonts.
- **Vanilla JavaScript**, no dependencies:
  `assets/js/site-ui.js` (scrollspy, share control, figure viewer),
  `assets/js/ink-brush.js` (procedural ink-brush engine, canvas) and
  `assets/js/ink-site.js` (masthead, stop-motion reveals, brush marks, painted card borders).

## File Structure

```
.
├── index.html                  # Researcher profile + research index (EN)
├── macs-project.html           # MACS research dossier (EN)
├── mdx-project.html            # MDX research dossier (EN)
├── macs-evidence-summary.html  # Report pages (EN)
├── macs-evidence-matrix.html
├── macs-decision-log.html
├── macs-mdp-consistency.html
├── 404.html
├── tr/                         # Turkish mirror of every page above except 404
├── src/input.css               # Design tokens + component styles (edit this)
├── assets/css/style.css        # Compiled output (generated — do not edit by hand)
├── assets/css/ink-core.css     # Ink & Instrument: tokens, masthead, motion, stamps, brush edges
├── assets/css/ink-home.css     # Homepage composition
├── assets/css/ink-pages.css    # Dossier / report / 404 skin over the style.css components
├── assets/css/ink-notebook-bar.css  # Shared navigation inside the MDX Living Notebook
├── assets/js/site-ui.js        # Scrollspy, share control, figure viewer
├── assets/js/ink-brush.js      # Procedural dry-brush engine (canvas)
├── assets/js/ink-site.js       # Masthead, reveals, brush marks, painted card borders
├── assets/macs/, assets/mdx/   # Authentic project figures
├── build_css.sh                # CSS build (bash)
├── build_python.py             # CSS build (python equivalent)
├── serve.py                    # Local preview with clean HTML URLs and custom 404
├── robots.txt, sitemap.xml, vercel.json
└── README.md
```

## Viewing Locally

```bash
python3 serve.py 8000
# then open http://localhost:8000
```

Use an HTTP server rather than opening files directly: all asset and page links are
site-absolute (`/assets/...`, `/macs-project`), matching the deployed routes.
The preview server resolves clean URLs to the actual HTML files, redirects `.html`
aliases to their public URLs, and serves the site’s 404 page with HTTP 404 for unknown
routes. Python’s plain `http.server` does not resolve extensionless HTML routes and
will return “File not found” when following project, report, or language links.

## Building the CSS

`assets/css/style.css` is generated. After editing `src/input.css`:

```bash
./build_css.sh          # downloads the Tailwind standalone CLI on first run
# or
python3 build_python.py
```

The build writes to a temp file first and only replaces `style.css` on success, so a
failed build cannot leave a broken stylesheet behind. The downloaded `tailwindcss`
binary is gitignored.

## Visual System: Ink & Instrument

The pages are styled by the Ink & Instrument layer: warm paper, sumi ink, terracotta for
MDX and slate-green for MACS, monumental Instrument Serif type, Caveat marginalia and
stop-motion (stepped) motion. `style.css` keeps providing layout and component structure;
because it is compiled entirely inside `@layer`, the unlayered `ink-*.css` files override it
without specificity tricks, and `ink-pages.css` remaps its theme tokens (`--color-*`,
`--font-*`) to the Ink palette and type.

- **Brush**: card borders, section marks and the hero underline are painted by
  `ink-brush.js`, a bristle simulation with ink depletion and dry-brush texture. Project
  cards paint the top edge left to right, pause, then the bottom edge right to left; the
  strokes stay while hovered or focused and lift on exit. On touch screens the border is
  painted once when the card scrolls into view.
- **Illustrations**: dossier title plates are inline SVG, drawn in steps when they enter the
  view. They restate the dossier text only and carry their own disclaimers
  ("schematic", "not a floorplan", "in silico hypothesis").
- **Motion budget**: no animation library; every animated element has a complete static
  state, and `prefers-reduced-motion: reduce` shows the finished composition at once.

## Design Tokens (structure layer)

All colour, type, spacing, width and border values are defined once as tokens in the
`@theme` block of `src/input.css`. Component classes consume those tokens; avoid
introducing one-off literal values in markup.

| Token group | Purpose |
| --- | --- |
| `--color-paper` / `--color-surface` / `--color-sunken` | Page, card and inset backgrounds |
| `--color-ink` / `--color-ink-muted` / `--color-ink-faint` | Text hierarchy |
| `--color-navy` / `--color-teal` | Primary and secondary accents |
| `--color-rule` / `--color-rule-strong` | Hairline and emphasised separators |
| `--font-serif` / `--font-sans` / `--font-mono` | Headings / body and UI / data |
| `--measure` | Reading measure (~65–80 characters) |
| `--w-page` / `--w-text` | Outer container and single-column reading width |

Reusable components, all defined in `src/input.css`:

`.wrap` `.wrap-text` `.dossier` · `.masthead` `.navlink` `.lang` `.navdrawer` `.backlink` ·
`.page-head` `.page-title` `.eyebrow` `.identity__*` · `.sec` `.sec__num` `.sec__title` ·
`.entry` `.entry__meta` `.textlink` · `.areas` `.area` · `.biblio` · `.figure` `.figure__cap`
`.figure__num` · `.dtable` · `.note` `.footnote` · `.status` `.tag` · `.rail` · `.toc`
`.toc-collapse` · `.research-breadcrumb` · `.byline` `.docmeta` `.share-*` ·
`.evidence-record` · `.decision` · `.spec` `.stage` · `.docnav` `.site-foot`

## Adding a New Project

1. Copy `macs-project.html` as a template and replace the content, keeping the
   `.dossier` three-column structure (TOC / article / metadata rail).
2. Number the sections sequentially (`.sec__num`) and the figures (`Figure 1`, `Figure 2`, …).
3. Add an `.entry` block to the `#research` section of `index.html`.
4. Mirror both files under `tr/`, keeping the EN/TR `<link rel="alternate">` pairs and the
   `.lang` switch pointing at each other.
5. Add `<url>` entries for both language versions to `sitemap.xml`.

## Adding a New Report

1. Create the page using an existing report page as a template.
2. Add a row to the `.biblio` table in the `#reports` section of `index.html` and, if the
   report belongs to a project, to that project's documentation table.
3. Add the sibling links in the page's `.docnav` and to the other report pages' `.docnav`.
4. Mirror under `tr/` and add both URLs to `sitemap.xml`.

## Routes

`vercel.json` sets `cleanUrls: true`, so pages are served without the `.html` extension
(`/macs-project`, `/tr/macs-project`). Internal links use the extensionless form.
`/index.html` and `/tr/index.html` permanently redirect to `/` and `/tr/`. Do not rename
these routes — they are indexed and referenced by `sitemap.xml` and by each page's
canonical and `hreflang` metadata.

## Deployment

Static files, no build step required at deploy time (the CSS is committed). Deployable to
Vercel, Netlify, Cloudflare Pages, GitHub Pages or any static host. The production domain
is `selmandokumaci.com`.
Hosts must resolve extensionless HTML paths and serve `404.html` for unknown routes;
`vercel.json` provides the clean-URL configuration for Vercel.

## Accessibility & Performance Notes

- Semantic landmarks, a skip link, one `<h1>` per page and an unbroken heading order.
- Visible focus rings via a single `:focus-visible` rule; interactive targets are at least
  24px tall.
- Figures carry alt text and explicit `width`/`height` so they reserve space before loading.
- `prefers-reduced-motion: reduce` disables transitions and animations site-wide; brush
  strokes and drawings are shown complete.
- No analytics, cookies or tracking. External requests are limited to Google Fonts.
