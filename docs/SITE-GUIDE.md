# Site Guide — Orion Powers Portfolio

The living reference for this site. When something structural changes, update this file
in the same session. Any line numbers here are **approximate anchors** and will drift —
confirm by searching for the quoted comment marker or `id=`, or read the always-current
[`SITE-MAP.generated.md`](SITE-MAP.generated.md) (line counts, section lines, assets, and
skills are regenerated from source there — this hand-written guide never states them).

---

## 1. Architecture at a glance

- **`index.html`** — the entire page. Three zones, top to bottom:
  1. `<head>` + `<helmet>` block: fonts, global CSS, keyframes, responsive media queries
     (lines ~1–53).
  2. Content markup: intro overlay, fixed background, top bar, and the seven sections
     (lines ~55–792).
  3. `<script type="text/x-dc" data-dc-script>`: all runtime JavaScript — starfield,
     cursor, parallax, scroll-driven experience scene, skills marquee, finale
     (lines ~798–1676).
- **`support.js`** — the "DC runtime." It finds `<x-dc>`, reads the `data-dc-script`
  block, pulls React + ReactDOM + Babel from `unpkg.com` at runtime, and renders.
  **Generated — never edit.**
- **`image-slot.js`** — drag-and-drop image placeholder component used by the DC runtime.
- Rendering model: this is a **DC (design-canvas) artifact export**. The `data-props`
  attribute on the script tag exposes editor toggles (see §5).

### Design tokens (colors reused everywhere)
| Token | Value | Use |
|---|---|---|
| Background | `#070709` | page base (near-black) |
| Gold | `#d3b078` | primary accent, headings, links |
| Warm gold | `#f2b97c` / `#f6e7c4` | highlights, glows |
| Ivory | `#ece7db` | primary text |
| Muted | `#8f897c` / `#a8a294` | secondary/label text |

### Fonts
`Cormorant Garamond` (serif display), `Outfit` (body sans), `JetBrains Mono` (labels/eyebrows).

---

## 2. Section map

All ids use the `ax-` prefix. Each section has a `data-screen-label` and a preceding
`<!-- NAME -->` comment — use those to locate it.

> **For current line numbers, see [`SITE-MAP.generated.md`](SITE-MAP.generated.md)** — it
> is rebuilt from source and cannot go stale. The table below is the stable, human-friendly
> version (order + anchors + nav labels); it deliberately omits line numbers so it never
> needs re-typing.

| # | Section | id | Comment anchor | Nav label |
|---|---------|----|----------------|-----------|
| — | Intro overlay | `ax-intro` | `<!-- ===== INTRO OVERLAY ===== -->` | — |
| — | Fixed background | — | `<!-- ===== FIXED BACKGROUND ===== -->` | — |
| — | Top bar / nav | `ax-topbar` / `ax-nav` | `<!-- ===== FLOATING TOP BAR ===== -->` | — |
| — | Hero | `ax-hero` | `<!-- HERO -->` | (logo → top) |
| I | About | `ax-about` | `<!-- ABOUT -->` | About |
| II | Education | `ax-edu` | `<!-- EDUCATION -->` | Education |
| III | Skills | `ax-skills` | `<!-- SKILLS -->` | Skills |
| IV | Experience | `ax-exp-pin` | `<!-- EXPERIENCE — pinned constellation scene -->` | Experience |
| V | Projects | `ax-work` | `<!-- PROJECTS -->` | Projects |
| VI | Reference | `ax-reference` | _(no comment — find by_ `id="ax-reference"`_)_ | — |
| — | Contact | `ax-contact` | `<!-- CONTACT -->` | Contact |
| — | Custom cursor | — | `<!-- ===== CUSTOM CURSOR ===== -->` | — |

> The nav lists six links, in page order: About, Education, Skills, Experience, Projects,
> Contact. The Reference section is not in the nav. Keep the nav-link order in sync with
> the actual section order — `_frame`'s active-highlight logic assumes they match (see §4).

---

## 3. Content inventory (the résumé data)

This is the actual site content, so you can answer "what's on the site" without re-reading
the whole file. Keep it in sync when content changes.

### Identity
- **Name:** Orion Powers · **Title:** Software Engineer · **Location:** Melbourne, Florida
- **Contact:** orionthanhpowers@gmail.com · +1 502-232-8043 ·
  [linkedin.com/in/orion-powers](https://linkedin.com/in/orion-powers)
- Note: the intro overlay and hero use `orionthanhpowers@gmail.com`; the browser/account
  email on file is `powerso12345@gmail.com` (not shown on the site).

### Experience (§IV, three layers `ax-exp-layer`)
1. **Modus Operandi** — Software Engineer Intern — Oct 2024–Present. DoD programs (PAiGE,
   POMML, LOGEN); Angular 19→21 upgrade; Go.js LLM knowledge-graph; Keycloak RBAC + CAPCO;
   visited JB Langley-Eustis (363rd ISR Wing). *Angular · TypeScript · FastAPI · Go.js · Keycloak.*
2. **Hyperformant** — Software Engineer Intern — May 2024–Oct 2024. Production SaaS in
   React/TS; 3D marketing site (Figma/Spline → Svelte/Webflow). *React · TypeScript · Svelte · Supabase.*
3. **RARE T Holdings** — Software Engineer — Dec 2022–Jun 2023. Azure ML invoice reading;
   ChatGPT API content workflows; SharePoint approvals. *Azure ML · Java · TypeScript · ChatGPT API.*

### Education (§II)
- **Florida Institute of Technology** — B.S. Computer Science, expected **Dec 2026**.
- Progress meter: **110 / 126 credit hours** (Aug 2023 → Dec 2026).
- Honors/certs: Dean's List; Florida Tech Academic Scholar (merit); Panther Fund Grant;
  L3Harris 3D Print Certified; L3Harris Laser Cut Certified.
- Leadership: IEEE Computer Society — Founder & Vice President (2023–present).

### Projects (§V, three cards)
1. **LLM Network Analyzer** (Personal, 2025) — on-device pcap → security briefing, Gemma 2
   12B via Ollama. *Python · FastAPI · Scapy · Angular · Ollama.*
2. **BrainBench** (Senior Design, 2025–26) — benchmarking small local LLMs on math reasoning;
   presented at Northrop Grumman showcase; IEEE format.
3. **NFC Business Cards** (Personal, 2023) — laser-engraved cards with embedded NFC chips
   that open the site on tap. *NFC · Laser Cutting · Hardware.* Links out to LinkedIn.
   (Swapped into this featured slot from the archive in place of "This Very Website" —
   see archive item 1 below.)

### Skills (§III) — marquee list (defined in the script)
`React, TypeScript, Python, Angular, FastAPI, SQL, MongoDB, Docker, AWS, Azure ML, Figma,
Next.js, Svelte, TensorFlow, GraphQL, Git, NLP, Tailwind, Keycloak, Supabase`

### Reference (§VI)
- **Dr. David Luginbuhl** — Associate Professor, CS & EE, Florida Tech. Email `dluginbuhl@fit.edu`.
  Photo: `images/prof-luginbuhl.webp`.

### Contact (unnumbered — no roman-numeral header, it's the finale/launch scene) — résumé
download links to `documents/Orion-Powers-Resume.pdf`.

### Assets on disk
- `images/`: `profile.jpg`, `prof-luginbuhl.webp`, `fit-seal.png`, `3d-prints.jpg`,
  `nfc-cards.jpg`, `invoice-network.png`, `marketing-revamp.png`, `content-creator.png`,
  `saas.png`, `website-hero.png` (hero shot for the "This Very Website" project card).
- `documents/`: `Orion-Powers-Resume.pdf`.

---

## 4. The animation script (`<script data-dc-script>`, ~798–1676)

Labeled comment sections inside the script:
- `// ---- cursor + hero parallax ----` (~1009) — per-frame lerped cursor + hero parallax.
- `// ---- starfield ----` (~1039) — canvas `#ax-stars` particle field; density from `starDensity` prop.
  Includes ambient `_meteors`/`_comets` (random, looping) plus a one-shot `this._welcomeStar`
  drawn right after them — a brighter, steeper diagonal streak fired once by `_fireWelcomeStar()`
  (~1790) from `_runIntro`'s `finish()` when the loading screen ends. It shrinks + fades via
  its own `life`, so it dissolves mid-flight rather than exiting the viewport. Rendered with a
  thin glow + bright hard-edged core, a small four-point head glint, and a brief independent
  "vanish flourish" near the end of its flight. Ambient `_meteors`/`_comets` spawns are gated
  behind `_ambientGateY` (`_measure()`, = `ax-work`'s (Projects) `offsetTop`) so nothing else
  streaks across Hero/About/Education/Skills/Experience — only the single welcome star shows
  until the viewer scrolls into Projects. This gate is computed from whichever section
  precedes Projects, so it tracks the section order automatically if that order changes again.
- `// ---- comet-cursor dust trail ----` (~1127) — `#ax-fx` canvas trail behind the cursor.
- `// ---- scroll-driven work ----` (~1146) — drives the pinned Experience scene
  (`ax-exp-pin`, 340vh tall), swapping the three `ax-exp-layer`s, plus scroll progress
  (`#ax-progress`) and nav highlighting.
- Skills marquee names array (~1304) and archive/finale items (~1609, ~1655).

---

## 5. Editor props (`data-props` on the script tag, ~line 798)

Boolean/range toggles exposed by the DC runtime:
| Prop | Type | Default | Effect |
|---|---|---|---|
| `showIntro` | boolean | true | show the intro constellation overlay |
| `starDensity` | range 0.2–2 | 2 | starfield density |
| `meteors` | boolean | true | meteor streaks |
| `launchFinale` | boolean | true | Contact finale: one continuous ~13.5 s **split mission** — ignition/deluge steam (left pad) → steep gravity-turn ascent → stage separation → the **Starship flies off into the distance** (shrinks toward a vanishing point, winks out — "to orbit") while the **Super Heavy booster** flips to a full horizontal glide, cruises sideways to the tower, flips back upright for the landing burn (grid fins actively "hunt"/steer, settling before contact), and is **caught** by the Mechazilla chopsticks, with mono callouts. Position for the whole pad-to-catch journey is ONE arc-length-sampled Catmull-Rom spline + smootherstep ease (`_lnBuildPath`/`_lnAtDist`) — no per-phase pose reset, so nothing stalls at an internal boundary (stage sep, the flip); engine flame is also kept lit continuously across the separation hand-off. Starship fins (`_drawStarship`) are shaped and placed after the real vehicle: small canards on the nose taper + large aft flaps at the base, symmetric left/right. The `#ax-launch` canvas sits **above** the Contact content (`z-index:3`, pointer-events:none) so it's visible, then **fades out** ~1.5 s after the catch and clears — it never permanently covers the text. Restarts when the section re-enters. |

---

## 6. Common edits (cookbook)

**Add / edit a job (Experience):** duplicate an `ax-exp-layer` block (~292–330). Update the
`01 / DATE`, title, italic role, the `✦` bullet rows, and the mono tech line. The scroll
scene auto-handles N layers, but the section height (`height:340vh` on `#ax-exp-pin`) and
the layer-swap math in `// ---- scroll-driven work ----` assume **3** — if you change the
count, re-check both.

**Add / edit a project:** the three project cards live at ~485–568. Duplicate a card,
update the `W·0N — …` eyebrow, title, description, and tech line.

**Update skills:** edit the `names` array at ~line 1304.

**Change contact info / résumé:** update the `mailto:`, `tel:`, and LinkedIn `href`s in the
Contact section (`ax-contact`). Replace `documents/Orion-Powers-Resume.pdf` to swap the
résumé (keep the filename or update the links).

**Change the email everywhere:** it appears in the intro overlay, hero, and contact —
search for `orionthanhpowers@gmail.com`.

**Recolor:** the palette in §1 is hard-coded inline throughout. Search-and-replace a token
(e.g. `#d3b078`) — but review each hit; some are in `rgba()` with varied alpha.

---

## 7. Gotchas

- **Must serve over HTTP.** `file://` breaks the sibling-file fetches. See CLAUDE.md.
- **First load needs internet** (unpkg React/Babel + Google Fonts). Offline = blank page.
- **`support.js` is generated** — never hand-edit.
- **Images dropped into slots at runtime are stored in the visitor's browser only** and are
  not persisted to the repo. To ship a fixed image, replace the slot with an `<img>` in the markup.
- **Heavy inline styles + `style-hover`/`data-nav` custom attributes** are interpreted by
  the DC runtime, not standard HTML — don't "clean them up" into stylesheets.
- **Reduced motion** is respected via `@media (prefers-reduced-motion: reduce)`.
- **The page is pre-scaled to 80% — match it when you add markup.** The site is authored so
  that its default rendering equals what Chrome showed at 80% zoom. Every `px` in a
  size-bearing property (`font`/`font-size`, `width`/`height` family, `padding`, `margin`,
  `gap`, `top`/`right`/`bottom`/`left`, `inset`, `grid-template-columns`) is already
  multiplied by 0.8 — hence the odd values you'll see (`max-width:944px`, `clamp(44.8px,
  13vw,137.6px)`, `font:500 7.2px …`). **New markup must use 0.8×-scaled px too**, or it will
  render visibly larger than everything around it.
  - **Viewport units are NOT scaled** (`vw`/`vh`/`vmax`/`svh`/`%`) and must stay that way:
    they're already zoom-invariant in physical pixels. This is why `100svh` sections still
    fill the screen and the `340vh` Experience pin still scrolls correctly.
  - **Do NOT "simplify" this to `zoom: 0.8` or `transform: scale()`.** It was tried and it
    breaks the site: Chrome puts `scrollY`/`getBoundingClientRect()` in zoomed space but
    leaves `offsetTop`/`offsetHeight`/`innerHeight` unzoomed, and the scroll math in `_frame`
    (`p = (scrollY - pinTop) / pinRange`) mixes the two — the pinned Experience scene desyncs
    and unpins early. `100svh` sections also shrink to 0.8× and stop filling the viewport.
  - A few px values live in **JS**, not markup, and are easy to miss: `renderVals()`'s
    `skHeight`, `bodyW`, the mobile accordion `h` and `tabPad`, plus `_glint`'s `width:140px`
    (coupled to its `offsetWidth - 140`). Scale these by hand.
