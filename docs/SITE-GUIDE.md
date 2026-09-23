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
  2. Content markup: intro overlay, fixed background, top bar, and the seven sections.
     The Program Dossiers live *inside* Experience card 01 as the second screen of the
     `#ax-modus-track` horizontal snap track — not as a dialog after `#ax-page`.
  3. `<script type="text/x-dc" data-dc-script>`: all runtime JavaScript — starfield,
     cursor, parallax, scroll-driven experience scene, skills marquee, finale
     (lines ~798–1676).
- **`support.js`** — the "DC runtime." It finds `<x-dc>`, reads the `data-dc-script`
  block, pulls React + ReactDOM + Babel from `unpkg.com` at runtime, and renders.
  **Generated — never edit.**
- **`image-slot.js`** — drag-and-drop image placeholder component used by the DC runtime.
- Rendering model: this is a **DC (design-canvas) artifact export**. The `data-props`
  attribute on the script tag exposes editor toggles (see §5).
- Content normally stays in markup, with two deliberate data-array exceptions in
  `renderVals()`: the project archive (repeated cards) and Program Dossiers (repeated tabs,
  panels, impact rows, and stat tiles). Their canonical editable sources are `archiveItems`
  and `programs`; the semantic résumé mirrors remain in markup / `llms.txt` for crawlers.
- **SEO / share / AI-discoverability layer** (in `<head>`, before `support.js`): `<title>`,
  meta description, canonical, `theme-color`, favicon/apple-touch-icon links, Open Graph +
  Twitter card tags (image = `images/og-image.png`), and a JSON-LD `@graph`
  (`Person` / `WebSite` / `ProfilePage`). **Rule: only put facts in the JSON-LD that are also
  visible in the rendered page** — if you change the bio, job, or skills, update the JSON-LD to
  match. Paired with the root-level `robots.txt` / `sitemap.xml` / `llms.txt` (see §3 Assets).
- **`#ax-noscript-fallback`** — a plain semantic-HTML mirror of the whole résumé right after
  `<body>`, carrying inline `display:none`. Two things reveal it: (a) a `<noscript>` `<style>`
  that overrides the inline hide with `display:block!important` for scripting-disabled visitors
  and crawlers that don't run JS; (b) a small inline watchdog that shows it (and hides `<x-dc>`)
  if React/ReactDOM haven't loaded from the CDN after ~9 s. **It duplicates the résumé content —
  keep it in sync when experience/education/projects/skills change** (same discipline as `llms.txt`).

### Design tokens (colors reused everywhere)
| Token | Value | Use |
|---|---|---|
| Background | `#070709` | page base (near-black) |
| Gold | `#d3b078` | primary accent, headings, links |
| Warm gold | `#f2b97c` / `#f6e7c4` | highlights, glows |
| Ivory | `#ece7db` | primary text — headings, names, emphasis |
| White | `#ffffff` | **all secondary text** — body copy, mono eyebrow/kicker labels, meta captions, contact rows, chips, nav inactive state |

> **2026-08-19:** the four grey tokens that used to fill the secondary-text roles —
> `#c9c3b6` (labels/meta), `#d2ccc0` (body), `#c4beb0` (dim labels), `#e2ddd2` (About lead)
> — were all collapsed into `#ffffff` at the user's request. They no longer appear
> anywhere in `index.html`. The one surviving `#c9c3b6` is `ctx.fillStyle` on the Education
> rocket canvas (fin hardpoints) — a **graphic**, not text, so leave it.

**Text-tone floor:** nothing that renders as text may sit at or below `#b0aa9c` in relative
luminance (~0.404). White and ivory clear it trivially, and the gold `#d3b078` clears it too.
If you add text, use `#ffffff` (secondary), `#ece7db` (primary) or `#d3b078` (accent) rather
than inventing a new grey.

### Fonts
`Cormorant Garamond` (serif display), `Outfit` (body sans), `JetBrains Mono` (labels/eyebrows).

**Type floor: no text below 10px.** Mono eyebrow labels are `10px` / `10.5px` / `11px`;
body copy runs `13px`–`17.5px`. See the 0.8×-scale note in §5 — **text is the documented
exception to it.**

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
| VII | Contact | `ax-contact` | `<!-- CONTACT -->` | Contact |
| — | Custom cursor | — | `<!-- ===== CUSTOM CURSOR ===== -->` | — |

> **The `#` column is the background watermark numeral, not visible label text.** Each of the
> seven sections opens with a divider row (`data-rv="0" data-div`, a flex row of
> `hairline — LABEL — hairline`) and, absolutely positioned behind it, a large outlined
> roman numeral (`color:transparent` + `-webkit-text-stroke:2px rgba(211,176,120,.22)`).
> All seven dividers share one gap to the content below them —
> `margin-bottom:clamp(104px,15vh,136px)`, unified 2026-08-19 from Education's value.
> Keep new sections on that value. Note the two constrained scenes it has to survive:
> `#ax-exp-pin`'s sticky `100svh` frame (the card stack is `flex:1`, so it shrinks to
> absorb the gap) and Contact's launch stage (anchored to the badge by
> `_layoutLaunchStage()`, so it follows automatically).
> The label itself is just the section name — `EDUCATION`, not `II · EDUCATION`; the numeral
> prefix was removed 2026-08-19. Label type: `clamp(11.5px,1.5vw,15px)` JetBrains Mono,
> `.26em` tracking, `white-space:nowrap` (so any new label must stay short enough to fit a
> 320px viewport on one line).

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
> Pinned scene — each card must fit one viewport height. See the vertical-budget note in
> [Common edits](#6-common-edits-cookbook) before adding bullets.
1. **Modus Operandi** — Lead UI Engineer — Oct 2024–Present. DoD programs: PAiGE (Air Force
   targeting analysis), LOGEN (Navy logistics), and POMML (Air Force learning-management
   system); Angular 19→21 upgrade; Go.js LLM knowledge graph; Keycloak RBAC + CAPCO; visited
   JB Langley-Eustis (363rd ISR Wing). *Angular · TypeScript · FastAPI · Go.js · Keycloak.*
   Card 01 carries a right-edge prompt (`.ax-modus-cue`) that slides the card sideways to
   `#ax-dossier`, the public program deep dives. PAiGE and
   LOGEN include their Modus Operandi product links; POMML stays deliberately conservative
   until its expansion, audience, and specific impact details are confirmed. Its
   meta/company/role/bullets/tags stack is wrapped in `.ax-modus-summary-body`
   (`.ax-dossier-scroll` for the thin gold scrollbar) — on phones (`max-width:760px`) that
   wrapper is `flex:0 1 auto;overflow-y:auto` (sized to its own content, only shrinking and
   scrolling internally when it has to) and the swipe-cue button switches from its desktop
   `position:absolute` rail to `position:static`, becoming a normal flex child that flows
   immediately after the body. That combination is deliberate: an earlier version made the
   body `flex:1` (stretch to fill the card) while the cue stayed pinned to the card's
   absolute bottom edge, which left a dead gap between them on tall phone screens where the
   text alone didn't fill the card. See the exception noted in the vertical-budget note
   below.
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

### Skills (§III) — interactive discipline directory (defined in `renderVals()`)
Nine large category buttons form a 3×3 desktop index. Selecting one inserts a full-width
detail drawer immediately beneath that tile's row, shifts the remaining rows down, and
aligns a small connector with the selected tile. The grid becomes two columns below
620px, while the drawer's contents stack below 760px. `skillActive` selects the discipline
(Agentic AI by default), `_activateSkill()` animates the chips, CSS animates the newly
mounted drawer, and the category/tool arrays remain in the script.
The disciplines are Languages, Frameworks, Data & Backend, Cloud & Tools, Design & UI/UX,
Machine Learning & AI, Agentic AI, Hardware & Prototyping, and Performance.

### Reference (§VI)
- **Dr. David Luginbuhl** — Associate Professor, CS & EE, Florida Tech. Email `dluginbuhl@fit.edu`.
  Photo: `images/prof-luginbuhl.webp`.

### Contact (§VII, the finale/launch scene) — résumé
download links to `documents/Orion-Powers-Resume.pdf`.

The Starship launch/catch finale (canvas `ax-launch-cv`, driven by `_initLaunch()` /
`_stepLaunch()`) is meant to fill the Contact section in one viewport, pad to catch. On
desktop that's literally true — the two info cards sit side by side with open margins on
either side for the pad and tower. Below the site's 760px "narrow" breakpoint the cards
stack to one full-width column and the section runs taller than one screen, so
`_stepLaunch` instead confines the mission to a compact stage (`_lnStageH()`, ~190–250px,
scaled off viewport height) and shifts the whole scene down past the header text with one
`ctx.translate(0, yOff)` — `yOff` (`_lnYOff`) is set by `_layoutLaunchStage()` (called from
`_measure()`, so it tracks resize/orientation change) to the badge's measured bottom edge
plus a small gap, so the stage sits in its own open band *below* the badge rather than
drawing through the headline/badge copy. That same method reserves the matching layout
space by pushing the cards grid (`id="ax-contact-cards"`) down with a measured
`margin-top` — `yOff + stageH` relative to the badge (`id="ax-contact-badge"`) — so the
stage clears the cards too. Without this the flight renders mostly behind the opaque
cards on phones (and, without the `yOff` push, would still cross the header text even
once it cleared the cards) — see CHANGELOG 2026-07-16.

### Assets on disk
- `images/`: `profile.webp`, `prof-luginbuhl.webp`, `fit-seal.png`, `3d-prints.webp`,
  `nfc-cards.webp`, `invoice-network.webp`, `marketing-revamp.webp`, `content-creator.webp`,
  `saas.webp`, `website-hero.webp` (hero shot for the "This Very Website" project card). All
  photo/screenshot assets are WebP (converted from PNG/JPG for payload — see CHANGELOG
  2026-07-16); `og-image.png` stays PNG for social-share crawler compatibility.
- `images/` (site chrome): `favicon.svg` (gold Orion-star mark on near-black), `apple-touch-icon.png`
  (180×180, rendered from the SVG), `og-image.png` (1200×630 share card, a screenshot of the
  live hero — regenerate by screenshotting the hero at that viewport if the hero changes).
- Root-level discoverability files (served at the site root, **not** referenced from the page):
  `robots.txt` (allows all crawlers incl. the named AI bots; points to the sitemap),
  `sitemap.xml` (single-page site — one `<loc>`, update `<lastmod>` on meaningful changes),
  `llms.txt` ([llmstxt.org](https://llmstxt.org) AI-agent summary — mirror of the résumé facts;
  keep in sync with the page content the same way as the noscript fallback below).
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
- Program Dossiers are a **horizontal snap track**, not a dialog. `#ax-modus-track` holds two
  `.ax-modus-screen`s (summary, dossiers) and native CSS scroll-snap owns the gesture; JS only
  observes it. `_gotoModusScreen(i, wantFocus)` is the single entry point for click and
  keyboard, `_syncDossierPosition()` publishes the landed position into `dossierOpen` once the
  scroll settles (debounced 90ms), and `_frame()` reads `scrollLeft` to drive the prompt's
  pull-out and the `.ax-dossier-inner` parallax. **It must never lock page scroll** — vertical
  scrolling is what carries the visitor on to Hyperformant, and `_frame()` returns the track to
  the summary once `seg > 0.9`. There is no focus trap (it is a region, not a dialog): Escape
  closes, `←`/`→` move screens while focus is inside the track, `↑`/`↓` cycle the program tabs.
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

Keep the per-card classes when you duplicate — `.ax-exp-meta` (date eyebrow), `.ax-exp-co`
(company), `.ax-exp-role`, `.ax-exp-bullets` (list wrapper), `.ax-exp-bullet` (each `✦` row),
`.ax-exp-tags` (mono tech footer). They are the only hooks the short-window fitting CSS has.

**Watch the vertical budget.** This section is a *pinned* scene: the sticky frame is exactly
`100svh` (`box-sizing:border-box` — this page has **no** global border-box reset, so any
`height:100svh` box with padding needs it explicitly or it renders taller than the viewport
and its bottom falls below the fold) and it is `overflow:hidden`, so a card taller than the
frame is silently clipped, not scrolled. The tallest card sets the budget: today that is card
01 at four bullets / ~608px on a 1440px-wide viewport. Two height-keyed blocks in the
`<helmet>` `<style>` — `@media (max-height:800px)` and `(max-height:600px)`, both
`and (min-width:761px)` — scale the type and rhythm down on short windows; their `vh`
coefficients equal the base clamp values exactly at 800px tall so the card shrinks
continuously rather than snapping at the breakpoint. **If you add a fifth bullet or a long
job title, re-check the fit** (measure card height vs. `#ax-exp-layers` height at ~1366x768
and ~1280x660) and retune those two blocks rather than letting the tail clip. The frame's
`padding-top` floor of `72px` is deliberate: it clears the 66px fixed `#ax-topbar`.

**Exception — card 01 on phones:** cards 2/3 and the desktop layout still follow "clipped,
not scrolled" as above. Card 01's own text stack, though, is wrapped in
`.ax-modus-summary-body` and made `flex:0 1 auto;overflow-y:auto` below `max-width:760px`
(see Experience §IV above), because on real phones the `@media (max-width:760px)`
rhythm-compression block alone wasn't reliably enough to fit meta + company + role + four
bullets + tags inside the card without running under the swipe cue. The cue itself
(`.ax-modus-cue`) also switches to `position:static` on phones, so it flows as a normal flex
child directly after that body instead of staying pinned to the card's absolute bottom edge
— pinning it to the edge while the body was `flex:1` (an earlier version of this fix) left a
dead gap on tall phone screens where the text didn't fill the card. Keep both pieces (the
`overflow-y:auto` wrapper sized with `flex:0 1 auto`, and the static-positioned in-flow cue)
together when editing card 01 — don't refactor either back to the old absolute/stretch
arrangement, or the clipping/gap bugs they fix come back on phones.

**Add / edit a project:** the three project cards live in the Projects section (`ax-work`,
§V), each a `.ax-proj` grid with three sibling children — `.ax-proj-title` (eyebrow + `<h3>`),
`.ax-proj-media` (image + corner accents), `.ax-proj-body` (paragraph + tech line + optional
link). DOM order is always title → media → body; that's also the mobile stacking order (via
CSS `order`). At desktop widths (`min-width:761px`) `grid-template-areas` repositions them into
the two-column zigzag — add class `ax-proj-rev` to the row to put the image on the *left*
(matches BrainBench); omit it for image-on-right (matches LLM Network Analyzer / NFC Business
Cards). Duplicate a whole `.ax-proj` row, update the `W·0N — …` eyebrow, title, description, and
tech line — keep all three children present or the `grid-template-areas` mapping breaks.

**Update skills:** edit the `names` array at ~line 1304.

**Edit a program dossier:** search `renderVals()` for `const programs = [` and update the
matching PAiGE / LOGEN / POMML object. Each entry owns its branch lines, public program prose,
`impacts`, three `stats`, mono `tags`, and optional `href`; the `.map()` derives active-tab,
cross-fade, stagger, and link-presence values. Keep the visible Modus Operandi card,
`#ax-noscript-fallback`, JSON-LD role, `llms.txt`, and this §3 inventory in sync. POMML is
intentionally limited to confirmed facts — do not infer its expansion, training audience,
impact bullets, or metrics. The dossiers now live inside `#ax-exp-pin`, so dossier edits must
never alter its `340vh` scroll math or the `seg` thresholds `_frame()` derives from it.

**Change contact info / résumé:** update the `mailto:`, `tel:`, and LinkedIn `href`s in the
Contact section (`ax-contact`). Replace `documents/Orion-Powers-Resume.pdf` to swap the
résumé (keep the filename or update the links).

**Change the email everywhere:** it appears in the intro overlay, hero, and contact —
search for `orionthanhpowers@gmail.com`.

**Resize the loading-screen constellation:** change only the `width` on `id="ax-intro-const"`
(currently `min(268px,62vw,34vh)`). Leave the `viewBox` and the line/star coordinates alone —
`_runIntro()` measures each `.cline` with `getTotalLength()` in viewBox user units, so the
draw-on stays correct at any rendered size, and strokes/star radii scale with it. Keep a `vh`
term in the `min()`: the drawing is ~1.3x taller than wide, and without a height cap a large
width pushes the name and subtitle off short viewports.

**Recolor:** the palette in §1 is hard-coded inline throughout. Search-and-replace a token
(e.g. `#d3b078`) — but review each hit; some are in `rgba()` with varied alpha.

---

## 7. Device-tier performance system

`componentDidMount` classifies the visitor's device into `this._tier` (`'low' | 'mid' | 'high'`,
plus `this._low`/`this._mid` booleans) right after the existing `_reduced`/`_fine` flags, from
`navigator.hardwareConcurrency`, `navigator.deviceMemory`, `navigator.connection`
(`saveData`/`effectiveType`), and `matchMedia('(pointer:coarse)')`. All signals are synchronous
and optional — missing APIs (e.g. `deviceMemory` outside Chromium) just fall through to a safer
tier, so this never blocks first paint or needs a network round-trip. The tier is stamped on
`<html>` as `ax-tier-low` / `ax-tier-mid` / `ax-tier-high`.

What scales with tier (search each identifier to find the exact spot):
- **`<style>` block:** `.ax-tier-low` rules strip the costliest paint work via attribute/child
  selectors on the existing inline styles — no markup changes needed. `.ax-anim{animation:none}`
  stops all decorative rotations/nebula drift; the 4 hero nebula layers under `#ax-hero-neb`
  (each carrying its own 26–44px blur) have their per-element blur zeroed and the
  already-composited `#ax-hero-neb` group blurred **once** instead at a smaller 18px radius —
  one cheap blur pass instead of four expensive ones, keeping the haze look instead of going
  flat; remaining `[style*="blur("]` matches (small 1px glints elsewhere) are zeroed outright;
  the top bar's `backdrop-filter` blur is swapped for a flatter, more opaque solid background.
- **`_measure()`:** canvas DPR capped at 1 (low) vs 1.5 (mid/high) — shared by all four canvases
  (`ax-stars`, `ax-fx`, `ax-orbit`, `ax-launch-cv`).
- **`_buildStars()`:** star count multiplied by an extra `0.4` (low) / `0.7` (mid) / `1` (high)
  tier factor, on top of the existing viewport-size and `starDensity` prop scaling.
- **`_frame()`:** ambient meteors/comets (not the one-shot welcome star, which is a single object
  and stays regardless of tier) are disabled entirely on low tier and capped lower on mid tier.
- **`_initCursor()`:** cursor dust-trail cap and per-move spawn rate cut on low tier (only
  applies to fine-pointer devices in the first place — touch devices never run this).
- **`_initLaunch()` / `_stepLaunch()`:** the Starship finale already self-adapts quality
  (`_lnQ`) by measuring live frame time and shedding particles if it can't hold ~30fps — that
  knob now *seeds* lower on low/mid tier instead of always starting at full quality and stepping
  down reactively after the first stutter.
- **Main `tick()` RAF loop:** low tier caps the whole `_frame()` call at ~30fps
  (`this._frameMinDt = 30`) instead of chasing 60 and dropping frames unevenly. Mid/high tier is
  uncapped (still gated on `!this._hidden`, unchanged).

This is additive and independent of `prefers-reduced-motion` (`this._reduced`) — a low-tier
device with motion allowed still gets a lighter, but present, animation; `_reduced` is the
separate "no motion at all" path and both can be true at once.

## 8. Render-loop rules (read this before touching `_frame`)

`_frame()` runs on every animation frame, on a page with ~770 laid-out elements and four
canvases. Two rules keep it cheap; both are easy to break by accident.

**1. Never read layout from inside the write phase.** `_frame` is split into a READ PHASE at
the top and a WRITE PHASE below it. `getBoundingClientRect()`, `offsetTop/Left/Width/Height`,
`scrollHeight/scrollTop`, `getComputedStyle()` — any of these, called *after* the loop has
written a style, forces a synchronous style-recalc + layout of the whole document. Doing that
three or four times a frame was the page's single largest source of dropped frames. If you
need a new measurement, take it in the read phase, or cache it in `_cacheGeom()`.

**2. Cached geometry lives in `_cacheGeom()`.** Document height, each nav link's `offsetTop`,
the Experience pin's top and range, the Skills section box. It is re-sampled on mount, on
resize, on every React re-render (`componentDidUpdate` sets `_geomDirty`), and whenever the
page's own box changes — a `ResizeObserver` on `#ax-page` sets `_geomDirty`, and the next
frame's read phase acts on it. That covers lazy images decoding, webfonts swapping in and
re-flowing headings, and the archive panel opening. Note `body` cannot be observed: the
runtime's `FULL_PAGE_CSS` pins it to `height:100%`, so its box never grows with the content.

**3. Only write a style when it changes** — especially the inherited ones. `pointer-events`,
`text-shadow`, `color` and `font` are inherited, so assigning one on a container invalidates
the computed style of every descendant. The pinned-Experience block keeps its last written
values in `_expState` / `_expStarOn` / `_expFillH` / `_progTf` and skips no-op writes.

**4. Off-screen animations are paused, not stopped.** `_initAnimPause()` observes every
element whose computed `animation-iteration-count` is `infinite` and sets
`animation-play-state: paused` when it leaves the viewport by more than 200px.
`animation-play-state` freezes in place and resumes from the same point, so nothing jumps.
One-shot entrance animations are deliberately excluded so they still play on scroll-in.

**5. Resize is expensive — treat it as such.** `_onResize` skips identical dimensions
entirely, and on coarse-pointer (touch) devices debounces height-only changes by 350ms,
because those are almost always the mobile URL bar sliding during a scroll. A resize pass
reallocates every canvas backing store and re-flattens the Education rocket's flight path
(257 `getPointAtLength` calls) — not something to run mid-flick. Width changes (rotation, a
window drag) still apply immediately.

**6. Canvas clears are scoped to what was painted.** The cursor-dust canvas (`#ax-fx`) spans
the viewport but only ever paints a small cloud near the pointer, so it clears the bounding
box it drew last frame (`_dustBox`), not the whole canvas. Under `prefers-reduced-motion` the
starfield is fully static, so it is painted once (`_starsPainted`) rather than every frame.

**Do not** batch the particle draws into a single canvas path per colour/alpha bucket. It was
tried and reverted: it is measurably faster (~0.16ms/frame) but not pixel-exact — one path
fills the union of overlapping circles instead of compositing them, and bucketing alpha
shifts every particle. See the 2026-08-19 changelog entry.

---

## 9. Gotchas

- **Must serve over HTTP.** `file://` breaks the sibling-file fetches. See CLAUDE.md.
- **First load needs internet** (unpkg React/Babel + Google Fonts). Offline = blank page.
- **`support.js` is generated** — never hand-edit.
- **Images dropped into slots at runtime are stored in the visitor's browser only** and are
  not persisted to the repo. To ship a fixed image, replace the slot with an `<img>` in the markup.
- **Heavy inline styles + `style-hover`/`data-nav` custom attributes** are interpreted by
  the DC runtime, not standard HTML — don't "clean them up" into stylesheets.
- **Reduced motion** is respected via `@media (prefers-reduced-motion: reduce)`.
- **The page must never scroll horizontally — guard this when adding wide/rotating boxes.**
  Only the deliberate inner rails scroll sideways: `.ax-modus-track` (Modus Operandi program
  swipe), `#ax-dossier-rail`, and the mobile `#ax-nav`. Each is its own scroll container.
  `body{overflow-x:clip}` stops an overflowing box being *seen*, but it does **not** stop
  Chrome for Android sizing the **layout viewport** to the measured content width — when that
  happens the whole page can be dragged sideways and every centered section renders
  off-center. Two non-obvious traps:
  - A **rotating square** overflows far wider than it looks. The About astrolabe rings are
    squares with `border-radius:999px` spinning under `ax-rot`; a rotated square's bounding
    box grows up to 1.41× its width even though the drawn circle never moves, so the overflow
    pulses with the animation and no fixed width fixes it. That's why `#ax-about` carries
    `overflow-x:clip` as a backstop, and why the rings are capped via `--ax-orbit-d` /
    `--ax-orbit-step` (widest ring pinned to 88vw below ~470px, crossing over to the original
    32px step above it). Keep both — the cap keeps the circles *visible*, the clip keeps them
    from widening the viewport.
  - Use `overflow-x:clip`, never `hidden`, on a section: `hidden` forces `overflow-y` to
    `auto` and turns the section into its own scroll box. And never put either on `<html>`
    (see the comment above `body` in `index.html`) — it freezes `window.scrollY` at 0 and
    silently kills every scroll-driven effect.
  - Don't reach for a page-level `touch-action:pan-y` to "just disable" side-swiping: a
    `pan-y` ancestor also blocks horizontal panning inside the nested rails above, breaking
    the Modus swipe. Fix the overflowing box instead.
- **The page is pre-scaled to 80% — match it when you add markup.** The site is authored so
  that its default rendering equals what Chrome showed at 80% zoom. Every `px` in a
  size-bearing property (`font`/`font-size`, `width`/`height` family, `padding`, `margin`,
  `gap`, `top`/`right`/`bottom`/`left`, `inset`, `grid-template-columns`) is already
  multiplied by 0.8 — hence the odd values you'll see (`max-width:944px`, `clamp(44.8px,
  13vw,137.6px)`). **New markup must use 0.8×-scaled px too**, or it will
  render visibly larger than everything around it.
  - **EXCEPTION — font sizes are no longer 0.8×-scaled (2026-08-18).** At 0.8× the type came
    out at 7.2–15.2px, which is too small to read, so every font size at or below the old
    15.2px was lifted to a real-world scale (10px floor for mono labels, 13px+ for body) and
    the dim greys were lightened with it. **Do not "fix" new text back down to 0.8×** — match
    the sizes and tokens listed in §1 instead. Everything else (`width`/`padding`/`margin`/
    `gap`/`inset`/positions) is still authored at 0.8× and must stay that way.
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
