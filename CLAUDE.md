# CLAUDE.md — Space Resume Site

> Auto-loaded by Claude Code at the start of every session. Codex is directed by
> [`AGENTS.md`](AGENTS.md) to read and follow this file too. Keep it short; it is a
> map and a set of rules, not a full reference. The full reference lives in
> [`docs/SITE-GUIDE.md`](docs/SITE-GUIDE.md).

## What this is

A single-page, animated personal portfolio / résumé for **Orion Powers** — a "gold on
deep-space" themed site (constellation/Orion motif). Pure **static site**: HTML + inline
CSS + inline JavaScript. **No build step, no framework install, no server code.**

## Where everything lives

The deployable site is the **`Home page animation redesign/github-export/`** folder.
Everything else (this file, `docs/`, the root `README.md`) is project tooling that is
**not** part of the deployed site.

```
Space-Resume-Site/
├─ AGENTS.md                      ← Codex entry point; loads this guide
├─ CLAUDE.md                      ← you are here (project map + rules)
├─ docs/
│  ├─ SITE-GUIDE.md              ← full reference: sections, content, edit cookbook
│  └─ CHANGELOG.md               ← running log — UPDATE THIS after every change
└─ Home page animation redesign/
   └─ github-export/              ← THE ACTUAL SITE (deploy this folder)
      ├─ index.html               ← the whole page: markup + CSS + animation script
      ├─ support.js               ← generated DC runtime (renders the page) — DO NOT EDIT
      ├─ image-slot.js            ← drag-and-drop image placeholder component
      ├─ images/                  ← photos, seals, project thumbnails
      └─ documents/Orion-Powers-Resume.pdf
```

Almost all real work happens in **`index.html`**. It is one ~1,700-line file:
content markup at the top, one big `<script data-dc-script>` animation block near the
bottom (~line 798+).

## Rules for working here

1. **Never edit `support.js`.** It is generated (`// GENERATED from dc-runtime/src/*.ts`).
   Changes belong in `index.html`.
2. **Content is in the HTML markup, not in JS data arrays.** Experience, education,
   projects, and contact text are hand-written markup blocks. Edit them in place.
3. **Locate things by stable anchors, not line numbers.** Line numbers in the docs
   drift. Search for HTML comment markers (`<!-- EDUCATION -->`) and element ids
   (`id="ax-edu"`) instead — the `ax-` prefix namespaces everything on this page.
4. **Verify visually.** This is a heavily animated site; unit tests don't exist. Run it
   locally and look. See "Run it locally" below.
5. **After any change, append an entry to [`docs/CHANGELOG.md`](docs/CHANGELOG.md)** and,
   if you changed structure/sections/anchors, update [`docs/SITE-GUIDE.md`](docs/SITE-GUIDE.md)
   so it stays a true "live document." This is what keeps future sessions cheap.

## Run it locally

The page fetches sibling files, so it must be served over HTTP (not opened via `file://`).

```bash
cd "Home page animation redesign/github-export"
python -m http.server 8000
# open http://localhost:8000
```

First load needs internet — React/Babel come from `unpkg.com` and fonts from Google Fonts.

## Deploy

GitHub Pages, serving the `github-export/` folder (`.nojekyll` is already present). Full
steps in the site's own [`README.md`](Home%20page%20animation%20redesign/github-export/README.md).
