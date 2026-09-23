# Changelog

## 2026-09-23 — Let a phone scroll straight out of the Modus dossier into Hyperformant

- Report: on a phone, once you swiped into the Modus Operandi program dossiers you couldn't
  scroll down to the next company. It "tries to shift you back to the Modus page then
  Hyperformant quickly, but it's glitchy." Desktop was fine and is untouched.
- Two separate causes, both phone-only. Reproduced in mobile Chromium (iPhone 13 profile)
  with synthetic touch drags — three full 380px drags were needed to get from the dossier to
  card 02, and the track rewound mid-flick:

  | drag | page y | seg | track scrollLeft | panel scrollTop |
  |------|--------|-----|------------------|-----------------|
  | 1    | 6220   | 0.02| 325              | 365 / 491       |
  | 2    | 6220   | 0.02| 325              | 491 (at end)    |
  | 3    | 6585   | 0.71| 325              | 491             |
  | 4    | 6950   | 1.39| 0 (rewound)      | 491             |

  1. **A dead gesture at the panel's boundary.** A touch device latches a gesture to
     whichever scroller claims its first move and never re-targets it. The dossier detail
     panel is 861px of content in a 370px box on a phone, so after it bottomed out the rest
     of that swipe went nowhere (drag 2 above: panel hits 491, page doesn't move at all) —
     you had to lift and swipe *again*.
  2. **The rewind fired in the middle of the flick.** `_frame` rewound the snap track to the
     summary at `seg > 0.9`, where card 01 is still ~53% opaque, using `behavior:'smooth'`.
     On a phone that put a sideways animation on a `scroll-snap-type: x mandatory` container,
     the card cross-fade, and `_syncDossierPosition`'s `setState` re-render all on the same
     frames as the visitor's own moving finger — and a fast swipe interrupted the animation
     partway, leaving the track resting between screens.
- Fixes, both in `index.html`, both gated on `state.narrow` (`innerWidth < 760`):
  - **Touch handoff.** New passive `touchstart`/`touchmove`/`touchend`/`touchcancel`
    listeners on `#ax-modus-track`. While the scroller the finger landed in can still absorb
    the drag direction they do nothing; the moment it can't, they take the gesture over and
    drive the document with the remaining travel, then coast on release (0.90 per-frame
    decay) so it reads as one continuous flick. Passive is safe *because* of the bug being
    fixed: at that boundary nothing native is moving, so there is nothing to collide with —
    and `preventDefault` wasn't available anyway, since the browser stops making `touchmove`
    cancelable once native scrolling has begun.
  - **Rewind timing.** On narrow screens the rewind now waits until card 01 is fully
    transparent (`op === '0.000'`, i.e. `seg >= 1.06`) and then happens instantly. Nothing
    to watch by then, nothing to fight. Desktop keeps `seg > 0.9` + `behavior:'smooth'`
    verbatim — there the glide *is* the feedback, and a mouse has no gesture to latch.
  - `_wheelGoesToNestedScroller` was split into `_nestedScrollerFor(el, dy)` (returns the
    scroller; `dy` optional) plus a one-line wrapper, so the wheel path and the touch path
    share one definition of "which nested scroller owns this". Wheel semantics are
    unchanged, including its no-layout-read `closest()` fast path.
- After: drag 1 scrolls the panel, drag 2 finishes the panel **and** carries the page
  (y 6220 → 6530), drag 3 lands in card 03 with the track already rewound to 0 while card 01
  is at opacity 0 — the rewind is never seen. Scrolling back up returns to the Modus summary,
  not a half-open dossier.
- Desktop regression-checked at 1440x900: the rewind still glides visibly
  (scrollLeft 887 → 832 → 209 → 0 while card 01 sits at 0.334 opacity), and a wheel over the
  dossier still scrolls the panel first (0 → 260) and then hands off to the page. No console
  errors on either profile.
- `#ax-dossier-rail` carries `.ax-dossier-scroll` but is `overflow-y:hidden`, so it is
  skipped by the helper's `overflowY` test — a vertical drag over the phone tab strip scrolls
  the page, which is what you want there.

## 2026-09-23 — Stopped the page panning sideways on phones

- Report: on a phone, swiping near the left/right edge dragged the whole page sideways and
  left every centered section sitting off-center.
- Root cause was the About section's astrolabe rings, and it had two layers:
  1. **Size.** The rings were `portrait + 25.6px + 4 * clamp(18px, 5.5vw, 32px)` wide. On a
     390px phone that's ~399px — already wider than the screen.
  2. **The spin.** Each ring is a *square* `<span>` with `border-radius:999px` rotating under
     `ax-rot`/`ax-rot-r`. A rotating square's bounding box grows up to 1.41x its width even
     though the drawn circle never moves, so the overflow *pulsed with the animation*. No
     fixed width could size that away — which is why the symptom felt intermittent.
- Why `body{overflow-x:clip}` wasn't already enough: it stops the spill being *seen*, but
  Chrome for Android still sizes the **layout viewport** to whatever the content measures.
  The ICB widened to ~413px on a 390px screen, so the page became draggable and everything
  centered rendered off-center. Measured directly: `documentElement.scrollWidth` was 396–413
  against a 390px `clientWidth`.
- Fix, two layers:
  - The three rings now derive from `--ax-orbit-d` / `--ax-orbit-step` declared on their
    container. The step is `min(clamp(18px, 5.5vw, 32px), calc((88vw - d - 25.6px) / 4))`, so
    the widest ring is pinned to 88vw on narrow screens and crosses over to the original 32px
    step at ~470px wide — the two formulas meet exactly there, so there's no visual jump.
  - `#ax-about{overflow-x:clip}` as a hard backstop, so that section can never contribute
    horizontal scrollable overflow regardless of rotation phase. `clip`, not `hidden`:
    `hidden` would force `overflow-y` to `auto` and make the section its own scroll box.
- Deliberate horizontal rails are untouched and still scroll: `.ax-modus-track` (Modus
  Operandi program swipe), `#ax-dossier-rail`, and the mobile `#ax-nav`. No `touch-action`
  was added at page level precisely because `pan-y` on an ancestor would have broken those
  nested rails.
- Verified with headless Chrome across 320/340/360/375/390/412/414/430/450/480/540/600/768/
  834/1024/1280/1440px, each sampled at 9 scroll depths x 3 time samples to catch the rings
  mid-rotation: horizontal pan is 0px at every phone width (the 1-3px seen at a few
  tablet/desktop widths is sub-pixel rounding — `window.scrollX` stays 0 and
  `scrollWidth == clientWidth` at rest). Scroll machinery compared against the pre-change
  build at three depths: identical `scrollY`, progress-bar transform and nav highlight.
- Known limit: at 320px there is genuinely no room left (the innermost ring is
  `86vw + 25.6px` = 94% of the screen on its own), so the three rings compress nearly on top
  of each other. It renders fine and, more importantly, no longer overflows. Also note
  `overflow:clip` needs Safari 16+; the page already depended on it for `body`, and below
  that the vw cap alone holds down to ~360px.

## 2026-09-22 — Moved the Modus Operandi mobile swipe cue to flow under the content

- Follow-up to the Modus Operandi mobile-scroll fix: the user checked the live mobile
  layout on a tall phone (iPhone 15/16-Pro-Max-class screen) and the "Explore 3 programs"
  bar was sitting far below the text with a big dead gap in between, instead of right under
  it. Cause: `.ax-modus-summary-body` was `flex:1`, which (via the `flex` shorthand's
  `flex-basis:0%`) forces a flex item to grow and fill 100% of the leftover column space
  regardless of its own content size — on a short card that's fine, but on a tall card with
  short content it stretched the body far past what the text needed, and the cue (pinned
  `position:absolute;bottom:0` against the outer, non-scrolling card) stayed glued to the
  actual bottom of that now-oversized box, stranding it below a wall of empty space.
- Fix: `.ax-modus-summary-body` is now `flex:0 1 auto` (sized to its own content, only
  shrinking when it has to) instead of `flex:1`, and `.ax-modus-cue` is `position:static`
  on mobile instead of absolute — it's a normal flex child now, so it flows immediately
  after the body no matter how tall the card is. `.ax-modus-summary` stays
  `justify-content:center`, so when body+cue together are shorter than the card the leftover
  space splits evenly above/below the pair (previously a dead zone below); when they're
  taller than the card (e.g. phone landscape), the body's `overflow-y:auto` still kicks in
  and the cue stays attached right under the visible/scrolled portion. Verified across four
  mobile viewports (a tall Pro-Max-class portrait screen, iPhone SE, a 320×480 phone, and
  667×320 landscape) — the gap is gone on tall screens and the scroll fallback still engages
  correctly on the cramped ones.

## 2026-09-22 — Centered the résumé download/view buttons on phone only

- `index.html`: gave the "Download PDF" / "View Online" button row in the Contact
  section an id (`ax-resume-actions`) and added a `@media (max-width:760px)` rule
  centering it (`justify-content:center`). Desktop/tablet layout (left-aligned) is
  unchanged.

## 2026-09-22 — Split the difference on scroll pace, leaning toward the slower side

- User wanted a pace between the last two settings (gain 0.4/cap 52, and gain 0.48/cap
  64), closer to the slower one. Set `_scrollGain = 0.43`, `_scrollEaseSpeed = 56`.
- Verified: uniform 430px across Hero/About/Education/Skills for the same scripted wheel
  input (between the previous 400 and 480 results, as expected), single-notch landing and
  one-frame reversal responsiveness both still hold.

## 2026-09-22 — Removed the vertical raceway lines from both Starship stages

- Contact-section launch finale (`index.html`, `_stepLaunch` helpers): deleted the single
  vertical stroke running down the right side of each stage's body.
  - `_drawStarship`: dropped the "leeward stainless edge" line at `cx + sr * 0.62`
    (the tile seams that shared its comment stay).
  - `_drawSuperHeavy`: dropped the thick raceway stroke at `r * 0.5` between the hot-stage
    ring and the engine skirt.
- Why: user found the columns odd-looking on both the top and bottom stage. The body
  gradient, tile/ring seams, grid fins and flaps are untouched.

## 2026-09-22 — Slowed the whole-site scroll pace down, then a bit back up

- User reported Hero/About/Education felt fast and wanted the whole site as slow as the
  Skills section feels. Verified first with real wheel input via a scripted headless
  browser at four positions (Hero, About, Education, Skills), each on a fresh page load
  to avoid the app's own scroll-easing state leaking between measurements: the same wheel
  input produced the exact same `scrollY` delta everywhere (650px for a fixed 10-tick
  gesture). The gain/cap were already applying uniformly site-wide — Skills isn't pinned
  or scroll-jacked, so nothing in this file distinguishes it from Hero/About/Education;
  the felt difference there is section content/pacing, not a wheel-speed bug.
- Lowered the pace anyway since that was the actionable ask: `_scrollGain` 0.65 → 0.4 and
  `_scrollEaseSpeed` 90 → 52. Re-verified uniformity held (400px everywhere) at the new
  pace.
- User then said that was too slow — wanted it "a bit" faster, not a lot. Split the
  difference: `_scrollGain` 0.4 → 0.48, `_scrollEaseSpeed` 52 → 64. Re-verified: uniform
  480px across all four positions, single-notch landing and one-frame reversal responsiveness
  both still hold.

## 2026-09-22 — Fixed scrolling sticking whenever the cursor was over the Modus card

- User: with the cursor over the Modus content the scroll "glitches out and stays in about
  the same place," but at the edge of the screen it scrolls fine.
- **Two bugs in the capped-wheel scroll, which compounded into that symptom:**
  1. `_onWheel` handed the gesture off to any element matching
     `.ax-modus-track, .ax-dossier-scroll` and returned without calling `preventDefault`.
     But `.ax-modus-track` wraps the *entire* Modus card and is `overflow-y:hidden` — it can
     never consume a vertical delta. So over the whole card the page fell back to native
     scrolling, at a different pace to everywhere else (the `_scrollGain` 0.65 never applied).
  2. `_stepScrollEase` re-synced `_scrollTarget` to `cur` on arrival instead of clearing it,
     so the target was never null again after the first wheel event and the ease stayed
     armed permanently. Each native scroll from step 1 was therefore hauled back up to
     `_scrollEaseSpeed` (90px) on the very next frame, before the next wheel event landed.
     Net movement ≈ 0 — the "stuck" feel. The same latch would fight any scroll that moves
     `scrollY` without a wheel event, which is exactly what the function's own comment
     claimed it did *not* do.
- **Fix:** the hand-off now tests whether a nested scroller can actually absorb the delta
  (`_wheelGoesToNestedScroller`: real `overflow-y:auto/scroll`, with room left in the
  direction of travel) rather than testing for a container by name, and clears
  `_scrollTarget` when it does hand off. `_stepScrollEase` now nulls the target on arrival.
  A `closest()` pre-filter keeps the common wheel free of the `scrollHeight` layout read.
- **Verified** with synthesised wheel gestures at 1440x900: over the card's bullets and at
  the screen edge now move the page identically (ratio 1.00, both directions), an open
  dossier panel still scrolls its own 260px internally before handing the remainder to the
  page, and a horizontal swipe over the card still snaps to the dossier with the page
  staying put. No console errors.

## 2026-09-22 — Modus cue: one sleek gold arrow, no tick dashes; card fits on phones

Three fixes to the Modus Operandi card (`#ax-exp-pin`, card 01), all user-reported.

**1. The swipe cue's arrow.** Was a solid gold disc (`.ax-modus-cue-badge`, 27.2px circle)
holding a near-black chevron that slid back and forth on a 2.4s loop, with a 2.8s pulsing
halo behind the disc. User: "make it 1 gold arrow not a black bouncing one in a gold ball."
It is now a single 44px-long, 1px-stroke gold arrow drawn by one SVG — no disc, no halo,
no bounce. The separate `.ax-modus-cue-line` lead-in hairline was folded into the arrow's
own shaft and removed, so the mark is one object instead of two. Hover went from
"disc brightens + scales 1.12" to "arrow brightens + slides 5px right."
Deleted as now-unused: `@keyframes ax-cue-arrow`, `@keyframes ax-cue-halo`,
`.ax-modus-cue-line`, and the `.ax-modus-live`/reduced-motion hooks that drove them.

**2. The three gold dashes.** `.ax-modus-cue-ticks` (three 12.8px hairlines above the
"Explore 3 programs" label, staggered on a 3.2s opacity loop, one per dossier) deleted
outright — markup, base CSS, `@keyframes ax-cue-tick`, the hover rule, and the two
`display:none` overrides that used to hide them on mobile / short desktop.

**3. The tags footer was getting cut off on phones.** Root cause: the base mobile type
clamps were all pinned to their *floor* (the `vw` terms are tiny at phone widths), so
unlike short desktop windows — which already step type and rhythm down via the
`max-height:800px`/`600px` + `min-width:761px` queries — mobile had no shrink to fall back
on at all. At 360-390px wide the four bullets wrap to 3-4 lines each, and bullet text, not
the margins around it, is the dominant cost. Measured before the fix: the tags line ran
past the bottom of the frame outright on shorter phones (+10px at 360x640, +87px at
320x568), and on phones tall enough to escape that it still landed inside the 56px
reserved along the bottom for the cue bar and sat on top of it — including at a perfectly
ordinary 390x844 iPhone (+14px) and 393x852 (+11px). So this was not an edge-case-only
bug; it hit the most common phone sizes.
- Fix: three flat `@media (max-width:760px)` tiers (all phones / below 700px tall / below
  620px tall) trimming divider gap, meta and role margins, bullet gap and line-height, tags
  margin, frame padding, and — in tiers 2 and 3 — font size. Flat values, not `vh` ramps,
  because the dominant variable is discrete wrapped-line count, not a smooth function of
  height. Dropping bullet font-size is not a new idea here: the existing short-desktop
  query already goes to 13.6px, and mobile now goes to 13px/11px in the lower two tiers.
- **Verified** by headless-Chrome measurement of the tags footer against *both* the frame
  bottom and the cue bar's top edge at 320x480, 320x568, 360x600/640/660/700/760/780,
  375x600/667, 390x844, 393x852, 412x915 and 430x932 — zero overflow and zero cue overlap
  at every size, where before the fix 12 of those 14 failed one or both checks. Desktop
  (17 sizes, 1920x1080 down to 900x780) re-measured unchanged.

## 2026-09-22 — Dialed the fixed scroll back down a notch

- User liked the fix below ("wayy better") but wanted the pace itself a bit slower —
  not the sluggish/broken feel from before, just less distance per scroll gesture.
- Added `_scrollGain = 0.65` in `_onWheel`, applied to every wheel delta right before it
  reaches the target — this is the pace knob (how far one gesture moves the page),
  separate from `_scrollEaseSpeed` (the ceiling, which still only matters for a delta
  bigger than one frame can cover). Also lowered `_scrollEaseSpeed` 140 → 90 px/frame
  (~8400 → ~5400px/s), so a hard sustained flick tops out slower too.
- Verified: a 100px wheel notch now moves the page 65px (matches the 0.65 gain) and still
  lands on the very next frame — no lag reintroduced — and reversing direction after a
  hard flick still changes course on frame 1.

## 2026-09-22 — Found and fixed the real cause of the "hyper slow" scroll

- User reported the previous speed bump barely helped — still "extremely unfunctional."
  That was a real bug, not a tuning problem: `_stepScrollEase()` called
  `scrollTo({ top, left, behavior: 'auto' })` every frame. On this page, `behavior: 'auto'`
  does NOT mean "instant" — per spec it means "defer to the element's `scroll-behavior`
  CSS," and `html{scroll-behavior:smooth}` is set globally here (for anchor-link jumps).
  So every one of those per-frame corrections was itself launching a browser-native smooth
  -scroll animation, which the *next* frame's call (16ms later) immediately restarted
  before it had gotten anywhere — an endless pile-up of overlapping animations that only
  ever played their own slow "ease-in" opening beat. Fixed by using `behavior: 'instant'`
  explicitly, which is unambiguous regardless of the page's CSS.
- Also replaced the proportional "ease toward target" step (`diff * rate`) with a flat
  linear clamp (`clamp(diff, -speed, speed)`). The proportional version decayed hard for
  small deltas — exactly what most real wheel/trackpad input is (a series of small
  notches, not one long burst) — so ordinary scrolling almost never reached top speed and
  felt sluggish even before the `behavior` bug. The linear clamp means anything under the
  per-frame cap lands on the very next frame, same as native; only a delta bigger than the
  cap gets spread across a couple of extra frames.
- Raised `_scrollEaseSpeed` 64 → 140 px/frame (~3800 → ~8400px/s at 60fps) and set
  `_scrollLead` (how far the target may lead the live position) equal to it, so a
  reversal is caught up within exactly one frame, not several.
- Verified with scripted wheel events against a local server: a single 100px notch now
  lands fully on the next frame (previously smeared across a visible decay), a hard
  sustained flick followed by an immediate reversal changes direction on frame 1, and an
  extreme single 5000px delta is still correctly capped at 140px for that frame rather
  than jumping instantly — confirming normal scrolling now feels native while the ceiling
  still holds for genuinely extreme input.

## 2026-09-22 — Sped up the capped scroll and fixed slow direction reversal

- Follow-up to the wheel-scroll cap below: user reported the capped speed felt way too
  slow, and reversing direction took forever to take effect.
- The reversal lag was a real bug, not just a feel issue: `_scrollTarget` accumulated
  every wheel delta with no limit on how far it could sit ahead of the actual live scroll
  position. Scroll hard in one direction for a while and the target could end up hundreds
  of px past where the page visibly was; flicking the other way only nudged that target
  back a little each tick, so the page kept drifting in the *old* direction until the
  backlog finally unwound — it looked like the scroll "wouldn't stop."
- Fix: added `_scrollLead` (`_scrollEaseSpeed / _scrollEaseRate`, the distance one frame's
  easing can close at top speed) and clamp the target to within that distance of the live
  `scrollY` on every wheel event, in `_onWheel`. The target can still accumulate across a
  burst of wheel events (so a hard fling still covers real distance), but it can never
  run away from the visible position — a reversal is felt within a handful of frames
  regardless of how long the previous scroll ran.
- Also raised the speed cap itself: `_scrollEaseSpeed` 34 → 64 (px/frame ceiling, ~2000 →
  ~3800px/s at 60fps) and `_scrollEaseRate` 0.16 → 0.26 (chases the target harder, less
  lag behind it). Still well short of native's unbounded fling speed, but no longer reads
  as sluggish.
- Verified with the same scripted-wheel-event Playwright approach as before: a sustained
  synthetic scroll ramped to a steady 64px/frame (matching the new cap exactly), and
  reversing direction produced a visible decrease in `scrollY` within 3 sampled frames —
  no lingering drift in the old direction.

## 2026-09-22 — Toned down About Me second-line copy

- User felt "...I like building the whole thing, and building it beautifully" read as
  gloating. Reworded to swap the self-praise for a concrete detail: "From production DoD
  software to peer-reviewed machine-learning research — I like building the whole thing,
  end to end." Updated both duplicated copies in `index.html` (noscript SEO fallback
  paragraph and the animated About Me paragraph, `data-rv="120"`) to keep them in sync.

## 2026-09-22 — Softened About Me intro copy

- User felt the About Me opener ("...three engineering roles in before I've even finished
  the degree.") read as too snarky/boastful. Reworded to a plainer, narrative tone: "I'm a
  Computer Science student at the Florida Institute of Technology, graduating December
  2026. Along the way, I've worked three engineering roles." Updated both duplicated
  copies in `index.html` (noscript SEO fallback paragraph and the animated About Me
  paragraph, `data-rv="0"`) to keep them in sync.

## 2026-09-22 — Capped and smoothed wheel/trackpad scroll speed

- User asked to slow the page's max scroll speed so it can never "get super fast," and
  feel smoother in general. The page previously relied entirely on native wheel/trackpad
  scrolling, which has no ceiling — a hard trackpad flick can move `scrollY` thousands of
  px/s in one jump, which is rough on a heavily scroll-driven page like this one (hero
  parallax, the Experience pin/rotation, the nav active-link highlight all read `scrollY`
  once per frame).
- Added a `wheel` listener (`componentDidMount`, right before the `requestAnimationFrame`
  loop starts) that intercepts vertical-dominant wheel input, feeds it into a
  `_scrollTarget`, and lets a new `_stepScrollEase()` chase that target at a clamped max
  speed (34px/frame ≈ 2000px/s at 60fps, eased in via `diff * 0.16`) — called first thing
  in `_frame()`, before its one `scrollY` read, so every per-frame animation on the page
  sees the eased position rather than the raw wheel jump. No matter how hard the wheel or
  trackpad is flicked, the rendered scroll position can't move faster than that cap and
  always eases to a stop instead of snapping.
- Left untouched on purpose: horizontal-dominant wheel gestures (so two-finger horizontal
  swipes still drive the Modus Operandi card's snap track and the mobile nav strip
  natively), anything inside `.ax-modus-track` or `.ax-dossier-scroll` (both manage their
  own native scroll), and `prefers-reduced-motion` visitors (handler no-ops entirely).
  Keyboard, touch, scrollbar-drag, and anchor-link (`html{scroll-behavior:smooth}`)
  scrolling all still move `scrollY` directly and are never fought — `_scrollTarget`
  simply resyncs to wherever they leave it once no wheel-driven ease is in flight.
- Verified with a scripted Playwright run against a local `python -m http.server`: a
  single synthetic 4000px wheel flick advanced the page in steady ≤34px steps per frame
  (never jumped), the page still rendered and transitioned from the intro to the hero
  normally, and the only console error present (`net::ERR_INVALID_URL` on a `data:` image
  URI) is pre-existing and unrelated to this change.

## 2026-09-22 — Made the Modus Operandi mobile card scroll instead of clipping

- On phones, the Modus Operandi experience card (`#ax-modus-track` → `.ax-modus-summary`)
  vertically centers its text block (`justify-content:center`) inside a fixed-height,
  `overflow:hidden` card. An existing `@media (max-width:760px)` pass already shrank the
  vertical rhythm (gaps, margins, line-height) to try to make the meta/company/role/four
  bullets/tags stack fit without clipping, but on real phone viewports it still ran taller
  than the card. Because the block is *centered*, an overflow that size clips symmetrically
  off both edges — hiding the company/role header above and the tags/cue below — which read
  as "nothing but the bullet points," and the swipe cue (pinned `position:absolute;bottom:0`
  for the "Explore 3 programs" bar) sat on top of whatever bullet landed at the clipped
  bottom edge.
- Fix: wrapped the meta/company/role/bullets/tags block in a new `.ax-modus-summary-body`
  div. On mobile only, that wrapper gets `flex:1;min-height:0;overflow-y:auto` (reusing the
  `.ax-dossier-scroll` class for the same thin gold scrollbar the program-dossier panels
  already use) and `.ax-modus-summary` switches from `justify-content:center` to
  `flex-start`. The swipe-cue button stays a sibling of the wrapper, absolutely positioned
  against the outer (non-scrolling) card, so it keeps its pinned rail behavior — it's simply
  no longer competing with centered overflow for the same space. Desktop is untouched: the
  wrapper has no special styling there, so the existing centered layout renders identically.
  The existing vh-tuned compression rules for phones/short windows still apply on top of
  this; the scroll is a safety net for whatever they don't fully absorb, not a replacement
  for them.

## 2026-09-22 — Restored the "Fig. 01" photo caption, sized to actually fit

- User wanted the caption back after all (the wrap-based fix looked like stacked/broken
  text), but smaller than both the original and the too-big version. Restored the
  `Fig. 01` / `Orion — not the constellation` row under the profile photo (`#ax-about`)
  as a fixed (non-`vw`-scaled) `9.5px`, tightened letter-spacing to `.1em`, and added
  `white-space:nowrap` so it can no longer silently wrap/overflow — at this size the row
  comfortably fits the `min(288px,86vw)` photo-caption container on every screen width,
  phone or desktop.

## 2026-09-22 — Removed the "Fig. 01" photo caption

- Deleted the caption row under the profile photo (`Fig. 01` / `Orion — not the
  constellation`, `#ax-about` section) entirely rather than continue tuning its sizing —
  user decided to just drop it after the desktop overflow fix below. No other content
  referenced it, so no fallback/sync changes needed.

## 2026-09-22 — Fixed the "Fig. 01" photo caption overflowing on desktop

- The caption row under the profile photo (`Fig. 01` / `Orion — not the constellation`,
  `#ax-about` section) had its font size upsized from a fixed `10px` to
  `clamp(10px,1.28vw,11.5px)`. The row is a `justify-content:space-between` flex line with
  no wrap, inside a container capped at `min(288px,86vw)` — effectively a fixed 288px on
  any screen wider than ~335px. On phones the `1.28vw` term stays pinned at the 10px floor
  (unchanged from before), but on desktop viewports it immediately clamps to the 11.5px
  ceiling — ~15% wider text with nowhere to grow, so the two spans no longer fit the fixed
  288px row and the caption overflowed. Desktop-only bug, as the user suspected. Fixed by
  adding `flex-wrap:wrap` and a `gap`, plus `text-align:right` on the caption span, so the
  row wraps to two lines instead of overflowing when the wider desktop text doesn't fit —
  keeps the bigger text size the user wanted without breaking the layout.

## 2026-09-22 — Title update: Computer Science Networking Society Vice President → President

- "Founder & Vice President" → "Founder & President" for the Computer Science Networking Society
  leadership entry, in both synced copies (animated `#ax-edu` leadership card and the
  `#ax-noscript-fallback` mirror). User is now president of the club.

## 2026-09-22 — Added a Hyperformant link to the Work Experience section

- Follow-up to the Projects-card link — added a "Visit Hyperformant ↗" link
  (`https://hyperformant.co/#hero`) to the Hyperformant entry in the animated Work
  Experience section (`.ax-exp-tags` block, static markup, not `sc-for`-driven like the
  dossier programs), styled to match the existing "View the product ↗" link pattern used
  there for Modus Operandi. Mirrored the same link into the `#ax-noscript-fallback` copy
  (per the SEO/fallback-sync rule — résumé facts must stay in sync across the animated
  page and the no-JS fallback) using the same `<a>…</a>.` pattern already used there for
  the Modus Operandi product-page links.

## 2026-09-22 — Trimmed Professor Recommendation copy, removed em dashes

- User asked to remove em dashes from the Professor Recommendation section and tighten the
  wording. Fallback intro line ("Dr. David Luginbuhl — Associate Professor...") now uses a comma
  instead of an em dash. The animated card's testimonial paragraph was tightened and its two
  em dashes replaced with a colon and a comma+conjunction respectively.

## 2026-09-22 — Corrected Dr. Luginbuhl's department name order

- Professor Recommendation section had "Computer Science & Electrical Engineering" — verified
  against Florida Tech's official faculty profile (fit.edu/faculty-profiles/l/luginbuhl-david/),
  which names the department "Electrical Engineering and Computer Science." Fixed in both synced
  copies (animated `#ax-reference` card and the `#ax-noscript-fallback` mirror). Name, title,
  email, and phone were already correct; only the department word order was wrong. `llms.txt` and
  the JSON-LD `@graph` don't mention the professor at all, so nothing to sync there.

## 2026-09-22 — Renamed IEEE Computer Society to Computer Science Networking Society

- Education section's Leadership entry: "IEEE Computer Society" → "Computer Science Networking
  Society" in both synced copies (animated `#ax-edu` leadership card and the
  `#ax-noscript-fallback` mirror). Also updated the card's body copy ("Founded Florida Tech's
  IEEE-CS chapter..." → "...Computer Science Networking Society...").
- Left the unrelated "IEEE conference format" / "IEEE Format" mentions in the BrainBench project
  entry untouched — those refer to a publication format, not the club, and weren't part of this
  rename.

## 2026-09-22 — About Me rewrite + removed "clearance in process" claim

- User confirmed he is not pursuing a DoD security clearance, so removed the "with a DoD
  security clearance in process" claim everywhere it appeared: the About Me section (animated
  `#ax-about` and the `#ax-noscript-fallback` mirror), the Modus Operandi experience tags (both
  the animated `ax-exp-tags` and noscript `.tag` copies), and `llms.txt`.
- While in there, revised About Me copy: paragraph 1 now reads "...three engineering roles in
  before I've even finished the degree" (was "...with a DoD security clearance in process").
  Paragraph 3's closing line now reads "From production DoD software to peer-reviewed
  machine-learning research — I like building the whole thing, and building it beautifully"
  (was "...to laser-engraved NFC hardware..."), pointing at the BrainBench research paper
  instead of the NFC business-card project, since it's a stronger and more verifiable
  differentiator already established in the Education section. Updated in both synced copies
  (animated + noscript, per docs/SITE-GUIDE.md §1).

## 2026-09-22 — Hero bio rewrite: dropped buzzword phrasing

- Replaced the "AI-driven decision-support software" bio line with more concrete, less
  buzzword-dense wording: "I build military-grade, Department of Defense software for the
  U.S. Air Force and Navy at Modus Operandi. Graduating this fall with a B.S. in Computer
  Science." Updated in all synced spots (see docs/SITE-GUIDE.md §1): hero `<p>`, the
  `#ax-noscript-fallback` mirror, `<meta name="description">`, OG/Twitter descriptions,
  the JSON-LD `Person.description`, and `llms.txt`.

## 2026-09-22 — Hero CTA buttons: sized down slightly

- Follow-up ("a tad smaller") — eased back the previous size bump: font
  `clamp(16.5px,2.1vw,19px)` → `clamp(14.5px,1.85vw,16.5px)`, padding `17.6px 35.2px` →
  `15.2px 30.4px`.

## 2026-09-22 — Hero CTA buttons: removed the down-arrow from "Résumé"

- Follow-up — user asked to remove the arrow next to "Résumé". Label is now plain "Résumé"
  (was "Résumé ↓"); the link still opens the PDF in a new tab as before.

## 2026-09-22 — Hero CTA buttons: bigger, regular-weight text

- Follow-up — user asked for bigger button text that isn't bold. Bumped
  `clamp(15px,1.9vw,17px)` to `clamp(16.5px,2.1vw,19px)` and dropped weight from 700 to 400
  (the loaded JetBrains Mono weights are only 400/500, so 700 was being synthetically bolded by
  the browser anyway). Tightened letter-spacing from `.2em` to `.16em` so the wider regular
  glyphs at the larger size don't feel loose.

## 2026-09-22 — Linked the Hyperformant Marketing Website Revamp project card

- The "Marketing Website Revamp" entry in the Projects archive (`archiveItems`, tagged
  W·05 — HYPERFORMANT, 2024) had `href: null`. Set it to `https://hyperformant.co/#hero`
  so the card renders as a clickable link (the template already conditions on
  `hasLink: !!p.href`, so no markup changes were needed).

## 2026-09-22 — Hero CTA buttons: bigger label text, dropped the box-shadow glow

- Follow-up — user asked for bigger button text and flagged a "white glow." The glow was the
  gold `box-shadow` (`rgba(211,176,120,...)`) from the previous pass — at low opacity against
  the near-black hero background it renders as a pale/whitish halo rather than reading gold, so
  removed it entirely on rest and hover. Bumped label text from `clamp(12.5px,1.6vw,14px)` to
  `clamp(15px,1.9vw,17px)` and tightened letter-spacing slightly (`.22em` → `.2em`) to keep it
  from feeling crowded at the larger size.

## 2026-09-22 — Hero CTA buttons: full gold outline instead of open corner brackets

- Follow-up ("make the corner lines just go all the way around the button... more notable") —
  swapped the open corner-bracket accents (`style-before`/`style-after` + corner `<span>`s) for
  a real `border:1.5px solid #d3b078` running the full perimeter, dropped the now-unneeded
  `position:relative` wrapper and corner spans, raised the fill to `rgba(211,176,120,.12)`, and
  added a gold-tinted glow shadow (brighter still on hover, with the border lightening to
  `#f0dcb4`). All three buttons keep the identical-treatment rule from the previous pass.

## 2026-09-22 — Skills directory opens on hover instead of click, with a smooth luxury reveal

- User wanted the Skills section's discipline tabs to reveal their detail panel on hover
  rather than requiring a click. First pass made the reveal near-instant, but the user then
  reported it felt "fast and jittery" — softened it into a smoother, more deliberate motion
  instead.
- `.ax-skill-tab` (`index.html`, `id="ax-skills"`) gained `onMouseEnter`/`onMouseLeave` wired
  to two new methods on the component (`_scheduleSkillHover(i)` / `_cancelSkillHover()`,
  ~line 3564) instead of calling `_activateSkill(i)` directly on hover. `onClick` still calls
  `_activateSkill(i)` immediately, so touch/keyboard activation is unaffected.
- The hover path debounces ~110ms before activating, and `onMouseLeave` cancels a pending
  activation. This isn't just a delay tweak: opening a tile's panel shifts the grid rows below
  it (the panel is inserted directly under the active tile's row per the existing layout
  design), so a bare `onMouseEnter` caused a real bug — the mouse passing briefly over
  intermediate tiles while travelling toward the target fired their hover handlers too,
  triggering cascading reflows and occasionally leaving the panel showing a different
  discipline's content than the tile that was actually being hovered, or rendering blank
  mid-animation. Confirmed both the bug and the fix with Playwright (rapid multi-tile hover
  transit before settling on a target now always lands on the correct content).
- Retuned the reveal animation for a "luxury" feel rather than instant/jittery: `ax-skill-unfold`
  (panel) is now `.48s cubic-bezier(.16,1,.3,1)` (an expo-out ease), `ax-skill-connector-in`
  (the diamond connector) `.4s` with a `.06s` delay so it trails the panel slightly, and the
  per-chip stagger in `_activateSkill` (`index.html` ~line 3587) is `340ms` duration with a
  `90ms` base delay + `26ms` per chip, same expo-out easing throughout.

## 2026-09-22 — Disabled the Contact section's Starship launch/catch finale on mobile

- User asked to stop the rocket launch-and-catch animation from loading on mobile. Gated
  `_initLaunch()` (`index.html`, near `id="ax-contact"`'s script logic) to bail out when
  `this._vw < 760` — the same mobile breakpoint used everywhere else on the page (e.g.
  `_layoutLaunchStage`'s `narrow` check) — so the `IntersectionObserver` that arms the finale
  is never created on phones. `_launch`/`_launched` stay false, `_stepLaunch` never runs, and
  the canvas (`#ax-launch-cv`) stays blank; desktop/tablet behavior (≥760px) is unchanged.

## 2026-09-22 — Hero CTA buttons: unified all three to one identical treatment

- Follow-up ("I want them to all have the same design") — the observatory-plaque redesign had
  given "View the work" a solid-gold filled treatment distinct from the two ghost/outline
  buttons. Dropped that distinction: all three now share one style (`rgba(211,176,120,.07)`
  ghost fill, `#ece7db` text, gold corner brackets, same hover fill/shadow) — only the
  `href`/label differ.

## 2026-09-22 — Bumped small body/label text on desktop by 1.5px, mobile untouched

- User reported desktop text was too small to read comfortably, citing the Leadership card
  bullets (e.g. "Founded Florida Tech's IEEE-CS chapter…", `font:300 clamp(13px,1.5vw,14.5px)`)
  as the reference point. Rule: every piece of text whose desktop-rendered size was ≤14.5px got
  +1.5px added to its own current size; mobile had to stay pixel-identical.
- This page renders almost all type with `clamp(min, Nvw, max)`, and the mobile breakpoint
  (`max-width:760px`) is small enough relative to every existing `vw` coefficient that the
  clamp's `min` term is what actually shows on phones, while `max` is what shows on desktop —
  confirmed with Playwright (`getComputedStyle` at 375px vs 1440px matches the clamp's min/max
  exactly). That made the edit mechanical: for any `clamp(...)` whose max was ≤14.5px, only the
  max was bumped (e.g. `clamp(13px,1.5vw,14.5px)` → `clamp(13px,1.5vw,16px)`); the min and the
  vw term were left alone, so mobile is untouched by construction.
- For text that had no `clamp()` at all (a flat `Npx`, same on every screen), converted it to
  `clamp(Npx, (N/7.8)vw, (N+1.5)px)` — the coefficient is picked so the vw term stays below the
  min at ≤760px width (mobile keeps the original size exactly) and clears the new max well before
  typical desktop widths. Applied via a one-off script (`fontshort_re`/`fixedsize_re`/
  `clamp_prefix_re` over the file) rather than by hand, since ~110 declarations qualified;
  verified the diff line-by-line afterward.
- Explicitly excluded from the size bump: single-glyph decorative elements (the `✦` star
  markers, arrow glyphs) — these aren't reader text, and several are absolutely-positioned/
  centered in a way that assumes their current size. Also left alone: anything already >14.5px
  on desktop (nothing there was "too small"), and the short-window-height overrides under
  `@media (max-height:800px)/(max-height:600px) and (min-width:761px)` for the Experience pin,
  since their vh-based clamps are deliberately tied to the base clamp's value at specific window
  heights (per the existing comment above them) and none of their own min/max values were ≤14.5px
  on a normal-height desktop.
- Verified with a throwaway Playwright script (`getComputedStyle` on the IEEE Computer Society
  header, its bullet paragraph, and the Contact card's "Location" label) at 1440×900 and 375×812:
  desktop sizes all moved to exactly old+1.5px, mobile sizes were byte-identical to before the
  change.

## 2026-09-22 — Hero CTA buttons: redesigned from scratch as "observatory plaque" style

- Third pass on the hero buttons — after two contrast/brightness tweaks the user still wasn't
  happy and asked for a from-scratch luxury redesign. Mocked up three directions (hairline
  foil serif, gold pill + ghost, corner-bracket "observatory plaque") and had the user pick;
  they chose the corner-bracket style for tying into the constellation/star-chart motif.
- Rebuilt all three buttons: sharp rectangles, no full border, open gold corner brackets at
  each corner (two via `style-before`/`style-after` — first use of that pattern in this file —
  two via explicit absolutely-positioned `<span>` children, since a pseudo-element gets only
  one `::before` and one `::after` each). Bold uppercase JetBrains Mono (700 weight, 12.5px,
  .22em tracking). Primary "View the work" is solid `#d3b078` gold with dark low-opacity
  brackets; "Get in touch" and "Résumé ↓" are near-transparent ghosts with full-opacity gold
  brackets, differentiated by a slightly warmer tint on Résumé. Kept `data-mag`'s magnetic
  hover pull and left `transform` out of `style-hover` for the same reason as the prior pass.
- `style-before`/`style-after` work exactly like the existing `style-hover` convention — the DC
  runtime treats any `style-<pseudo>` attribute generically (`support.js`'s `collectProps`,
  `key.startsWith("style-")`), generating a real `::<pseudo>` rule via `createPseudoSheet`. The
  attribute value must include `content:''` explicitly — nothing adds it automatically.

## 2026-09-22 — Hero CTA buttons: bolder text, stronger contrast, more "clickable"

- Follow-up to the 2026-09-17 infill pass — buttons were still hard to read/notice. Bumped
  label text from 11px/weight 500 to 13px/weight 700 (tightened letter-spacing slightly to
  compensate), increased padding, and added a drop shadow to each (gold-tinted glow on the
  primary "View the work", dark shadow on the other two). Raised the background/border opacity
  on "Get in touch" and "Résumé ↓" substantially since they were nearly invisible against the
  starfield. Hover states got matching shadow bumps. Left `transform` out of the hover states
  deliberately — these links carry `data-mag`, whose per-frame magnetic-hover JS
  (`this._mags` loop near line 1822) writes `el.style.transform` directly and would fight any
  CSS-hover transform.
- **Same day, second pass ("make the buttons brighter"):** lightened the primary gold from
  `#d3b078` to `#e6c68f` with a stronger glow shadow; raised "Get in touch"'s fill/border
  opacity further (`.22`/`.75`, text to pure white) and "Résumé ↓"'s gold tint to `.32`/border
  `.85`, with brighter hover states on both.

## 2026-09-17 — Hero CTA buttons: added infill so they read against the starfield

- The three hero buttons ("View the work", "Get in touch", "Résumé ↓") were outline/text-only
  with no background, making them hard to see against the hero's dark background. Gave each a
  background fill (solid gold for the primary "View the work", translucent tints for the other
  two) with matching hover states, keeping the existing gold/ivory palette.

## 2026-09-03 — Program Dossiers: finished the horizontal reveal and rebuilt its prompt

- **Made the reveal actually work.** The conversion from a fixed `#ax-dossier` dialog to the
  inline `#ax-modus-track` snap track had left the JS behind: `_syncDossierPosition()` was
  called but never defined (a TypeError on every horizontal gesture), and `_openDossier()`
  was still modal code that locked `<html>` overflow — freezing the page's vertical scroll —
  without ever scrolling the track, so clicking the prompt did nothing but break the page.
  Replaced all of it with `_gotoModusScreen(i, wantFocus)` as the one entry point for click
  and keyboard, plus a real `_syncDossierPosition()` that publishes the landed position.
- **Rebuilt the prompt as a right-edge panel** (`.ax-modus-cue`, replacing the floating
  mid-air block): full-height, gold 1px hairline with a travelling light, three ticks for
  the three programs, and the site's canonical circular gold chevron badge with a pulsing
  halo so it reads as a button rather than decoration. Copy is `Explore 3 programs` /
  `Swipe or click`.
- **Scroll-linked motion.** `_frame()` now reads the track's `scrollLeft` (only while card 01
  is the live card) and drives the panel's fade/slide-out and a `.ax-dossier-inner` parallax
  directly, so the drag feels connected instead of binary. Two guarded style writes per
  frame; parallax is skipped under reduced-motion and on `.ax-tier-low`.
- **Auto-return.** Once `seg > 0.9` the track walks back to the summary, so card 01 is never
  left mid-swipe when the visitor scrolls on to Hyperformant. Latched, so scrolling back up
  lets them swipe again.
- **Un-collided the ghost `01`.** The prompt and the outlined numeral both sat at
  `right:0; top:50%`, so the prompt landed dead-centre on the glyph. Card 01's numeral is
  now offset clear of the panel; cards 02/03 unchanged.
- **Accessibility.** Added the five bindings the markup referenced but `renderVals()` never
  supplied (`summaryHidden`, `dossierHidden`, `summaryTabIndex`, `dossierTabIndex`,
  `p.linkTabIndex`); removed the focus trap (it is a region, not a dialog, so Tab must be
  able to leave); Escape closes, `←`/`→` move screens while focus is inside the track, and
  `↑`/`↓` cycle the program tabs (`aria-orientation` now declared). Focus moves only on
  click/keyboard, never on a swipe.
- **Fixes found in the same code paths:** `state.narrow` flipped at 900px while its matching
  CSS flipped at 760px, so every window between them got a mobile tab rail inside a desktop
  row layout — now both 760px. The dossier head's hardcoded `02 / 02` (wrong next to three
  programs) is now the program position `01 / 03`. Removed nine orphaned `renderVals` values
  and the dead `.ax-exp-dossier` height-query rules.
- Files: `Home page animation redesign/github-export/index.html` (style block, Experience
  markup, `componentDidMount`, `_cacheGeom`, `_frame`, dossier handlers, `renderVals`);
  `docs/SITE-GUIDE.md` (four stale dialog references corrected).

## 2026-08-31 — Added Codex project context

- Added `AGENTS.md` so Codex automatically reads and follows `CLAUDE.md`, and documented the bridge in `CLAUDE.md`.

Running log of changes to the site. **Append a new entry at the top after every change.**
Newest first. Keep entries to a few lines: date, what changed, why, and any file/anchor touched.

Format:
```
## YYYY-MM-DD — short title
- What changed (files / anchors).
- Why (if not obvious).
```

---

## 2026-08-31 — Anchored the Skills drawer to its selected category

- Moved the `#ax-skills` detail drawer inside the category grid so it unfolds immediately
  beneath the selected tile's row instead of remaining below all nine categories.
- Added responsive row placement, a tile-aligned connector, downward active arrow, and an
  outward reveal while preserving keyboard, reduced-motion, and mobile behavior.

## 2026-08-31 — Rebuilt Skills as a readable discipline directory

- Replaced the cramped nine-column `#ax-skills` accordion with a responsive 3×3 tile
  directory and one focused detail panel. Category names now use large editorial type,
  clearer counts, selected-state contrast, and an animated toolkit reveal.
- Made all category controls semantic keyboard-focusable buttons, honored reduced motion,
  and verified selection plus responsive layouts at 390, 760, 1024, and 1440px widths.

## 2026-08-31 â€” Further emphasized Florida Tech branding

- Enlarged the Education seal and its frame again, with a modest additional increase to the Florida Institute of Technology heading.

## 2026-08-31 â€” Enlarged Florida Tech education branding

- Increased the Education section's Florida Institute of Technology heading and seal, including its circular frame, for stronger visual emphasis.

## 2026-08-31: Simplified Education flyby rocket

- Replaced the multi-part Education ship with one sleek gold arrow path and removed the
  trail's per-frame Gaussian-blur pass. Reduced the dynamic trail polyline from 80 to 48
  segments while preserving its arcing route and smooth visual weight.
- Narrowed the arrow silhouette further, keeping the flyby light and unobtrusive behind the
  Education content.
- This substantially lowers SVG paint and path-parsing work during the Education launch,
  particularly on lower-powered devices.

## 2026-08-19 — Repositioned Modus Operandi résumé story

- Rewrote the live Experience card, semantic no-script résumé, Program Dossiers impact copy,
  and `llms.txt` around the strongest recruiter signals: multi-program UI leadership, traceable
  AI, secure mission interfaces, measured quality, platform modernization, and direct operator
  collaboration.
- Replaced passive or vague phrasing with specific action-and-outcome language while preserving
  the existing verified facts and deliberately conservative POMML scope.
- Refocused the opening card bullet on the three mission domains and moved the Angular upgrade
  out of the headline story; it remains supporting evidence inside the LOGEN dossier.
- Elevated the Joint Base Langley-Eustis engagement to the second bullet and reframed it as a
  selective, company-funded trip to work directly with the 363rd ISR Wing's analysts.

## 2026-08-19 — Program Dossiers overlay for Work Experience

- Added a polished, full-viewport `#ax-dossier` dialog to Modus Operandi card 01 with a
  staggered three-program tab rail, cross-fading internal-scroll detail panels, stat strips,
  framed gold corners, responsive full-bleed mobile layout, and public PAiGE / LOGEN links.
- Added non-disruptive `<html>` scroll locking with scrollbar compensation, focus trapping,
  Escape / backdrop close, trigger-focus restoration, reduced-motion behavior, and a low-tier
  no-blur treatment. Retuned the short-window Experience trigger spacing.
- Changed the current Modus Operandi role to Lead UI Engineer and corrected POMML everywhere
  from mission-outcome prediction to an Air Force learning-management system. Synced JSON-LD,
  the no-script résumé, `llms.txt`, and this guide; POMML copy remains deliberately limited to
  confirmed facts pending its expansion, audience, and specific impact details.

## 2026-08-19 — Render-loop performance pass (no visual or behavioural change)

Smoothness work only: every star, meteor, particle, section and animation is still exactly
as it was — verified by comparing the full layout box tree (767 elements) of the before and
after builds at five viewports: identical element count, identical document height, zero box
differences, zero page errors.

**The main fix — `_frame()` now has a read phase and a write phase.** The loop used to
interleave DOM reads with style writes: write the cursor transforms, read a magnetic
button's `getBoundingClientRect()`, write more, read the Skills section's rect, write more,
read `document.documentElement.scrollHeight` and an `offsetTop` per nav link. Every one of
those reads landed on a tree the loop had just dirtied, so each forced a synchronous
style-recalc + layout — three or four per frame. All reads now happen at the top of
`_frame()`, before the first write, where the tree is still clean from the browser's own
layout pass. Measured over a scripted full-page scroll, `offsetTop` reads inside `_frame`
went 3042 -> 0 and `scrollHeight` reads 507 -> 0.

Supporting changes, all in `index.html`:
- **`_cacheGeom()` + `_initGeomWatch()`** (new, next to `_measure()`) — the geometry the loop
  needs (`scrollHeight`, per-nav-link `offsetTop`, the Experience pin range) is sampled once
  and re-sampled on mount/resize/re-render and whenever the page's own box changes, watched
  with a `ResizeObserver` on the new `#ax-page` wrapper. That catches lazy images decoding,
  the webfonts swapping, and the archive panel opening. `body` can't be watched — the
  runtime's `FULL_PAGE_CSS` pins it to `height:100%`.
- **Guarded style writes** in the pinned-Experience block. `pointer-events` and `text-shadow`
  are *inherited* properties, so re-writing them every scroll frame invalidated the computed
  style of every descendant of the card. They (and the layer opacity/transform, the progress
  bar, the timeline fill) are now only touched when the value actually changes.
- **`_initAnimPause()`** (new) — infinite CSS animations are `animation-play-state: paused`
  while their element is more than 200px outside the viewport. `animation-play-state` freezes
  in place and resumes exactly where it stopped, so this is invisible; it just stops the
  blurred hero nebulae and the conic-gradient contact beams from re-rasterising off-screen.
  One-shot entrance animations are left alone. The two fixed-position background nebulae
  always intersect, so they never pause.
- **Dirty-rect clearing** for the cursor dust (`#ax-fx`): clear only the box the particles
  painted last frame instead of the whole viewport. Same pixels drawn, far fewer wiped.
- **Reduced-motion starfield paints once.** With `prefers-reduced-motion` there is no twinkle,
  no parallax and no meteors — the image is identical every frame, so it is painted on
  build and left alone instead of being redrawn 60x a second.
- **Resize is debounced on touch devices** for height-only changes. A resize pass reallocates
  every canvas backing store and re-flattens the rocket's flight path (257 `getPointAtLength`
  calls); on a phone a height-only resize is almost always the URL bar sliding mid-scroll,
  which is the worst possible moment. Width changes (rotation, a real window drag) still
  apply immediately. Identical dimensions now do nothing at all.
- **Contact section gets `will-change: transform` only while the finale is shaking it**, and
  drops it again when the mission ends.
- **Fonts moved from the x-dc `<helmet>` into the real `<head>`.** A `<link rel="stylesheet">`
  inside `<body>` blocks rendering of everything after it; in `<head>` it is where browsers
  expect it, and the `preconnect`s open both font connections during initial parse.
- Added an empty `.image-slots.state.json` so `image-slot.js`'s sidecar probe stops 404ing.

Measured in Chromium, median of 5 runs each, driving a scripted full-page scroll with
pointer movement. External deps (unpkg React, Google Fonts) are replayed from an in-process
cache so network variance can't move the numbers. Both builds carry identical page content —
the "before" file is the current one with exactly these edits reverse-applied.

Absolute frame times depend on how loaded the machine is, so both a quiet run and a
contended one are recorded. The contended numbers matter more: that is the condition under
which a visitor actually notices jank.

Quiet machine:

| | desktop 1440x900, 4x CPU throttle | phone 390x844 @2dpr, 6x CPU throttle |
|---|---|---|
| mean frame time | 16.6ms -> **14.4ms** | 21.6ms -> **18.5ms** |
| p99 frame time | 39.0ms -> **27.9ms** | 39.0ms -> 39.0ms |
| frames over 33ms | 1.95% -> **0.91%** | 6.99% -> **3.56%** |
| style recalc | 1.46s -> **1.18s** | 1.30s -> **1.10s** |
| scripting | 1.42s -> **1.32s** | 0.90s -> **0.83s** |

Contended machine (background work competing for CPU — the case that actually stutters):

| | desktop 1440x900, 4x CPU throttle | phone 390x844 @2dpr, 6x CPU throttle |
|---|---|---|
| mean frame time | 40.2ms -> **31.2ms** | 24.1ms -> **19.9ms** |
| p90 frame time | 61.1ms -> **44.5ms** | 33.3ms -> **27.8ms** |
| p99 frame time | 133.4ms -> **99.9ms** | 66.8ms -> **39.0ms** |
| frames over 33ms | 47.4% -> **37.5%** | 13.9% -> **5.6%** |
| style recalc | 2.20s -> **1.51s** | 1.45s -> **1.11s** |
| total task time | 12.33s -> **10.88s** | 9.56s -> **8.82s** |
| LCP | 988ms -> **836ms** | 864ms -> **680ms** |

First contentful paint, measured separately on real network with interleaved runs (median of
9, phone profile, 4x CPU): 624ms -> **448ms**.

The consistent finding across every run is the tail: long frames — the ones a visitor feels
as a stutter — drop by roughly half, and style-recalculation time by 20-30%.

**Tried and rejected:** batching the starfield/dust/exhaust into one canvas path per
(colour, alpha bucket). It was ~0.16ms/frame faster on a 560-star field, but it is not
pixel-exact — merging circles into one path fills their union instead of compositing them
where two dots overlap, and bucketing alpha shifts every particle slightly. Too small a win
to spend any visual fidelity on, so the per-particle draws were restored.

**Noticed, not changed:** `_buildOrbit()`/`_drawOrbit()` reference a `#ax-orbit` canvas that
does not exist in the markup (and did not at HEAD either), so the Skills orbit has never
rendered — `_drawOrbit` returns on its first line. The code is left wired up; adding the
canvas back would bring it straight back. `docs/SITE-GUIDE.md` still documents it, plus an
`_ambientGateY` meteor gate in `_measure()` that is likewise not in the current script.

## 2026-08-19 — Recolored all grey body text to pure white

- Replaced every grey text color in `github-export/index.html` with `#ffffff` (82 CSS
  declarations + 2 JS-set colors):
  - `#c9c3b6` (34) — eyebrow/kicker labels, meta captions, nav inactive state,
    `.tag` in the `<noscript>` fallback.
  - `#d2ccc0` (29) — body paragraphs, About/Reference copy, contact rows, chip labels,
    `.meta` in the `<noscript>` fallback.
  - `#c4beb0` (18) — small-caps mono section/field labels.
  - `#e2ddd2` (1) — the About section's lead paragraph.
  - JS: `_navActive.el.style.color` (nav de-highlight, ~line 1862) and the star-map node
    label `ctx.fillText` fill (~line 2747).
- **Deliberately left alone:** gold `#d3b078` / `#f6dfa8` / `#e7d9bf` / `#c9b48c`, cream
  `#ece7db` / `#f3ead7` (reads as off-white, not grey — it is the primary heading color),
  near-black `#070709` (text on gold buttons), and `ctx.fillStyle = '#c9c3b6'` at
  ~line 2635, which paints the *rocket fin hardpoints* on the Education canvas — a
  graphic, not text.
- Why: user asked for all grey text to be white, leaving all other text as-is.

## 2026-08-19 — Unified the gap under every section divider

- Set the `margin-bottom` on all seven `[data-div]` divider rows to Education's value,
  `clamp(104px,15vh,136px)` (135px at a 900px-tall viewport). Previously: About / Skills /
  Projects / Reference `clamp(16px,3vh,25.6px)`, Experience `14.4px`, Contact
  `clamp(8px,1.6vh,13.6px)`, Education `clamp(104px,15vh,136px)`.
- Why: user wanted the generous breathing room under the EDUCATION divider to be the
  standard for every section.
- **Two viewport-constrained scenes were verified, not assumed:**
  - `#ax-exp-pin` is a sticky `100svh` flex column. The card stack is `flex:1;min-height:0`,
    so it absorbed the extra 120px (712.6px → 592px tall at 1440×900) rather than
    overflowing — bottom headroom inside the frame stayed at 40.5px, unchanged. Verified at
    800 / 900 / 1080px viewport heights and at 390×844.
  - Contact's mobile launch stage is anchored by `_layoutLaunchStage()` as
    `_lnYOff = badgeTop - stageH`, i.e. its bottom pins to the badge — so it followed the
    badge down (offset 164px → 277px) automatically. The extra room actually *improves*
    the mobile finale: previously the headline collided with the divider rule and the
    rocket crossed the badge; now the flight plays in open canvas.
- Verified with Playwright screenshots of all seven sections at 1440×900 and 390×844
  (mobile), plus the pinned Experience scene at three scroll positions. No horizontal
  overflow at either width.

## 2026-08-19 — Section dividers: drop roman numerals, bigger labels, brighter watermark

- **All 7 section dividers** (`index.html`, the `data-rv="0" data-div` flex rows in ABOUT,
  EDUCATION, SKILLS, WORK EXPERIENCE, PROJECTS, PROFESSOR RECOMMENDATION, REACH OUT):
  removed the gold roman-numeral prefix and `·` separator from the label, so it now reads
  just `EDUCATION` instead of `II  ·  EDUCATION`.
- Bumped the label from a fixed `11px` to `clamp(11.5px,1.5vw,15px)` and eased tracking from
  `.32em` to `.26em` — noticeably larger on desktop while the longest label
  ("PROFESSOR RECOMMENDATION") still fits on one line at 320px, since these spans are
  `white-space:nowrap`.
- Brightened the large background watermark numeral behind each divider:
  `-webkit-text-stroke` alpha `rgba(211,176,120,.1)` → `.22`. Stroke only — the glyphs stay
  `color:transparent`, so only the outlines got brighter.
- The `01`/`02`/`03` watermarks behind the Work Experience cards were left at `.1` — they are
  card numbers, not section dividers.
- Why: user asked to strip the numerals from the visible titles, keep (and brighten) the
  background numeral, and enlarge the section title text.

## 2026-08-19 — Work Experience pin: fit the card inside the frame

- **Root cause:** the sticky frame (`#ax-exp-pin > div`) had `height:100svh` **plus**
  `padding:clamp(51.2px,10vh,76.8px)` vertical and **no `box-sizing:border-box`** — this page
  has no global border-box reset. Its real box was therefore `100svh + 153.6px`: on a 900px
  viewport, 1054px tall. The bottom ~154px lived below the fold, and because the cards are
  `justify-content:center` inside that oversized box, every card rendered ~77px lower than
  centered, with the timeline rail and the tech-stack line running off the bottom edge.
- **Fix (`index.html`, `#ax-exp-pin` sticky wrapper):** added `box-sizing:border-box`, so the
  frame is now exactly one viewport tall and the scene is centered in what you can see.
  Split the vertical padding into `clamp(72px,8.5vh,76.8px)` top / `clamp(28.8px,8.5vh,76.8px)`
  bottom — the 72px top floor keeps the "IV · WORK EXPERIENCE" header clear of the 66px fixed
  `#ax-topbar` on short windows, while the bottom is free to give room back.
- **Short-window scaling:** with the frame now truly viewport-height, card 01 (four bullets,
  608px tall at 1440px wide) no longer fits below ~760px of viewport. Added two height-keyed
  blocks in the `<helmet>` `<style>` (`max-height:800px` and `max-height:600px`, both
  `min-width:761px`) that step the type and vertical rhythm down with `vh`. The `vh`
  coefficients are chosen to equal the base clamp values exactly at 800px tall, so the card
  scales continuously instead of snapping at the breakpoint.
- **New anchors:** the three cards' children now carry stable classes for that CSS —
  `.ax-exp-meta` (date eyebrow), `.ax-exp-co` (company), `.ax-exp-role`, `.ax-exp-bullets`
  (the list wrapper), `.ax-exp-bullet` (each line), `.ax-exp-tags` (tech-stack footer).
  Inline styles are unchanged; the classes are additive.
- **Verified** by headless-Chrome measurement of card height vs. available frame height at
  1920x1080, 1440x900/820/801/799/780/760/600/560, 1366x768/700, 1280x660, 900x780 and
  390x844 — zero overflow at every size, and the desktop look at >=800px tall is unchanged.
- Why: the pinned scroll was stopping with the content sitting too low and clipped.

## 2026-08-19 — Bigger Orion constellation on the loading screen
- **`index.html`, `id="ax-intro-const"`** (inside `<!-- ===== INTRO OVERLAY ===== -->`):
  SVG width `min(168px,44.8vw)` -> `min(268px,62vw,34vh)`. ~60% larger on desktop.
- The `viewBox` (`0 0 200 260`) and all line/star coordinates are untouched, so the
  draw-on animation in `_runIntro()` is unaffected — it measures each `.cline` with
  `getTotalLength()` in viewBox user units, which don't change when the CSS box scales.
  Stroke widths and star radii scale proportionally, keeping the original look.
- The added `34vh` term is a height cap: the SVG is ~1.3x taller than wide, so on short
  viewports it clamps the drawing before it can push the name/subtitle off-screen.
- Verified with headless-Chrome captures at 1440x900, 390x844, and 1280x620 — constellation
  draws in staggered, intro dismisses on schedule, hero reveal runs after.
- Why: user asked for a larger constellation during the load, without breaking the animation.

## 2026-08-19 — Hero nebula haze: more transparent, less spread
- **`index.html`, `id="ax-hero-neb"` + the center bloom inside `#ax-hero-inner`.** The five
  gold glow layers in the hero were roughly halved in opacity and had their gradient stops
  pulled inward so each pool falls off sooner and covers less of the frame:
  - big left blob `.18/.06@46%/transparent 70%` -> `.095/.03@42%/transparent 62%`
  - right blob `.135/.048@48%/transparent 72%` -> `.07/.024@44%/transparent 64%`
  - bottom blob `.115/transparent 66%` -> `.058/transparent 58%`
  - small blob behind the name `.095/transparent 62%` -> `.048/transparent 54%`
  - center bloom behind the hero text `.085/transparent 62%` -> `.045/transparent 54%`
- **Why.** The haze read as a single warm wash filling most of the viewport. Lower alpha
  makes it see-through; the tighter stops keep it as separate pools of light instead of one
  dense field. Blur radii, sizes, positions and the `ax-neb-a`/`ax-neb-b` animations are
  unchanged, so the motion and the low-tier fallbacks (`.ax-tier-low #ax-hero-neb`) still
  behave exactly as before.
- **Not touched:** the global starfield (`#ax-stars` / the `starDensity` prop, still `2`) —
  it is site-wide, not hero-only.
- **Verified:** headless Chrome at 1440x900, before/after screenshots of the hero.

---

## 2026-08-18 — Legibility pass: raised the type floor and the text-tone floor
- **Type.** Every font size at or below the hero tagline's `clamp(12px,1.6vw,15.2px)` was
  lifted across `index.html`. Mono eyebrow/label sizes `7.2 / 8 / 8.8 / 11.2px` ->
  `10 / 10.5 / 11 / 12.5px`; clamped label sizes rebased (nav `clamp(9.6px,1.1vw,11.2px)` ->
  `clamp(11px,1.2vw,12.5px)`, etc.); body copy in Outfit moved from a `10.4–15.2px` band to a
  `13–17.5px` band, line-heights eased slightly to compensate. Display serif headings, the
  Experience bullets (already the largest body text) and the huge roman-numeral watermarks
  were left alone, so the hierarchy is unchanged.
- **Color.** All text greys lightened and given a floor: nothing renders at or below
  `#b0aa9c` luminance any more. `#4f4a42`/`#6d675c` -> `#c4beb0`, `#8f897c` -> `#c9c3b6`,
  `#a09a8c`/`#a8a294`/`#b3ad9f` -> `#d2ccc0`, About lead `#c4beb0` -> `#e2ddd2`. Gold
  `#d3b078` and ivory `#ece7db` are unchanged (both already clear the floor).
- **Fit fixes the larger type forced** (all verified with headless Chrome at 320–1920px):
  - Skills panel (`id="ax-skills"`): open-column `flex` `2.6` -> `3`, panel height
    `clamp(384px,58vh,464px)` -> `clamp(424px,62vh,504px)`, chip padding/gap trimmed, and
    chips lost `white-space:nowrap` so an over-wide pill wraps instead of spilling.
  - Skills accordion breakpoint `innerWidth < 760` -> `< 900`: between those widths the nine
    vertical tab columns are ~60px wide, too thin for a label like `PERFORMANCE` at a
    readable size without breaking it mid-word. The stacked accordion gives it the full row.
  - Accordion open height `392px` -> `clamp(268px,calc(392px - (100vw - 360px) * 0.22),392px)`,
    so a tablet doesn't get the dead gap a phone-sized constant leaves behind.
  - Tracking tightened where the bigger text no longer fit one line: `Fig. 01` caption
    (`.26em` -> `.12em`), the six Experience/Projects tech strips (`.2em` -> `.14em`), and the
    archive toggle button (`.24em` -> `.14em`, left padding `22.4px` -> `18px`, now wraps).
- **Verified:** no clipped overflow in the Skills panel for any of the 9 groups at 8 viewport
  sizes; no text under 10px and no text below the tone floor anywhere; page horizontal
  overflow on phones went *down* vs. the previous build (139px -> 81px at 360px — the
  remainder is the intentional swipeable nav strip plus decorative orbit rings, both clipped
  by `body{overflow-x:clip}`).
- Why: user reported the site's small text was hard to read, then asked that no text be as
  dark as the project-card body copy or darker.
- **Note for future sessions:** this makes text the documented exception to the site's 0.8×
  authoring scale — see §1 and §5 of `SITE-GUIDE.md`. Layout px are still 0.8×.

## 2026-08-18 — Evened out the About Me astrolabe orbit spacing
- `index.html`, ABOUT section (`id="ax-about"`, `<!-- astrolabe orbital rings -->` block just
  above the `images/profile.webp` figure): the two outer rings were pulled in so all three
  orbits sit on an equal radial gap out from the photo.
  - Ring 2 (dashed): `min(448px,124vw)` -> `calc(min(288px, 86vw) + 25.6px + 2 * clamp(18px, 5.5vw, 32px))`
  - Ring 3 (outer):  `min(520px,138vw)` -> `calc(min(288px, 86vw) + 25.6px + 4 * clamp(18px, 5.5vw, 32px))`
  - Ring 1 is unchanged at `calc(min(288px, 86vw) + 25.6px)`; the shared `clamp(18px,5.5vw,32px)`
    gap keeps the spacing equal at every viewport width (desktop diameters are now
    313.6 / 377.6 / 441.6px).
- Retimed the orbiting orbs so their tangential speed is unchanged after the radius shrink:
  ring 2 `ax-rot-r 110s` -> `93s`, ring 3 `ax-rot 160s` -> `136s`. Ring 1 stays at `70s`.
- Why: user said the smallest orbit looked right but the outer two were too large and too far
  out, and asked for equal gaps with the orbit animation adjusted to match.

## 2026-08-18 — Hero constellation brought in front of the gold glare
- `index.html`, hero section (`id="ax-hero-inner"`): the centered gold radial glow div now
  carries `z-index:0` (and its alpha eased .095 → .085); the Orion constellation wrapper
  `id="ax-hero-const"` carries `z-index:1`, so it paints above the glare instead of being
  washed out by it.
- Same block: SVG `opacity` .13 → .44, plus a two-stop `drop-shadow` filter (dark halo for
  contrast against the gold, warm halo for glow). The 17 hero constellation `<line>`s went
  from `#d3b078` / `.8` to `#e8c78d` / `1.15` stroke-width. The Experience-section
  constellation was deliberately left untouched.
- Why: user wanted the hero constellation clearly noticeable and in front of the gold glare.

## 2026-08-18 — Education rocket: LUT-driven redraw, rounder arc, slower, lowered
- **Perf (the main fix).** `_initRocket` in `index.html` rebuilt the streak by calling
  `getPointAtLength` 41x per frame (plus 2 for the ship). Each of those is a geometry query
  that makes the browser walk/flatten the path — measured on the real page at **~1.16 ms per
  frame** just for the sampling, before any paint. The path is now flattened **once** into an
  equally-arc-spaced lookup table (`LUT_N = 256`, two `Float32Array`s) and every frame
  interpolates from it (`at(u, out)`): same benchmark, **~0.005 ms per frame (~250x)**.
- Supporting cuts: streak `SAMPLES` 40 -> 36; coordinates rounded to integers instead of
  `toFixed(1)` (shorter `d` string to re-parse); the frame skips `drawStreak`/`placeShip`
  entirely when eased progress moved < 0.0015 (the eased curve crawls at both ends, where a
  redraw is invisible but still repaints two paths, one of them blurred); `ship.style.opacity`
  is now written only during the 0->0.05 fade-in, not on every frame.
- `#ax-rk-blur` filter region tightened from `-30%/160%` to `-6%/112%`. `stdDeviation` is 7
  user units against a ~1800x1250 streak bbox, so the old padding rasterized a much larger
  surface than the blur could ever reach — same look, smaller repaint. (Mobile still drops
  the filter entirely via the existing `@media (max-width:760px)` rule.)
- **Slower.** Speed divisor `L / 0.4` -> `L / 0.33`: flight goes ~5.65 s -> ~7.0 s.
- **Continuous bend.** Flight path `d` (3 copies: `#ax-rk-glow`, `#ax-rk-path`, and the
  `#ax-rk-ship` `offset-path`) changed from `M-260,1220 C150,200 1150,150 1560,140` to
  `M-260,1330 C-25,553 765,84 1560,250`. The old control points put nearly all the turn in
  the first fifth of the path (a visible "corner" then a long straight); the new ones are a
  symmetric ~85deg circular-arc approximation — equal handle lengths, tangents rotated
  +/-42.5deg off the chord — so curvature is spread evenly end to end, and total turn is
  larger (start ~-73deg, exit ~+10deg vs ~-1deg).
- **Lowered.** `#ax-rk-wrap` `top: 0` -> `top: clamp(48px,8vh,120px)`, and the path itself
  shifted +110 user units in y, so the arc sits clearly below its old position in frame.
- Verified in headless Chromium against the served page: ship transform tracks the arc
  (`rotate(-71)` at launch -> `rotate(10.3)` at the end), streak `d` rebuilds, no console
  errors, computed `#ax-rk-wrap` top = 59.84px.

## 2026-08-18 — Shooting stars: removed the scroll gate, true right-to-left crossings
- **`index.html`**: deleted the `_ambientGateY` / `pastEarlySections` gate that suppressed
  all ambient meteors and comets until the viewport reached `#ax-work`. This was the real
  reason they seemed rare — they never spawned across Hero/About/Education/Skills/Experience,
  i.e. most of the page.
- Rewrote the meteor spawn to cross the full screen: they now start just off the right edge
  (`x = w * (1.02 + rand*0.12)`) at any height (`y = h * (0.02 + rand*0.72)`) and fly
  right-to-left at `8-13deg` below flat. Per-meteor `decay` is derived from the crossing
  distance (`frames = (sx + w*0.35) / (cos(ang)*sp)`) so the streak lasts the whole trip
  instead of fading mid-screen; cull condition added for `x < -w*0.3`.
- Speed dialled back from `9-13` to `6-8.5` px/frame (previous pass overshot into "too
  fast"); trail `len` `16-26` -> `26-40` so each one reads as a long horizontal streak.
- Frequency roughly doubled again: respawn gap `2100 + rand*2600` -> `900 + rand*1100` ms,
  concurrent cap `4/6` -> `4/7`.
- Welcome star angle brought to the same `8-13deg`.
- Verified there is no canvas distortion that could skew the drawn angle: `#ax-stars` is
  sized with a uniform `setTransform(dpr,0,0,dpr,0,0)` and no rotation is active during the
  meteor draw, so the math angle is the on-screen angle.

## 2026-08-18 — Shooting stars: flat ~15deg angle everywhere, doubled meteor frequency
- **`index.html`**, ambient meteor spawn: replaced the hand-tuned `vx`/`vy` pair with an
  explicit polar angle — `ang = (12 + rand*6)deg`, `sp = 9 + rand*4`, then
  `vx = -cos(ang)*sp`, `vy = sin(ang)*sp`. Streaks now run nearly flat right-to-left with
  only a slight downward drift.
- Doubled how often they appear: respawn gap `4200 + rand*5200` -> `2100 + rand*2600` ms,
  and the concurrent cap `2/3` (mid/desktop) -> `4/6`.
- Applied the same ~15deg angle to the other two streak effects, which were the steep ones
  still visible: the slow **comet** (`this._comets` push) went from ~28deg to 15deg (its
  spawn `y` moved from `-30` to on-screen, since a flat comet entering from above would
  never cross the viewport), and the on-load **welcome star** (`_fireWelcomeStar`) went
  from `36 + rand*10`deg to `13 + rand*5`deg.
- Why: user said the streaks still read as too steep and wanted roughly 15deg off flat,
  plus twice as many of them.

## 2026-08-18 — Ambient shooting stars: flatter angle, bigger and brighter
- **`index.html`** (ambient meteor spawn + draw in the `data-dc-script` block, near the
  `this._meteors` push / render loop): changed the trajectory from ~26° below horizontal to
  ~10° — `vx` `-(5+rand*3)` → `-(6.5+rand*3.5)`, `vy` `(2.2+rand*1.6)` → `(1.05+rand*0.75)`
  — so they streak leftward across the screen while still drifting slightly down.
- Made them more noticeable: trail `len` 11-20 → 16-26, stroke width `1.1` → `2.2` with a
  round cap, head opacity `0.85*life` → `life` plus an extra gradient midstop, and added a
  soft glow disc + bright white/gold core dot at the meteor head.
- Why: user wanted the background shooting stars bigger, brighter, and angled more across
  than down. The scripted on-load welcome-star streak (`_fireWelcomeStar`) was left as-is.

## 2026-08-15 — Intro tweaks: nudge name up, warm subtitle to gold
- **`index.html`** (`#ax-intro` block ~line 384-385): nudged the "ORION POWERS" block up
  a touch (`margin-top:-14px` on the name wrapper) and recolored the subtitle
  ("Software Engineer · Melbourne, Florida") from the dull grey-brown `#8f897c` to the
  theme gold `#d3b078` so it reads gold instead of muddy.
- Why: user follow-up.

## 2026-08-15 — Intro/loading screen: 40% larger + gold accent under the name
- **`index.html`** (intro overlay, `#ax-intro` block ~line 348-389): scaled the loading
  screen up ~40% — constellation SVG `min(120px,32vw)`→`min(168px,44.8vw)`, subtitle
  `8px`→`11.2px`, name `clamp(20.8px,5vw,32px)`→`clamp(29.1px,7vw,44.8px)`, and the
  column gap/padding to match (`27.2/19.2`→`38/26.9`).
- Added a sleek gold accent rule (`#ax-intro-rule`) beneath the name: a hairline
  gradient line (edge-fading gold with a soft glow) that draws in via `scaleX` after the
  name appears. Reveal wired in `_runIntro` (~line 2701) at 1050ms.
- Why: user request to enlarge the loading text/animation and add a gold accent around
  "Orion Powers". No anchors renamed; new `#ax-intro-rule` id added.

## 2026-08-15 — Education rocket: slower + more bend + lower start
- **`index.html`**: path `M-260,1220 C150,200 1150,150 1560,140` on all three defs — lower
  start (1070→1220) and a stronger bow (controls pulled further off the chord). Flight slowed
  again (`_initRocket` divisor 0.55 → 0.4). No anchors/structure changed.

## 2026-08-15 — Hero glow: warm brown → gold (dialed to the midpoint)
- **`index.html`** (`#ax-hero-neb` layers ~line 427-430 + central hero glow ~line 435):
  warmed the nebula/glow from tan/bronze toward gold, then settled halfway between the
  original and the first (brighter) gold pass: `rgb(222,186,106)`, `rgb(242,196,116)`,
  `rgb(211,174,94)`. Reads gold without going too yellow. No anchors/structure changed.

## 2026-08-15 — Education rocket: lower the whole arc
- **`index.html`** (paths ~line 575-577): shifted every y down ~170 units (bend shape
  unchanged) so the flight sits lower in the section: `M-260,1070 C120,250 1100,145 1560,140`
  on all three path defs. No anchors/structure changed.

## 2026-08-15 — Education rocket: lower start + stronger bend
- **`index.html`** (paths ~line 575-577): start point lower (`800 → 900`) and crest pulled
  up for a stronger bow: `M-260,900 C120,80 1100,-25 1560,-30` on all three path defs. Still
  a single smooth cubic, x/y monotonic. No anchors/structure changed.

## 2026-08-15 — Education rocket: faster flight
- **`index.html`** (`_initRocket`, ~line 2530): sped up the flight — duration divisor
  0.3375 → 0.55 units/ms (~1.6× faster). No anchors/structure changed.

## 2026-08-15 — Education rocket: bend the arc more
- **`index.html`** (paths ~line 575-577): raised the crest and reached it sooner for a
  stronger bow: `M-260,800 C80,180 1050,-20 1560,-30` on all three path defs. Still a single
  smooth cubic, x/y monotonic. No anchors/structure changed.

## 2026-08-15 — Education rocket: deepen the arc (was too straight)
- **`index.html`** (paths ~line 575-577): pulled the single-cubic control points off the
  chord for a pronounced upward bow — steep rise from bottom-left, curving over and flattening
  along the top: `M-260,800 C0,380 950,-10 1560,-30` on all three path defs. Still one smooth
  curve, x/y monotonic so no wiggle. No anchors/structure changed.

## 2026-08-15 — Education rocket: one smooth single-curve arc
- **`index.html`** (paths ~line 575-577): the trajectory was two cubic segments joined at a
  point, so it visibly changed curvature mid-flight. Replaced with a single cubic Bézier
  (one `C`) for one clean sleek arc, both control points above the chord so it stays concave
  (bottom-left → top-right, rises then flattens): `M-260,800 C200,520 820,90 1560,-30` on all
  three path defs. No anchors/structure changed.

## 2026-08-15 — Education rocket: fix trajectory (was an inverse arc)
- **`index.html`** (paths ~line 572-574): the previous left-entry path was concave the wrong
  way (bulged below its chord → looked like an inverse arc). Replaced with a proper
  bottom-left→top-right swoosh that rises steeply then flattens, concave up-left like the
  original: `M-260,800 C40,700 120,430 340,300 C720,110 1150,10 1560,-30` on all three path
  defs. Kept the goldier gradient. No anchors/structure changed.

## 2026-08-15 — Education rocket: enter from the left + goldier, sleeker streak
- **`index.html`** (SVG defs/paths, ~line 565-574): reshaped the flight path to enter from
  off the LEFT edge at mid-height and sweep up to the top-right, replacing the old
  bottom-left/dip lead-in. New `d` (`M-400,440 C160,415 620,300 980,190 C1200,120 1420,20
  1560,-30`) applied to `#ax-rk-glow`, `#ax-rk-path`, and the ship's (now-unused) offset-path.
- Re-tuned the `#ax-rk-grad` gradient: richer gold, bright at the rocket end
  (`#f6cf7c`, .95) fading to transparent at the tail for a sleek taper. Trimmed stroke widths
  (glow 10→9, core 2.2→2) to match.
- Note: `_initRocket` samples the streak from `#ax-rk-path`'s `d`, so the path change flows
  through automatically. No anchors/structure changed.

## 2026-08-15 — Education rocket: lengthen the streak
- **`index.html`** (`_initRocket`): `TAIL` 0.6 → 0.85 (streak length as a fraction of the
  flight path). Purely a length tweak; sync/behavior unchanged.

## 2026-08-15 — Education rocket: streak is now a real sub-path (kills the lag for good)
- **`index.html`** (`_initRocket`, ~line 2488): stopped drawing the trail with
  `stroke-dashoffset` entirely. On these `non-scaling-stroke` paths the dash is measured in
  screen px while the rocket (`getPointAtLength`) is in user units, so every scale attempt
  kept leaving the streak behind. Now each frame rebuilds the streak's own `d` by sampling
  the flight path from `start`→`lead` (user units) and places the rocket at that same `lead` —
  streak tip and rocket are the identical point, so it can't lag.
- `TAIL` 0.4 → 0.6 (50% longer). Removed the end-of-flight fade: the gold streak stays drawn
  once the flight completes (clears only when you scroll away, so it replays on return).
- Uses a detached reference `<path>` to sample the full geometry while core/glow hold the
  short streak. No anchors/structure changed.

## 2026-08-15 — Education rocket: fix comet-tail scale (streak was lagging + short)
- **`index.html`** (`_initRocket`, ~line 2497): the comet tail lagged the rocket and looked
  short because `getScreenCTM()` was returning a ~1 scale, so the screen-pixel dash was out of
  step with the user-unit rocket position (`getPointAtLength`). Both symptoms = one wrong
  scale factor.
- Replaced with a deterministic slice scale: `max(svgRect.w/viewBox.w, svgRect.h/viewBox.h)`.
  Now the tail's leading end lands exactly on the rocket. Also bumped `TAIL` 0.34 → 0.4.
- Why: the streak must start with, and stay glued to, the rocket. No anchors/structure changed.

## 2026-08-15 — Education rocket: switch to a sleek comet tail (no full-arc draw-on)
- **`index.html`** (`_initRocket`, ~line 2487): the "draw the whole path on" model painted a
  permanent gold arc across the entire section, which read as clunky/lagging. Replaced with a
  short **comet tail**: each frame draws a single dash of length `TAIL` (34% of the on-screen
  path) whose leading end sits at fraction `p`, and the rocket is placed at that same point.
  The tail now emanates from the rocket and travels with it; the whole thing fades out (wrap
  opacity) as it leaves frame, so nothing is left painted behind.
- Ship positioned via the SVG `transform` attribute (unambiguous user units) instead of CSS
  transform. Dash pattern uses on-screen px (`L × getScreenCTM scale`) so the tail's tip
  matches `getPointAtLength`'s fraction. Same rAF loop / IntersectionObserver trigger.
- Why: user wanted the original "streak straight out of the rocket" look, not a full static arc.

## 2026-08-15 — Revamp Education rocket: rocket now rides the tip of its own streak
- **`index.html`** (`_initRocket`, ~line 2487): replaced the two-animation design (ship on
  CSS `offset-path` + trail on WAAPI `stroke-dashoffset`) with a single rAF loop. Each frame
  computes one eased progress `p`, draws the streak to fraction `p`, then places the ship AT
  that point via `getPointAtLength(p * L)` with the tangent angle. The rocket is positioned
  on the tip of its streak by construction, so it can never lead/lag the trail.
- Ship now positioned via CSS `transform` (offset-path disabled); trail dash still measured
  in on-screen px (`L × getScreenCTM scale`) to match the user-unit path fraction. Eased with
  an inline JS cubic-bezier(.5,.05,.3,1). Same IntersectionObserver trigger as before.
- Why: on a curved path the two independent animations drifted (per-segment easing), leaving
  the streak far behind the rocket. No anchors/structure changed.

## 2026-08-15 — Fix Education rocket trail lag / pre-launch visibility (units bug)
- **`index.html`** (`_initRocket`, ~line 2487): the trail is drawn with
  `stroke-dasharray`/`stroke-dashoffset`, but both paths (`#ax-rk-path`, `#ax-rk-glow`) use
  `vector-effect:non-scaling-stroke`, which measures the dash in **screen px**. The code was
  seeding the dash from `getTotalLength()` (**user units**), while the ship's `offset-path`
  also runs in user units and the SVG is scaled by `preserveAspectRatio slice`.
- Result: dash length ≠ on-screen path length, so a slice of the trail showed before launch
  and the draw rate didn't match the ship (trail lagged badly).
- Fix: added `screenLen()` = `L × (uniform CTM scale from getScreenCTM)`; dash-array/offset,
  `hide()`, and the `trail()` keyframes now use that on-screen length (`Ls`), recomputed at
  each launch for resize/rotation. Trail tip now stays glued to the rocket. No anchors/structure changed.

## 2026-08-15 — Redo Education rocket launch timing & fix stray trail
- **`index.html`** (`_initRocket`, ~line 2510): rewrote the launch trigger and reset. The
  rocket now launches when the section top scrolls into the top ~70% of the viewport
  (IntersectionObserver `rootMargin: '0px 0px -30% 0px'`, single `threshold: 0`) — i.e. a
  beat *before* the section is fully on screen — instead of firing late at `cover > 0.45`.
- Added a `hide()` helper that re-pins the trail to its fully-hidden base
  (`strokeDashoffset = L`, ship `opacity 0`) both before every launch and inside `reset()`.
- Why: the old `reset()` only cancelled the animations, so a completed flight's
  `fill:'forwards'` end-state (fully-drawn trail) lingered and the trail appeared statically
  on arrival, then "reappeared" out of sync with the ship. Trail/ship stay glued via the
  existing matched keyframe offsets; no structure/anchors changed.

## 2026-07-17 — Fix: Work Experience section stuck on "Modus Operandi", never rotated
- **`index.html`** (~line 252-253, global `<style>`): `html`/`body` overflow rule. Root
  cause traced to commit `65cf475` ("Convert project/hero images to WebP..."), which
  changed `body{overflow-x:clip}` to `overflow-x:hidden` and newly added
  `overflow-x:hidden` to `html` (previously html had no `overflow` at all). Reverted to
  `html{...}` with no overflow-x, and `body{...overflow-x:clip...}`.
- Why: this DC-runtime's generated `support.js` force-injects `html,body{height:100%}`
  (`FULL_PAGE_CSS`) on every standalone page load. Once `html`'s overflow is anything but
  the CSS-initial `visible`, the spec's "body overflow propagates to the viewport" rule
  stops applying, so `<body>` becomes its own `height:100%`, independently-scrolling box
  instead of the document/viewport scrolling. The page still *looked* like it scrolled
  normally (native scrolling of body's own overflow box is visually identical), but
  `window.scrollY` — which every scroll-driven effect in this file reads via `const y =
  scrollY` in `_frame()` — froze at 0 forever. That silently broke the Experience section's
  pinned scroll-rotation (~340vh sticky section, `_expLayers`/`_pinTop`/`_pinRange`), plus
  the (less visually obvious) hero parallax and topbar nav-highlight. Confirmed via
  Playwright mobile + desktop emulation: before the fix `document.documentElement.
  scrollHeight` reported only `innerHeight` (viewport-clamped) and `scrollY` never moved;
  after the fix it reports full content height and the Experience layers correctly
  rotate Modus Operandi → Hyperformant → RARE T Holdings while scrolling.

## 2026-07-17 — Professor Recommendation card: bigger label + affiliation text
- **`index.html`** — in the animated reference card (~line 940-945): renamed the
  "Academic Reference" label to "Professor Recommendation" and bumped it from `8px` to
  `14px`; enlarged the "Florida Institute of Technology" line from `7.2px` to `12px`.
  The noscript/fallback `<h2>` (~line 214) was renamed to match.
- Why: user-requested rename + readability bump on the small mono labels.

## 2026-07-17 — Starship launch: more vertical liftoff before the pitch-over
- **`index.html`, `_stepLaunch()` (~line 1757-1758, Contact section finale).** Tuned two
  constants in the single continuous rotation formula that drives the booster/stack's
  attitude through the whole pad-to-catch flight: `A_LEAN` (0.12 → 0.22, how far into the
  flight the ascent lean ramps in) and `tiltMax` (0.60 → 0.40 rad, how far it leans over
  during that ascent/boostback plateau). The stack now rides close to vertical for longer
  right off the pad before gently arcing toward the tower, instead of leaning ~34° almost
  immediately.
- Why: user feedback that the liftoff read as leaning too early/too much; wanted a more
  vertical launch with a smooth transition into the existing flip/glide/catch. Only these
  two constants changed — the position spline, flip/descent timings (`A_SEP`,
  `A_FLIPEND`, `A_DESCSTART`, `A_FLIPBACK`, `A_KICKPEAK/END`), and catch logic are
  untouched, since the rotation formula converges back to `horizAngle` at `A_FLIPEND`
  regardless of `tiltMax` — the flip/glide/landing/catch sequence is unaffected.
- Verified with Playwright screenshots at 1440×900 and 390×844 (mobile) across the full
  ~13.5s flight timeline (ignition → vertical ascent → separation → boostback → glide →
  descent → catch) — liftoff reads noticeably more vertical, catch sequence unchanged on
  both viewport sizes, no new console errors.

## 2026-07-17 — Rename "Academic Reference" to "Professor Recommendation"
- **`index.html`** — both copies of the section header updated: the noscript/fallback
  `<h2>` (~line 214) and the animated card's monospace label (~line 945, also bumped
  from `8px` to `14px` font size per request).
- Why: user-requested rename + larger label text; no content/copy changes otherwise.

## 2026-07-16 — Education rocket: trail glued to ship, off-screen launch on mobile too, mobile perf
- **`index.html`, `_initRocket()` (~line 2472) and the rocket's SVG markup (~line 553-571).**
  Three follow-up fixes to the rocket animation, all in Education (`ax-edu`):
  1. **Trail no longer trails behind the ship.** `core`/`glow` (the gold arc) previously animated
     `strokeDashoffset` with just 2 keyframes (start→end) while the ship's `offsetDistance`
     animated with 4 keyframes (0%→3%→96%→100%, timed at 0/.05/.92/1). WAAPI applies a top-level
     `easing` *per segment between keyframes*, so a 2-keyframe animation paces differently frame-
     to-frame than a 4-keyframe one even with identical duration/easing — the drawn line and the
     ship's actual position drifted apart mid-flight. Fix: the trail now uses the same 4 offsets
     as the ship, with `strokeDashoffset` values derived from the ship's own `offsetDistance`
     values at each stop, so the trail's tip is mathematically pinned to the ship's position at
     every frame instead of merely sharing start/end points.
  2. **Off-screen launch on mobile.** The `@media (min-width:761px)` override that extended the
     launch point off-canvas (`M-420,1000 L-60,820 C…`) was desktop-only; mobile still used the
     short `M-60,820 C…` path, which — despite the assumption in the prior changelog entry below —
     was not reliably cropped off mobile's near-viewBox-aspect container, so the ship visibly
     started already on-screen. The extended path is now the *only* path (set directly on
     `#ax-rk-glow`/`#ax-rk-path`/`#ax-rk-ship` in the markup), and the now-redundant
     `min-width:761px` override block was deleted.
  3. **Mobile jank.** `#ax-rk-glow` carries an SVG `feGaussianBlur` filter (`stdDeviation:7`,
     160%-padded region) that gets re-rasterized every frame while `strokeDashoffset` animates —
     inexpensive to composite on a desktop GPU, but the dominant jank source on phone GPUs /
     software rasterizers (and not caught by the existing `.ax-tier-low [style*="blur("]` rule,
     since the filter is set via the `filter` attribute, not an inline `style` blur). Added
     `#ax-rk-glow{filter:none;stroke-width:6;opacity:.25}` inside the existing `max-width:760px`
     block — same soft-trail look at phone viewing distance, without the per-frame filter repaint.

## 2026-07-16 — Mobile Starship finale now plays as a background instead of pushing the contact cards down
- **`index.html`, `_layoutLaunchStage` (~line 1279) and `_stepLaunch`'s narrow-scene comment
  (~line 1700).** The previous mobile fix (see the "hidden and oversized on phones" entry
  below) confined the launch/catch mission to a compact stage, but reserved layout space for
  it by pushing `#ax-contact-cards` down with `margin-top`. That made the animation read as
  its own block appearing *before* the contact info while scrolling, instead of behind it.
- Fix: `_layoutLaunchStage` no longer sets `cards.style.marginTop`. Instead it pins the
  compact stage (`_lnYOff`) into the empty space *above* `#ax-contact-badge` — behind the
  "VII · REACH OUT" divider and the h2 headline — which has no opaque boxes over it (unlike
  the info cards, which are solid-fill and would hide the flight entirely). The cards now
  stay in their natural document position; the mission plays as a true background layer for
  the section, matching how it already behaves on desktop.

## 2026-07-16 — Desktop: Education rocket now launches from off-screen
- **`index.html`, new `@media (min-width:761px)` rule next to the mobile rocket-trail fix.**
  The trail's launch point (`M-60,820`) sits only just past the SVG's `viewBox` edge; on the
  wide/short containers typical of desktop windows the cover-fit SVG (`xMidYMid slice`) crops
  very little off the sides, so the ship's fade-in and the trail's draw-on both started already
  inside the visible frame instead of entering from off-screen — the requested effect.
- Fix: added a desktop-only CSS override (`d`/`offset-path` on `#ax-rk-glow`, `#ax-rk-path`,
  `#ax-rk-ship`) that extends the launch point further down-left
  (`M-420,1000 L-60,820 C170,420 520,190 1560,-30`) — well outside the cropped viewport on any
  realistic desktop window — so the whole entrance happens off-canvas and the ship arrives
  already in flight. `getTotalLength()` in `_initRocket()` reads the rendered (CSS-overridden)
  path dynamically, so the draw-on animation adjusts automatically. Mobile is untouched — it
  already shows the trail close to full-length (see the mobile rocket-trail fix entry below).

## 2026-07-16 — Fix: Starship launch/catch finale was hidden and oversized on phones
- **`index.html`, Contact section (`ax-contact`) — `_stepLaunch` (~line 1693), `_measure`
  (~line 1224), new `_lnStageH`/`_layoutLaunchStage` methods (~line 1264-1292), plus new
  `id="ax-contact-badge"` / `id="ax-contact-cards"` on the existing badge and cards-grid
  elements (~line 1009, 1016).** The finale canvas is sized to the Contact section's full
  `offsetHeight` so the whole pad-to-catch mission fits in the space at once — true on
  desktop, where the two info cards sit side by side with wide open margins left/right for
  the pad and tower. On phones the cards stack to one column and fill nearly the full
  width, and the section grows well past one screen tall to fit them; the rocket's flight
  (sized to that inflated height) ended up rendered almost entirely *behind* the opaque
  cards, with only a sliver visible in the gap between them.
- Fix: below the site's existing 760px "narrow" breakpoint, `_stepLaunch` confines the
  mission geometry to a compact stage height (`_lnStageH()`, 190–250px based on viewport
  height) instead of the full content height, and shifts the whole scene down past the
  header copy with a single `ctx.translate(0, yOff)` (`_lnYOff`, set by
  `_layoutLaunchStage`) so the stage sits in its own open band *below* the badge rather
  than crossing through the headline/badge text. `_layoutLaunchStage` (called from
  `_measure`, so it re-runs on resize) reserves that exact space by pushing the cards grid
  down with a measured `margin-top` (`_lnYOff + stageH`, relative to the badge's own
  measured bottom) — enough that the stage never overlaps the badge above it or the cards
  below it, no more. Desktop/tablet width (≥760px) is untouched (`margin-top` clears back
  to `''`, `yOff` is 0).
- Verified with headless Chromium at 390px (iPhone 13): full launch → separation → ship
  to orbit → booster boostback/landing/catch sequence now plays entirely in its own open
  band below the header text, never touching the badge or the cards. Spot-checked
  700–1440px widths (including the 2-column band just under 760px, where the stage still
  applies) and confirmed 1440px desktop is pixel-identical to before the change.

## 2026-07-16 — Fix: Projects section had inconsistent mobile stacking order
- **`index.html`, root `<style>` block (new `.ax-proj*` rules) + Projects section (`ax-work`),
  all three project rows (W·01 LLM Network Analyzer, W·02 BrainBench, W·06 NFC Business Cards,
  ~line 808-865).** On phones the two-column desktop grid collapses to one column, and each
  project's title/paragraph/tags lived in the same block as either the first or second grid
  child (alternating per row, for the desktop zigzag layout) — so on mobile some projects
  stacked text-then-image and others image-then-text, depending on which side the image sat on
  at desktop width.
- Split each project row into three sibling blocks — `.ax-proj-title` (eyebrow + `<h3>`),
  `.ax-proj-media` (image), `.ax-proj-body` (paragraph + tags + optional link) — so DOM order is
  always title → media → body. Mobile (`.ax-proj`, single column) uses flex/grid `order` to keep
  that sequence for every project regardless of desktop side. At `min-width:761px` (matching the
  site's existing desktop breakpoint), `.ax-proj` switches to a 2-column grid with
  `grid-template-areas` (`"title media" / "body media"`, or `"media title" / "media body"` when
  `.ax-proj-rev` is present) to reproduce the original alternating image-left/image-right desktop
  layout — positioning is independent of DOM order, so the mobile fix required no desktop-only
  markup duplication.
- Verified with headless Chromium screenshots at 390px (title → image → text for all three
  projects) and 1280px (original alternating two-column zigzag intact).

## 2026-07-16 — Fix: Education rocket trail didn't fit phone screens
- **`index.html`, Education section (`ax-edu`), rocket-trail overlay (~line 545-560) + new
  `@media (max-width:760px)` rule.** The overlay's height was `clamp(544px,105vh,864px)` —
  tuned for landscape desktops, where it happens to land close to the SVG's own ~0.58
  (700/1200) aspect ratio. On a tall narrow phone that produced a container far taller than
  wide, so the cover-fit SVG (`xMidYMid slice`) zoomed in hard and cropped out most of the
  swoop — the ship was only ever in frame for a sliver of its 5.6s flight — while the
  oversized blurred overlay (up to 864px tall, more than one phone screen) cost extra
  paint/compositing for no visual benefit.
- Fix: added `id="ax-rk-wrap"` to the overlay div and, under `max-width:760px`, set
  `height:min(58vw,420px) !important` — tying height to viewport *width* instead of *height*
  keeps the aspect ratio (and the crop) close to the desktop version regardless of phone
  orientation, and shrinks the paint area substantially (better scroll/animation
  performance on mobile). Also added `vector-effect="non-scaling-stroke"` to the two trail
  `<path>`s (`ax-rk-glow`, `ax-rk-path`) so their stroke width stays a constant, legible
  screen-pixel width instead of shrinking toward invisibility at the smaller mobile scale.

## 2026-07-16 — Fix: noscript fallback never showed with JavaScript disabled
- **`index.html`, `<noscript>` `<style>` block (`#ax-noscript-fallback`).** The crawlable /
  no-JS fallback carries an inline `style="display:none"` (so it stays hidden on the normal
  JS path, where the CDN-failure watchdog reveals it only on failure). The `<noscript>`
  stylesheet rule that was meant to reveal it under scripting-disabled lacked `!important`,
  so it could not override that inline style — the fallback stayed `display:none` and a no-JS
  visitor (or a crawler that doesn't run JS) saw a blank page. Added `display:block!important`
  to the `#ax-noscript-fallback` rule inside the `<noscript>` block only.
- Verified with headless Chromium at `javaScriptEnabled:false`: body text was empty before the
  fix, and renders the full name/bio/experience/education/projects/skills/reference/contact
  fallback after. The JS-enabled render is unaffected (a `<noscript>` stylesheet is inert when
  scripting is on).

## 2026-07-16 — Orbiting stars now ride the photo's existing decorative rings
- **`index.html`, Reference section (`ax-reference`), professor photo wrapper (~line 907-918).**
  Follow-up to the twin orbiting stars: resized the two rotating spans from their own separate
  148.8px/168px rings down to 121.6px/134.4px — exactly matching the two existing static
  decorative rings already drawn around the photo (`inset:-8px` and `inset:-14.4px`) — and
  dropped the extra `border`/`drop-shadow` I'd added on the rotating spans themselves (that was
  a third, redundant ring; a rotating circular border is visually static anyway).
- Why: user wants the stars to actually travel along the rings that already exist around the
  photo, not float on new rings drawn further out.

## 2026-07-16 — Hyper-optimized for weak/mid/strong devices (images + adaptive animation tier)
- **`images/`.** Converted the 10 largest photo/screenshot assets (project cards + profile +
  archive) from PNG/JPG to WebP (`quality:80`) via `sharp`: `network-analyzer`, `brainbench-slide1`,
  `content-creator`, `invoice-network`, `website-hero`, `saas`, `marketing-revamp`, `3d-prints`,
  `nfc-cards`, `profile`. Total payload for those files dropped ~1.32 MB → ~0.70 MB (~45%).
  Deleted the superseded originals; updated every `src`/`img:` reference in `index.html`
  (including the `Person` JSON-LD `image` field) to the `.webp` filenames. Left `og-image.png`
  as PNG (re-compressed in place, lossless) since some social-share crawlers don't render WebP
  OG images reliably; left `fit-seal.png`, `apple-touch-icon.png`, `favicon.svg`,
  `prof-luginbuhl.webp` untouched (already optimal or too small to matter).
- **`index.html`, `componentDidMount` (device-tier block right after `this._fine`).** Added a
  synchronous device-capability tier check (`this._tier` = `'low' | 'mid' | 'high'`, plus
  `this._low`/`this._mid` booleans) from `navigator.hardwareConcurrency`, `navigator.deviceMemory`,
  `navigator.connection.saveData`/`effectiveType`, and `matchMedia('(pointer:coarse)')` — all
  synchronous, all optional-chained so missing APIs just fall through to a safer tier. Stamps
  `ax-tier-{low,mid,high}` on `<html>`.
- **`index.html`, root `<style>` block.** Added `.ax-tier-low` rules that strip the costliest
  paint work instead of hand-tuning every inline style: `.ax-anim{animation:none}` stops all
  decorative rotation/drift; the 4 hero nebula layers (`#ax-hero-neb>div`, each carrying its own
  26–44px blur — 4 separate GPU blur passes) have their per-element blur zeroed and the
  already-composited group blurred **once** instead, at a smaller 18px radius — cheaper than any
  single one of the originals, and keeps the haze look instead of going flat; the remaining
  `[style*="blur("]` matches (small 1px glint blurs elsewhere) are zeroed outright, and
  `[style*="backdrop-filter"]` (the fixed top bar) is swapped for a flat, more-opaque solid
  background. Attribute/child selectors target the existing DC-authored inline styles directly,
  so no markup/runtime changes needed.
- **`_measure()`, `_buildStars()`, `_frame()` (starfield/meteor/comet/dust), `_initCursor()`
  (cursor dust trail), `_initLaunch()`/`_stepLaunch()` (Starship finale).** All scaled by tier:
  DPR capped at 1 (low) vs 1.5 (mid/high); star count multiplied by 0.4/0.7/1; ambient
  meteors/comets disabled entirely on low tier (the one-shot welcome star on load is untouched —
  it's a single object, not a recurring cost); cursor dust-trail cap and spawn rate cut on low
  tier; the launch finale's existing self-adaptive quality knob (`_lnQ`, already sheds particles
  if it detects <30fps) now *seeds* lower on low/mid tier instead of starting at full quality and
  stepping down after the fact.
- **`componentDidMount`, the main `tick()` RAF loop.** Low tier now runs the whole `_frame()` at a
  capped ~30fps (`this._frameMinDt = 30`) instead of chasing 60 and dropping frames unevenly —
  uneven drops read as stutter/jank, a steady lower rate reads as smooth. Mid/high tier unchanged
  (uncapped, still gated on `!this._hidden`).
- Why: user asked to "hyper optimize" the site across weak/medium/strong phones and laptops so it
  isn't "laggy, slow or glitchy." The finale scene already had per-frame adaptive quality
  shedding and IntersectionObserver-gated canvases going in; the gap was (1) large image payload
  hurting weak/slow-network devices on first load, and (2) the starfield/nebula/cursor-trail
  layers running at full cost unconditionally on every device instead of scaling with what the
  hardware can actually afford. `prefers-reduced-motion` and `pointer:fine` gating were already
  respected and are untouched by this change — the new tier logic is additive and independent.

## 2026-07-16 — Fixed unwanted horizontal scroll on mobile
- **`index.html`, root `<style>` block (~line 251-252).** Changed `html{scroll-behavior:smooth}` /
  `body{margin:0;background:#070709;overflow-x:clip}` to set `overflow-x:hidden;width:100%`
  explicitly on **both** `html` and `body`, instead of relying on `overflow-x:clip` on `body`
  alone (which only reaches the viewport via the CSS overflow-propagation rule, and depends on
  browser support for the `clip` value — spotty on some mobile browsers).
- Why: user reported that on phones the page could be dragged left/right instead of only
  scrolling up/down. Several large decorative absolutely-positioned glyphs (the background
  roman numerals "III"/"IV"/"V" etc. and the "01"/"02"/"03" experience-timeline numbers) render
  wider than a phone viewport at some sizes; `overflow-x:hidden` on both root elements clips
  that bleed unconditionally, without depending on propagation/`clip` support. Verified with a
  headless Playwright pass at a 375px viewport: `document.documentElement.scrollWidth` now
  equals `window.innerWidth` exactly, and `scrollX` cannot be moved off `0` by any means
  (`scrollTo`, `scrollBy`, wheel) — horizontal scrolling is no longer possible.

## 2026-07-14 — Orbiting stars around the Reference photo: slowed down, visible orbit rings
- **`index.html`, Reference section (`ax-reference`), professor photo wrapper (~line 877-889).**
  Follow-up to the twin counter-orbiting stars added earlier today: (1) slowed both way down —
  `ax-rot` 7s→22s, `ax-rot-r` 9s→28s — per user feedback the original speed was too fast; (2) gave
  each orbit ring a visible track (`border:1px solid rgba(211,176,120,.32)` on the inner/clockwise
  ring, `border:1px dashed rgba(211,176,120,.22)` on the outer/counter-clockwise ring, each with a
  faint `drop-shadow` glow) so the star reads as traveling along a line instead of floating loose,
  matching the astrolabe-ring look used in the Hero section.
- Why: user asked the stars "stay on the orbit lines" — previously the rotating containers had no
  border, so only the star+glow was visible with no line marking its circular path.

## 2026-07-14 — Replaced remaining ↗ glyphs site-wide with gold link icons
- **`index.html`**: all remaining `↗` text glyphs replaced with the same inline
  gold (`#d3b078`) SVG chain-link icon used in the About section — Projects
  "View on LinkedIn" links (~line 821, ~849), Reference contact card email/phone
  (~line 901, 905), Reach Out contact card email/phone/LinkedIn (~line 984, 988,
  992), and the Résumé card's "View Online" button (~line 1011). Icon size scaled
  to each context's font size (8px/9px/10px).
- Why: same root cause as the About section fix — Windows renders the bare `↗`
  character via the system color-emoji font, ignoring the surrounding CSS
  `color`, so several links showed a blue arrow instead of gold. SVG icons render
  consistently across platforms.

## 2026-07-14 — Gold link icon for LinkedIn in About section
- **`index.html`, About section (`ax-about`), LinkedIn row (~line 500).**
  Replaced the plain `↗` text glyph after "in/orion-powers" with an inline SVG
  chain-link icon, stroked gold (`#d3b078`).
- Why: on Windows, the bare `↗` character was being rendered by the system emoji
  font as a colored (blue) glyph instead of inheriting the surrounding gold/cream
  text color. An SVG icon renders consistently across platforms.

## 2026-07-14 — Twin counter-orbiting stars around the Reference photo
- **`index.html`, Reference section (`ax-reference`), professor photo wrapper (~line 877-889).**
  Added two absolutely-positioned `.ax-anim` orbit rings centered on Dr. Luginbuhl's photo, each
  carrying a small glowing star at its edge — one spins with `ax-rot` (clockwise, 7s), the other
  with `ax-rot-r` (counter-clockwise, 9s), reusing the existing astrolabe-ring keyframes/pattern
  from the Hero section instead of inventing new ones.
- Why: requested visual flourish — two stars orbiting the recommendation photo in opposite
  directions. `ax-anim` class means they respect `prefers-reduced-motion` automatically.

## 2026-07-14 — Load-performance pass + problem/approach/result framing for top 2 projects
- **`defer` on the `support.js` script tag (`index.html`, head).** It was a plain blocking
  `<script src>` right before `</head>`, so the browser paused HTML parsing entirely until it
  downloaded+executed — meaning the Google Fonts stylesheet link and everything in `<body>`
  (including the `<x-dc>` helmet block's own preconnect tags) weren't even discovered until
  after that blocking fetch+exec finished. Confirmed `support.js` already gates its boot on
  `document.readyState`/`DOMContentLoaded` (line ~1650 in the generated file), so it's safe to
  defer — no code in the generated runtime changed, only the tag's attributes in `index.html`.
- **Preconnect + preload hints for the runtime's CDN scripts (`index.html` `<head>`, before the
  OG tags).** `support.js` dynamically injects `<script>` tags for React/ReactDOM from unpkg
  (and same-origin `image-slot.js` via its `<x-import>` mechanism) only after it has itself
  downloaded and started executing — a fully serialized waterfall. Added
  `<link rel="preconnect" href="https://unpkg.com">` plus `<link rel="preload" as="script">` for
  `react@18.3.1`, `react-dom@18.3.1` (URLs + SRI integrity copied verbatim from `support.js` so
  the browser reuses the preloaded response instead of double-fetching), and `image-slot.js`.
  These now start downloading in parallel with `support.js` itself instead of after it.
  Deliberately did **not** preload Babel-standalone: `kindOf()` in `support.js` only invokes it
  for `.jsx`/`.tsx` x-import targets, and this page's only x-import (`image-slot.js`) is a plain
  `.js` file, so Babel never actually loads on this page — preloading it would just be a wasted
  fetch with a browser console warning.
- **Project copy — LLM Network Analyzer + BrainBench cards (§V, `ax-work`) and their duplicate
  copy in `#ax-noscript-fallback`.** User feedback from a recruiter-marketability research pass:
  portfolio projects read stronger with a problem→approach→result beat, not just a feature list.
  Added one sentence to each naming the real constraint/challenge and how it was solved, keeping
  the existing facts (Gemma 2 12B/Ollama/WebSocket; matched-subset methodology/Northrop Grumman/
  IEEE) intact.

## 2026-07-14 — Reverted the tiltMax bump; ascent lean now front-loaded right at liftoff instead
- **`_stepLaunch()` (`index.html`, ~line 1606-1639).** User feedback: the previous change (raising
  `tiltMax` from 34.4deg to 66deg so the body's lean tracked the flight path's own tangent angle more
  closely) "looked way worse" — reverted `tiltMax` back to exactly `0.60` (34.4deg), its original value.
- What was actually wanted: more tilt **right at launch**, not later in the ascent. Previously the lean
  eased in gradually across the *entire* ascent window (`smooth(cl(0.02, A_SEP, aa))`, not reaching full
  `tiltMax` until separation at `A_SEP=0.32`), so the body looked mostly upright for a while after
  liftoff. Added `A_LEAN = 0.12` and changed the window to `smooth(cl(0.02, A_LEAN, aa))`, so the body
  now reaches full `tiltMax` quickly (by `a=0.12`, well before separation) and holds that lean flat from
  `A_LEAN` to `A_SEP`, instead of still easing in right up to the moment of separation.
- Verified with a pure-math Node check: rotation now ramps 0deg -> 34.4deg between `a=0.02` and `0.12`,
  then holds flat at 34.4deg all the way to `A_SEP=0.32`.

## 2026-07-14 — Starship ascent lean increased to actually track the flight arc
- **`_stepLaunch()`'s `tiltMax` constant (`index.html`, ~line 1609).** User loved the braking kick and
  asked for the ascent lean to follow the arc of the flight path better. Checked how well the old
  `tiltMax = 0.60` rad (34.4deg) tracked the position spline's own tangent angle during ascent (a Node
  script replicating `_lnBuildPath`/`_lnSpline`/`_lnAtDist` with the same geometry formulas, sampling
  the tangent direction numerically at several `a` values): the body was badly under-rotated relative
  to the curve it was flying along — only 34.4deg of body lean at separation (`A_SEP=0.32`) against a
  path tangent of ~69deg there, a 35deg gap, and the gap was present through the whole ascent, not just
  at the end. Raised `tiltMax` to `66 * Math.PI/180` (66deg) — re-checked the same way and the body lean
  now tracks the path tangent within 1-3deg through the back half of ascent (`a=0.22` to `0.32`), rather
  than trailing far behind it.
- `tiltMax` also drives the ship's separation attitude (`splitRot`) and departure offset, so the ship's
  hand-off pose updates consistently with the steeper booster lean — no separate edit needed there.
- Verified with a pure-math Node comparison of the spline's actual tangent angle vs `rotAt(aa)` across
  the ascent range, before and after the change.

## 2026-07-14 — Starship booster kick: eased back to 25deg, stretched even longer (~2.2s)
- **`_stepLaunch()`'s `rotAt(aa)` constants (`index.html`, ~line 1607-1610).** Follow-up to the
  40deg/1.85s kick: user feedback was "still too tilted, have it tilt less and do it for longer... the
  goal is a smooth strong animation." Dropped `kickAngle` 40deg → 25deg and widened the window further
  — `A_FLIPBACK` 0.80→0.76, `A_KICKPEAK` 0.90→0.89, `A_KICKEND` 0.965→0.967 — stretching the kick's
  rise+fall from ~1.85s to ~2.2s of the 13.5s flight, roughly symmetric (rise ~1.11s, fall ~1.08s)
  rather than front-loaded, so the motion reads as a single smooth lean-and-recover rather than a
  sharp snap, while still resolving to exactly 0deg (dead vertical) at `A_REST` for the catch.
- Verified with a pure-math Node check of the updated `rotAt(aa)`: peak is exactly -25.0deg at
  `A_KICKPEAK` (0.89), 0.0deg at `A_FLIPBACK` (0.76) and again at `A_REST` (0.97), monotonic and
  symmetric-ish on both sides of the peak.

## 2026-07-14 — Skills accordion tab labels enlarged, sized proportional to container not viewport (`#ax-skills`)
- **`renderVals()` skill-group mapping (`index.html`, ~line 2576-2586).** Follow-up to the earlier
  "collapsed tab labels turned upright" pass — user wanted the collapsed category names (Languages,
  Frameworks, Data & Backend, etc.) noticeably bigger. First attempt bumped `catSize` to
  `clamp(11.2px,1.75vw,14.4px)` using a plain viewport-width-based clamp — looked good at a wide
  1440px test viewport, but broke badly at 760-900px (the low end of the desktop/"wide" breakpoint):
  words like "FRAMEWORKS" and "HARDWARE & PROTOTYPING" fragmented into ugly multi-line, mid-word
  splits, because the section's own container width plateaus at `max-width:944px` only above
  ~1049px viewport — below that, container width scales at `0.9×viewport` (padding is `5vw` until
  its `51.2px` cap), so a naive `vw` coefficient calibrated against the 944px-wide case is *way*
  oversized relative to the actual (narrower) column at smaller desktop widths.
- Fixed by deriving the `vw` coefficient from that `0.9×viewport` relationship so font size tracks
  the container's real width across the whole 760-1049px range, then capping at the same point the
  container itself plateaus: `catSize: clamp(8.8px,1.2vw,12.4px)`. Also loosened the collapsed-tab
  layout a touch to give the text more room: `flex` ratio (active:inactive) eased from 3.2:1 to
  2.6:1, horizontal `tabPad` trimmed 3.2px → 1.2px, letter-spacing dropped to `0em` (from `.02em`).
- Verified with headless Playwright screenshots at 760/820/900/1046/1440px — all 9 category labels
  (including the two 11-character ones, "Performance" and "...Prototyping") now wrap only at word
  boundaries with no orphaned single-character lines, at every width. 390px mobile/stacked layout
  (a separate `narrow` branch, untouched by this change) re-confirmed unaffected.
- Why: "bigger" text that only works at one screen size isn't actually fixed — this section is a
  9-column flex accordion with no wrap room to spare, so size has to be driven by the same box model
  the columns use, not a flat viewport fraction.

## 2026-07-14 — Florida Tech rocket reverted; the real target was the Starship booster-catch finale
- **All of this session's earlier rocket tilt edits were on the wrong animation.** They landed on
  `_initRocket()`/`#ax-rk-ship` (`index.html`, ~line 509, ~line 2304) — a small decorative SVG rocket
  that flies past the Florida Tech seal in the Education section and fades out. That element has no
  "catch" of any kind, so none of those edits could ever match the user's actual request ("tilt before
  it gets caught"). Reverted it to its pristine original state: the `<g id="ax-rk-ship">` style
  attribute and its `ship.animate(...)` keyframes are byte-for-byte back to what they were before this
  session touched them (no `transform-box`/`transform-origin`, no `transform: rotate(...)` keyframes).
- **The real target is the Starship + Mechazilla booster-catch finale** in `#ax-contact`
  (`_stepLaunch()`, ~line 1557), a canvas animation — see the next entry for the actual fix.
- Why this happened: a first-pass grep for "rocket" only turned up `_initRocket`, and that was treated
  as the only rocket animation on the page without checking for others. Lesson for next time: this
  page has (at least) two independent "rocket" animations — the Education-section SVG flyby and the
  Contact-section Starship/booster finale — grep broadly (`starship`, `booster`, `catch`, `launch`) and
  confirm which one the user means before editing either.

## 2026-07-14 — Starship booster: added a braking "kick" before the catch (nose left, thrust right)
- **`_stepLaunch()`'s `rotAt(aa)` rotation formula (`index.html`, ~line 1605-1634).** The booster's
  landing-flip previously just eased monotonically from horizontal back to dead vertical by `A_REST`
  (arrival/catch). Added a braking kick layered on top: the flip-to-vertical now completes at a new
  `A_FLIPBACK` marker, then rotation dips further negative (nose left, engine/thrust right) to a peak
  of `kickAngle`, then eases back to exactly 0 by `A_REST` so it's still caught perfectly plumb.
  New constants: `A_FLIPBACK`, `A_KICKPEAK`, `A_KICKEND`, `kickAngle` (40deg, i.e. `40 * Math.PI/180`).
  Uses the same `smooth(cl(...)) * (1 - smooth(cl(...)))` rise/fall bump idiom already used elsewhere
  in this function (e.g. `bFlame`'s boostback/landing terms), so it fits the existing style.
- First pass used a short, snappy window (`A_FLIPBACK=0.82, A_KICKPEAK=0.87, A_KICKEND=0.93`, kick
  spanning ~1.1s of the 13.5s flight) — user feedback was "too strong of a tilt for [how] short [it
  is], have a strong tilt for longer." Widened the window (`A_FLIPBACK=0.80, A_KICKPEAK=0.90,
  A_KICKEND=0.965`, spanning ~1.85s) so the same 40deg peak reads as a deliberate, sustained braking
  lean instead of a snap, without softening the angle itself.
- The grid fins react to this automatically: `finCmd` is already driven by the numeric derivative of
  `rotAt`, so the fins visibly bite into the kick and the recovery without any separate fin code change.
- Verified two ways: (1) a pure-math Node check of `rotAt(aa)` across `aa=0.68..1.0` confirms the curve
  hits exactly 0deg at `A_FLIPBACK`, exactly -40.0deg at `A_KICKPEAK`, and exactly 0.0deg again by
  `A_REST`; (2) a Playwright pass against a local `python -m http.server`, scrolling to `#ax-contact`
  and screenshotting the canvas at the wall-clock times corresponding to those `a` values (inverting
  the `p -> smootherstep -> a` mapping numerically), confirming the booster and tower render as
  expected through the sequence.

## 2026-07-14 — Larger Skill Set panel header text
- **`ax-skills` section (`index.html`, ~line 654-655).** "Skill Set" label and the
  "{{ skillCount }} skills · 9 groups — select a group" subtitle were fixed at 8px/7.2px —
  hard to read. Bumped to responsive `clamp()` sizes (Skill Set: 11.2-13.6px, weight 600;
  subtitle: 9.6-11.2px) and lightened the subtitle color from `#6d675c` to `#8f897c` for
  better legibility at the larger size.
- User request: "make this text bigger."

## 2026-07-14 — Rocket tilt direction reversed (nose left / thrust right) and pushed to -130deg
- **`_initRocket()` (`index.html`, `ship.animate(...)` keyframes).** Previous passes rotated the ship
  clockwise (positive `rotate()`), which — worked out geometrically — actually swings the nose toward
  the right/level and the tail toward the left/up. User clarified the intent: nose should tilt *left*,
  tail/thrust should point *right*, while decelerating. That's the opposite sign: switched to negative
  (counter-clockwise) rotation, ramping 0deg → -80deg → -130deg from offset 0.34 to 0.85, well before
  the fade-out at 0.95-1.0.
- Verified with a Playwright probe at two viewport sizes (1400x900 and 1366x768, to rule out the
  `cover > 0.45` `IntersectionObserver` trigger simply not firing on a shorter/more common laptop
  height): in both, the launch animation triggers within ~300ms of scroll-settle, and the ship's
  computed `transform` matrix decodes to a smooth, monotonic ramp from 0deg to -130deg while opacity
  stays at 1 (i.e. fully visible, not hidden in the fade).
- Why: matches the user's mental model of the maneuver (nose pitching one way, engine thrust visibly
  firing the other way to brake) rather than an arbitrary "more/less" tilt amount.

## 2026-07-14 — Skills section: collapsed tab labels turned upright and enlarged (`#ax-skills`)
- **`index.html` (~line 657-684 markup, `renderVals()` skill-group mapping ~line 2568).** Collapsed
  group headers in the horizontal accordion used `writing-mode:vertical-rl` (sideways text) on wide
  screens. Removed the vertical writing mode; labels are now upright, sized up (`clamp(9.6px,1.4vw,
  11.2px)` vs the old 8.8px), tracked tighter (`.02em` vs `.3em`), and wrap at word boundaries within
  each ~85px column. Tuned `tabPad` (6.4px → 3.2px horizontal) so 11-character words ("PERFORMANCE",
  "PROTOTYPING") land on one line instead of orphaning a single trailing letter.
- First pass replaced the whole horizontal accordion with a vertical stacked/FAQ-style layout (mirroring
  the existing <760px mobile branch) to sidestep the narrow-column text-fitting problem entirely — but
  the user wanted the horizontal opening motion kept, just the headers fixed. Reverted the stack, kept
  `narrow`/`skDir`/`skHeight`/per-tab `flex`/`tabDir` exactly as before, and fixed sizing in place.
- Why: sideways column headers were hard to read; horizontal accordion behavior (columns widening
  left-to-right on hover/click) was intentional and requested to stay.
- Verified with a headless Playwright pass at 1440px (desktop, all 9 groups incl. the two 11-char
  labels) and 390px (mobile — unaffected, still the pre-existing stacked/row layout).

## 2026-07-14 — Professor recommendation blurb: dropped course codes, framed for recruiters (`#ax-reference`)
- **Testimony body copy (`index.html`, ~line 875).** First pass named the exact courses (CSE 1002,
  CSE 4250) to fix inaccurate copy, but user pointed out recruiters don't care about internal course
  codes — that's not what makes a recommendation hireable. Rewrote to drop the codes entirely and
  instead sell the growth narrative: taught twice, years apart, watched the user go from first-year
  student to engineer ready to ship real systems.
- Why: recommendation section exists to help the user get hired; copy should read as a credible,
  outcome-oriented endorsement, not a transcript entry.

## 2026-07-14 — Rocket bank angle pushed way up (48deg → 105deg) per feedback it still read as flat
- **`_initRocket()` (`index.html`, `ship.animate(...)` keyframes).** The previous pass (48deg peak
  tilt, pivot-bug fixed) was mechanically correct — verified with a Playwright probe — but user
  reported still seeing no visible difference on repeated review. At the ship's small on-path size
  (~30px), a rotation on the same order as the path's own natural curve reads as "still following the
  curve," not as a distinct bank. Pushed the peak tilt to 105deg (past perpendicular to its direction
  of travel) so the final orientation is unmistakably different from the path tangent, ramping in
  slightly earlier (offset 0.4 → 0.88 instead of 0.45 → 0.9) so there's more visible runway before the
  fade-out at 0.95–1.0.
- Also flagged to the user: if this still doesn't show, the likely cause is viewing a stale/cached tab
  or the deployed GitHub Pages copy rather than the locally edited file — nothing has been pushed to
  the remote yet, so the live site cannot reflect any of this session's rocket changes until deployed.

## 2026-07-14 — Skills section moved above Work Experience
- **Section order (`index.html`)**: moved the whole `#ax-skills` ("A complete toolkit.")
  section to sit right before `#ax-exp-pin` (Work Experience) — new order is
  About → Education → Skills → Experience → Projects → Reference → Contact.
- **Roman-numeral watermarks/labels renumbered** to match: Skills `V`→`III`, Experience
  `III`→`IV`, Projects `IV`→`V` (both the large background glyph and the small
  `I · SECTION NAME` label in each section's header row).
- **Top nav (`#ax-nav`) reordered** — the `Skills` link now sits before `Experience`,
  matching the new content order. This isn't cosmetic: `_frame`'s active-nav-highlight
  loop (`index.html`, iterates `this._navLinks` and keeps the last entry whose
  `section.offsetTop <= mid`) assumes the nav-link array is in the same top-to-bottom
  order as the sections themselves — leaving the old nav order in place would have made
  the highlight jump backwards to "Skills" while scrolled through "Experience".
- **Ambient-meteor gate comment updated** (`_measure()`, ~"ambient meteors stay quiet
  through Hero/About/Education/...") to list Skills before Experience — the gate itself
  (`document.getElementById('ax-work').offsetTop`) needed no code change since it
  recomputes from the live DOM, but the comment enumerating which sections precede the
  gate was now stale.
- **`<noscript>` fallback content reordered to match** — the plain-HTML `Skills` `<section>`
  (~`#ax-noscript-fallback`) moved to sit before `Work Experience`, same as the animated
  page (this fallback already had an unrelated pre-existing Experience/Education order
  quirk — left untouched, out of scope for this change).
- Why: user asked to move the "complete toolkit" (Skills) section above Work Experience.
- Verified with a headless Playwright pass against a local `python -m http.server`:
  nav order reads About/Education/Skills/Experience/Projects/Contact; each section's
  numeral now reads III·SKILLS, IV·WORK EXPERIENCE, V·PROJECTS; the Experience pin's
  internal scroll-jacked layer/progress-rail animation still advances correctly through
  all three jobs at its new position; no new console/page errors introduced (the
  pre-existing `.image-slots.state.json` 404 and one `ERR_INVALID_URL` are unrelated to
  this change, reproduced before and after).

## 2026-07-14 — Rocket banks right before it fades out at the top of the Education arc
- **`#ax-rk-ship` `<g>` (`index.html`, ~line 509).** Added `transform-box:fill-box;transform-origin:center`.
  Without it, the `<g>`'s percentage-based `transform-origin` resolves against the whole SVG viewport
  (`transform-box` defaults to `view-box`), not the ship's own bounding box — so any `rotate()` on the
  element pivoted around the SVG's top-left corner instead of the ship itself, warping its position
  along a huge arc instead of tilting in place. That's why the first pass at this (rotate added to the
  `ship.animate()` keyframes with no `transform-box` fix) was imperceptible: the "tilt" was actually a
  large positional warp that landed off-screen, at the same moment the ship was already fading out.
  Verified with a scripted Playwright probe (`getComputedStyle`/`getBoundingClientRect` sampled across
  the animation) before and after the fix — confirmed the pre-fix `transform-origin` computed to
  `0px 0px` and caused non-monotonic jumps in the ship's screen position, and the post-fix version
  pivots at the ship's own center with a smooth, monotonic path.
- **`_initRocket()` (`index.html`), the `ship.animate(...)` keyframe list.** Added a `transform: rotate(...)`
  ramp (0deg → 38deg → 48deg) layered on top of the existing `offset-rotate:auto` path-following
  rotation, ramping in from offset 0.45 to 0.9 and holding through the fade-out at 1.0.
- Why: the ship previously just followed the path's tangent with no independent motion — it looked
  mechanical rather than decelerating. The clockwise tilt (now large enough and early enough to read
  clearly while still fully opaque) makes the tail swing further right as the ship nears the top of the
  arc, reading as banking/slowing down right before it fades out ("gets caught"), timed to the existing
  overall ease (`cubic-bezier(.5,.05,.3,1)`, already slow near the end) so the tilt lands in sync with
  the perceived deceleration.

## 2026-07-13 — Hero shooting star made crisp/singular; ambient meteors gated out of the first 3 sections
- **Only one shooting star through Hero/About/Experience (`index.html`, `_measure`/`_frame`).**
  The ambient `_meteors`/`_comets` generator could already spawn extra streaks while scrolled
  through the first 3 sections (and even had a `heroBoost` that made this *more* likely in the
  Hero), competing with the single on-load `_welcomeStar`. Added `_ambientGateY` (computed in
  `_measure()` as `document.getElementById('ax-edu').offsetTop` — the point where the Experience
  pin section ends) and gated all ambient meteor/comet spawns behind `y >= this._ambientGateY`.
  Removed the now-unused `heroBoost` variable. Ambient meteors resume normally once scrolled past
  Experience into Education onward.
- **Crisper `_welcomeStar` rendering (`index.html`, the `if (this._welcomeStar)` block in
  `_frame`).** Thinned/dimmed the soft outer glow so the streak reads sharp rather than smeared,
  brightened the core gradient, added a small four-point glint/sparkle at the head (movie-style
  shooting-star flare), and added a subtle independent "vanish flourish" (a few short radiating
  ticks) that appears briefly as the star nears the end of its flight and fades from view.
- **Slower flight (`index.html`, `_fireWelcomeStar`).** Increased `frames` from `42` to `75`
  (same travel distance, ~1.8x longer/slower) per follow-up feedback that the star felt too fast.
- Verified via a headless Playwright pass against a local `python -m http.server`: no console/page
  errors, `ax-edu.offsetTop` (4979px) exactly matches `ax-exp-pin` end (`offsetTop` 1919 + height
  3060), and zoomed screenshots of the flight show the crisp core/glint/fade as intended.

## 2026-07-13 — Whole site rescaled to "80% browser zoom" as the default; Starship fin
## silhouette corrected; booster catch starts sooner
- **The 80% rescale (`index.html`, sitewide).** The site read as "too zoomed in"; at Chrome
  80% zoom it looked right. Baked that in as the default, WITHOUT any `zoom`/`transform`.
  - **Why not `zoom: 0.8`** (this was tried and rejected — don't retry it): under CSS `zoom`
    Chrome puts `scrollY` and `getBoundingClientRect()` in *zoomed* space but leaves
    `offsetTop`, `offsetHeight` and `innerHeight` *unzoomed*. The scroll math in `_frame`
    (`p = (scrollY - pinTop) / pinRange`, built from `offsetTop`/`offsetHeight`/`innerHeight`)
    therefore mixes coordinate spaces and the pinned Experience scene desyncs — at 50% through
    the pin it had already unpinned into Education. `100svh` sections also render at 0.8×
    (720px in a 900px viewport), so the hero stopped filling the screen and About bled in.
    Same coordinate split rules out `transform: scale()`.
  - **What was done instead:** scaled the CSS *values*. Every `px` literal inside a whitelist
    of size-bearing properties (`font`/`font-size`, `width`/`height`/`min-`/`max-` family,
    `padding`, `margin`, `gap`, `top`/`right`/`bottom`/`left`, `inset`,
    `grid-template-columns`) was multiplied by 0.8 — including px endpoints inside
    `clamp()`/`min()`/`max()`/`calc()`. Every `vw`/`vh`/`vmax`/`svh`/`%` was left ALONE, as
    were borders, radii, shadows, filters, transforms and all hairlines (<3px).
  - **Why that's the faithful transform:** at 80% zoom the layout viewport grows by 1/0.8 and
    everything renders at 0.8×, so a `clamp(a, k·vw, b)` lands at `clamp(0.8a, k·vw, 0.8b)` on
    the *unzoomed* viewport. Scaling only the px endpoints reproduces it in every binding
    regime. Viewport-unit values are already zoom-invariant in physical px, so they must not
    be touched — which is also why `100svh`/`340vh` still fill/scroll exactly as before.
  - **Values the markup pass could NOT reach, fixed by hand:** the `<style>` block's
    media-query declarations (`.ax-hl1`, `#ax-name-l2`, `#ax-hero-inner` padding, `#ax-nav`
    gap), and four px values the script injects into styles via `renderVals()` —
    `skHeight` (`clamp(460px,58vh,560px)` → `clamp(368px,58vh,448px)`), `bodyW`, the mobile
    accordion `h`, and `tabPad`. Missing `skHeight` left the Skills panel too tall for its
    now-smaller contents. The `_glint` sweep (`width:140px` + `offsetWidth - 140`) is a
    coupled pair — both moved to 112.
  - **Verified** (Playwright, 1512×900, real Chrome): hero still exactly 900px (fills), pin
    still 340vh/3060px, and an A/B of the pinned scene against the pre-change build shows the
    same active layer and same fade phase at every scroll fraction (deltas ≤0.02 opacity /
    0.1% fill = sub-pixel `offsetTop` rounding). Animation choreography is unchanged.
### Finale (contact-section launch) — same session, driven by user feedback
- **Starship silhouette (`_drawStarship`).** Both flap pairs redrawn to the real planform —
  a swept trapezoid: long root chord hinged on the hull, straight leading edge raked hard
  outboard, short blunt tip, trailing edge square back to the body. Forward canards ride high
  on the nose cone (root pulled inboard so they sit ON the taper, not floating off it); aft
  flaps sit at the base at ~2× the area. Far pair drawn behind the hull, near pair in front,
  so it reads 3D when small. Ship height 0.50 → 0.56 × booster. The first attempt used wide
  tip chords and shallow rake and read as blocky aeroplane wings — the fix was more sweep and
  a much narrower tip.
- **Catch starts sooner (`_stepLaunch`).** `A_DESCSTART` 0.80 → 0.70, landing burn
  0.885 → 0.795, arm close 0.81 → 0.72 (all on the eased arc-length progress `a`).
- **Separation is now smooth (the jerk is gone).** The ship's post-separation path bent
  straight for the vanishing point using `smooth()`, whose slope is 0 at the start — so the
  instant it detached its velocity fell from the stack's speed to ZERO and it visibly stalled.
  Now the stack's velocity is sampled at the split, the ship COASTS on along it, and only then
  bends toward the vanishing point with a `smooth()` weight (slope 0 at 0), so the coast term
  owns the first derivative: position *and* velocity are both continuous. Measured across the
  split: 1602 → 1617 px/unit-a (0.7% change; it used to drop to 0).
- **Hot-staging.** The ship's engines now light while it is still ATTACHED, just before the
  split (`shipFlame` window moved to `A_SEP-0.06 → A_SEP-0.005`), and the flame is drawn in
  the stack's frame firing down past the interstage. Measured: engines light at `a=0.268`,
  separation at `a=0.322`.
- **Grid fins actually guide the booster.** They used to hunt on two random out-of-phase
  sines, which read as twitching. Deflection is now driven by the vehicle's own turn command
  (`turnRate`, the rate its attitude schedule is rotating), applied differentially about the
  mount points: +0.41 rad biting into the flip to horizontal, ~0 through the glide (small hunt
  only), −0.52 rad to pitch upright for the catch, settling to 0 at contact. Fins made larger.
  `_drawSuperHeavy`'s `finSteerAmp` param is replaced by `finCmd` (signed) + `finAct` (0..1).
- **Upper stage no longer clipped by the section above.** Separation was happening so high in
  the frame that the vanishing point sat only ~33px above the ship while it was still climbing
  fast, so ANY velocity-continuous departure overshot out of the canvas — the nose reached
  y = −77px (77px above the top) from a≈0.32 to a≈0.60. Fixed by staging much lower
  (`sepY` → `max(h*0.46, bodyH*1.55)`) and completing the bend earlier (by `su=0.55`). Nose now
  peaks at y=+28px, fully inside.
- **Page content sits above the animation.** `#ax-launch` had `z-index:3`, painting the rocket
  OVER the contact cards; it's now `z-index:0`, with the content wrapper and footer at
  `z-index:2`. The vehicle now flies behind the copy.

## 2026-07-12 — Finale rebuilt again: split mission (ship to orbit + booster catch), one
## continuous arc-length flight path, real Starship fin silhouette, active grid-fin steering
- `index.html`, finale (`_stepLaunch`, `_drawStarship`, `_drawSuperHeavy`) — a full redesign
  driven by several rounds of user feedback in one session:
  - **Split mission.** The stack ascends together, then STAGES: the Starship continues on
    its own — flying off and shrinking to a vanishing point until it winks out ("to orbit"),
    like the Florida Tech launch animation the user referenced — while the Super Heavy
    BOOSTER flies its own return path back to the tower and is CAUGHT by the chopsticks
    (the previous "recede only, no catch" version and the earlier "catch only" version are
    both superseded by this split).
  - **One continuous position function, whole mission.** Replaced the old per-phase pose
    (separate formulas for "ascending stack" vs "booster post-separation", each easing to
    zero velocity at its own boundary) with ONE arc-length-sampled Catmull-Rom spline
    covering pad → separation → boostback crest → horizontal cruise → descent → catch,
    driven by a single smootherstep-eased progress `a`. Velocity now only reaches zero at
    the true start (resting on the pad) and true end (resting in the arms) — never at an
    internal phase boundary — which is what was reading as a "pause"/"choppy" cut at stage
    separation. Verified offline: peak accel/speed ratio right at the separation instant is
    0.002–0.06 (vs. up to 0.30 elsewhere in the flight from real curvature), no NaN, body
    stays on-canvas (≥40px margin) across 6 viewport sizes.
  - **Steeper launch angle + true horizontal glide, per user request.** The booster now
    leans further on ascent (`tiltMax` 0.60 rad, up from 0.26) and, after separation,
    rotates all the way to `Math.PI/2` — genuinely lying on its side — and GLIDES at that
    horizontal attitude across to the tower, then flips back upright for the landing burn
    and catch. Rotation is its own continuous function of `a`, blended with `smooth()`
    windows placed so they never coincide with the position spline's zero-velocity
    endpoints, so the flip itself never reads as a stall either.
  - **Engine flame stays lit through staging.** `mainFlame` no longer tapers to zero before
    separation and `boostback` now ramps to full *before* `a` reaches the separation point,
    so the render hand-off (stack draw → booster-only draw) crosses between two
    already-bright flames instead of a dark gap — fixes a second, subtler "choppy pause"
    (the fire visibly going out for a beat) that survived the position-smoothness fix.
  - **Ship hand-off is exactly continuous.** The Starship's separation pose (position,
    rotation, scale) is evaluated from the *same* spline/rotation/scale functions at the
    exact separation fraction, so it never pops relative to the stack it just left.
  - **Starship fins now match the real vehicle** (photo reference supplied by the user):
    replaced the old single generic "flap" shape with distinct small swept CANARDS (near
    the nose) and much larger swept AFT FLAPS (at the base), both perfectly left/right
    symmetric (viewed head-on) with only a slight shade difference for depth. Canards then
    moved further up onto the nose taper (root narrowed to `sr*0.82` to match) per follow-up
    feedback that they should sit higher.
  - **Grid fins actively steer on final approach.** Each grid fin now pivots independently
    about its own mount point (`_drawSuperHeavy`'s new `finSteerAmp`/`el` params), idle/
    centred through the ascent and glide, then visibly "hunting" with an out-of-phase
    sine wobble during the descent/landing-burn window (`A_DESCSTART` → `A_REST`), settling
    dead-centre just before the arms close — rather than sitting static once deployed.
  - Also fixed from earlier in the session: the launch canvas (`#ax-launch`) now sits above
    the Contact content (`z-index:3`, still `pointer-events:none`) so the whole mission is
    visible instead of hidden behind the cards, then fades out (canvas opacity) ~1.5s after
    the catch so it never permanently covers the text.
- Why: iterative user feedback across one long session — first that the finale was hidden
  behind the Contact content, then that stage transitions were "choppy"/had "big gaps",
  then a request to have the Starship fly off into the distance like the Florida Tech
  animation, then a request to bring back the booster catch alongside that (the real split
  mission), then that the switch from launch to catch still wasn't smooth and the rocket
  briefly pointed down (fixed by removing any downward-facing attitude and driving position
  by one continuous spline), then that the transition into the horizontal glide still had a
  pause (traced to the flame going dark, not the motion), then two fin requests (match the
  real Starship silhouette from a supplied photo; move the canards higher), then a request
  for the grid fins to visibly steer during landing. Verified visually throughout via
  headless-Chromium (Playwright) screenshots, including a React-Fiber instance lookup to
  read real elapsed animation time (`_launch.t0`) directly from the page for precise timing
  checks instead of guessing wall-clock offsets.

## 2026-07-12 — Finale: smooth upright launch, visible over the content, dark fins fixed
- `index.html`, finale (`_stepLaunch` + new `_lnBuildPath`/`_lnAtDist`; `_drawStarship`;
  `#ax-launch` wrapper) — three user-driven fixes:
  - **Motion is now one even, continuous glide.** Replaced the piecewise per-stage pose
    (each stage smoothstepped from/to zero velocity → visible stalls/"gaps" at the joins)
    with a single Catmull-Rom spline **sampled by arc length** and advanced by a
    **smootherstep** ease. Speed is even end-to-end with a soft liftoff + soft catch; the
    only per-`p` timing left gates thrust/staging/callouts, not the position. New helpers:
    `_lnBuildPath` (cached arc-length LUT, 110 samples) + `_lnAtDist`. Verified offline: no
    NaN, body on-canvas at 6 sizes, peak accel/speed ratio 0.05–0.11 desktop (was ~1+).
  - **Booster stays upright — never points down.** Removed the boostback **flip** (rot went
    to ~2.15 rad). `rot` is now a capped gentle gravity-turn lean (≤~0.16 rad) that eases
    back to vertical; engines always face the ground. Thrust profile simplified to
    ascent-burn → coast → landing-burn (no mode-1 boostback for the booster). Callouts
    updated (BOOSTBACK BURN → BOOSTER COAST). All effect gates moved from raw `p` to the
    eased arc-length progress `a` so they line up with where the vehicle actually is.
  - **Animation is visible + doesn't cover the content.** The launch canvas was painted
    *behind* the opaque Contact cards. Gave `#ax-launch` `z-index:3` (still
    `pointer-events:none`) so the whole flight renders **on top**, then added a one-shot
    scene **fade-out** (canvas opacity → 0 ~1.5 s after the catch) that clears the canvas
    and stops the loop, so the settled booster never sits permanently on the text. Opacity
    resets to 1 when the section re-enters and the finale restarts.
  - **Right-side Starship flaps were ~invisible.** The far-side flaps were near-black
    (`#111014`/`#141317`) against the `#070709` sky. Brightened all four flaps
    (far `#403c48`/`#4a4653`, near `#565160`/`#605b6b`) — far still dimmer than near for
    depth, but clearly lit.
- Why: user reported the launch→catch was covered by the Contact content, the stage
  transitions were choppy ("big gaps"), the rocket faced down mid-flight, and the right
  fins were too dark to see. Verified visually with a headless-Chromium (Playwright) pass
  sampling the full ~14 s flight: upright ascent → top crossing → upright descent/landing
  burn → catch in the arms → clean fade to unobstructed content.

## 2026-07-12 — Finale rebuilt: continuous Flight-5-style launch→catch, fits one screen
- `index.html`, finale script (`_stepLaunch` + helpers), researched against the real
  Starship Flight 5 profile (NASASpaceflight / Wikipedia / TWZ):
  - **Whole mission fits on screen at once.** The canvas fills the Contact section
    (`min-height:100svh`); every phase is clamped inside it. (A mid-session variant
    spanned Reference + Contact, but the user then asked for the full animation to fit
    on screen, so it was reverted — `_stepLaunch` reads `_lnW`/`_lnH` set in `_measure`,
    and the IntersectionObserver watches the `#ax-launch` wrapper.)
  - **One continuous 14 s mission**, real rotation transforms (no more tilt-only):
    hold-down ignition (deluge steam puffs) → gravity-turn ascent → MECO → hot-stage
    separation (ship lights its engines while attached, then fades toward orbit) →
    booster **flip + boostback burn** carrying it across the top → grid-fin descent →
    **13-then-3-engine landing burn** with a sideways translate into the chopsticks →
    settle. Mission-control callouts (IGNITION … CAUGHT) render in JetBrains Mono.
  - **New helpers:** `_drawFlame` (teardrop plume + shock diamonds + glow, 3 modes),
    `_drawPad` (orbital launch mount), `_lnPuffSpr` (cached steam sprite). `_drawStarship`
    / `_drawSuperHeavy` are now centre-origin; callers own translate/rotate/scale.
  - **Extras:** constellation-style dotted flight trail, Max-Q vapour halo, ground
    hairline, adaptive quality tier (`_lnQ` drops particle budget + extras if the frame
    EMA exceeds ~34 ms), 170-particle plume cap.
  - Verified offline (scratchpad harness, `_lnPose`): no NaN/Inf, body stays on-canvas
    for the entire flight at 6 sizes (360×1240 … 1920×1750, plus short 1280×860),
    booster settles exactly on the arms (`endY == finalCY`).
- Why: user asked for a full continuous, realistic-but-clean launch+catch revamp that
  renders well on all screens/devices and spans the Contact + professor-reference sections.

## 2026-07-12 — Fix undersized NFC Business Cards project image
- `index.html` line ~54: the CSS override rule that force-sizes `<image-slot>` custom
  elements to fill their project-card frame (`width/height:100% !important`) listed
  `#slot-analyzer, #slot-brainbench, #slot-website` but omitted `#slot-nfc` — so that
  slot was stuck at the component's shadow-DOM default of 240×160px instead of its
  ~555×347px frame. Added `#slot-nfc` to the selector and dropped the stale
  `#slot-website` (no such slot exists in the current markup).
- Why: user reported the NFC card photo in the Projects section looked too small
  compared to the projects above it. Confirmed via headless-browser screenshot +
  computed-style inspection (Playwright) before and after the fix.

## 2026-07-11 — Contact finale: keep the whole arc on-screen + lower catch
- `index.html`, `_stepLaunch` / `_drawMechaTower` / `_drawStarship`:
  - **Trajectory now one continuous, fully-visible arc.** Replaced the off-screen apex
    (`ascTop = -(bodyH+150)`) and invisible left→right teleport during coast with an arc
    that tops out at `apexTop = h*0.13` and never leaves the canvas: rise on the left,
    glide across the top (the ~2.2 s coast/delay), descend on the right. Verified
    `topY ∈ [0, h]` at 5 viewport sizes.
  - **Catch happens lower, near the ground.** `catchY` moved from `~0.26·h` to
    `min(0.55·h, groundY − 0.9·bodyH)` (`groundY = 0.92·h`); booster still settles with its
    hardpoints exactly on the arms (`finalTopY == catchTop`).
  - **Tower no longer runs floor-to-ceiling.** `_drawMechaTower` is now a finite lattice
    from the ground (`0.92·h`) up to just above the arms (`catchY − 0.5·bodyH`), with a
    capped top instead of extending the full height.
  - **Starship flaps repositioned.** Rewrote the `flap()` helper into a proper swept
    surface and split into a small forward pair up by the nose + a large aft pair at the
    base, with near-side flaps prominent and far-side hints for a true profile.
  - Retimed the arc (`T_LIFT/T_SEP/T_ASC/T_DESC/T_BURN/T_CATCH = .05/.30/.40/.62/.66/.90`),
    softened tilt (lean right on ascent, brake-left then straighten on descent), and faded
    the upper stage before ascent ends. `dur` stays 10 s.
  - Why: user reported the rocket vanished above the Contact section, the catch platform
    was too tall, and the Starship fins sat in the wrong spots.

## 2026-07-11 — Welcome shooting star after the intro
- `index.html`, hero (`ax-stars` canvas / `_frame`):
  - Added `_fireWelcomeStar()` (new one-shot state `this._welcomeStar`, init'd alongside
    `_meteors`/`_comets`) — a single sharp, bright meteor that streaks across the top of the
    hero on a steep down-left diagonal (~36–46°) once the loading screen finishes.
  - Triggered from `_runIntro`'s `finish()` (both the animated and instant/reduced-motion
    paths feed through `_fireWelcomeStar`, which itself no-ops under `prefers-reduced-motion`
    to match the ambient meteor/comet behavior).
  - Drawn in `_frame` right after the ambient comet block: bright warm-white core + soft gold
    glow + lit head, with both alpha and line/trail width scaled by remaining life so it
    **shrinks and fades out mid-flight** (burns up in the distance) rather than exiting past
    the viewport edge.
- Why: user asked for a one-time "sharp clean shooting star" across the top of the screen
  right after the loading screen, distinct from the existing ambient random meteors/comets;
  follow-up feedback asked for a steeper downward angle and for it to vanish in the distance
  instead of sliding off-screen — addressed via the angle/distance params in
  `_fireWelcomeStar` and the life-based shrink in the draw step. Verified visually with a
  headless-Chromium screenshot pass (Playwright) sampling frames ~2.9–3.9s after load,
  confirming fade-in → peak → shrink-and-fade-out fully inside the viewport.

## 2026-07-10 — Contact finale: realism pass + arms that clearly grab
- `index.html` finale (`_stepLaunch` + helpers):
  - **Starship** (`_drawStarship`) redrawn: sharp **pointed nose**, proper swept **forward
    canards** and larger **aft flaps** (near side solid, far side hinted for depth), heat-tile
    seams — replacing the old rounded nose + crude single triangles.
  - **Super Heavy** (`_drawSuperHeavy`) more realistic: grid fins are now **boxy lattice
    panels** (frame + grid + lit outer edge) and the base shows a **Raptor engine cluster**
    (centre + rings) instead of one nozzle.
  - **Longer hang time**: total `dur` 8.6→10 s and retimed so the off-screen **coast before
    the booster returns is ~2.4 s** (was ~0.9 s).
  - **Arms clearly grab it**: `_drawChopsticks` (both arms behind the booster) replaced with a
    single-arm `_drawArm` called twice — a dimmer **far arm behind** the booster and a
    brighter **near arm in front** — that reach out from the tower and clamp under the grid
    fins, with the contact flash on top.
- Why: user feedback — Starship needed canards + a pointy tip, both vehicles should look more
  realistic, the booster needed a bigger delay before descending, and the catch should read
  as a grab (one arm in front). Verified: `node --check` + mock-canvas run over the full 10 s
  timeline at 5 viewport sizes (no NaN/Inf, no exceptions; `_drawChopsticks` gone) and a
  timing trace confirming the ~2.4 s coast.

## 2026-07-10 — Contact finale: split launch (left) / catch (right) + thrust tilt
- `index.html`, Contact finale (`_stepLaunch`): re-staged so the launch and the catch hug
  opposite screen **edges** instead of sitting centred behind content — the Starship lifts
  off from a pad on the **left edge** (`launchX`), and the Super Heavy returns and is caught
  at the **right edge** (`catchX`/`towerX`, near `w − padX`). The booster's x teleports
  left→right during the off-screen coast.
- The booster now **tilts on its thrust** like the real vehicle: it pitches over downrange
  during ascent (grows with the burn) and comes in with a thrust-vectoring lean on the
  landing burn that **straightens to vertical exactly at the catch**. Flame, core glow, and
  the emitted exhaust particles are all fired along the booster's tilted axis (engine world
  position + thrust direction derived from `tilt`), so the plume trails correctly off-angle.
- Why: user asked for launch-on-left / catch-on-right, a real-life thrust tilt, and to keep
  the animation on the edges rather than hidden behind the content. Verified with
  `node --check` + a mock-canvas run over the full 8.6 s timeline at 5 viewport sizes (no
  NaN/Inf, no exceptions) and a choreography trace confirming launchX≈left margin, the
  catch settling at `catchX`/`catchY`, and tilt returning to 0° at the catch.

## 2026-07-10 — Contact finale: full launch→catch mission + cleaner chopsticks
- `index.html`, Contact finale (`_stepLaunch`): expanded the single booster catch into a
  full **mission sequence** (~8.6 s): the stacked **Starship** lifts off from the pad and
  climbs (big main-engine plume + section rumble) → the **upper stage separates** near the
  top with a hot-staging flash and streaks/fades to space → brief coast → the **Super Heavy
  booster returns** from above, relights a decelerating **landing burn**, deploys its grid
  fins, and is **caught** by the chopstick arms, which flash on contact and hold it.
- Refactored the one long method into helpers: `_drawMechaTower`, `_drawChopsticks`,
  `_drawStarship`, `_drawSuperHeavy`. Chopstick arms are now proper **lattice beams**
  (chords + diagonal web + pincer tips) that funnel open then clamp level — the requested
  "cleaner/better" catch. Grid fins now animate stowed→deployed on the return.
- Why: user asked to (1) add a Starship take-off before the catch and (2) improve the catch
  animation. Verified with `node --check` + a mock-canvas run over the full 8.6 s timeline
  at 5 viewport sizes (no NaN/Inf, no exceptions) and a numeric choreography trace
  confirming the booster settles with its hardpoints exactly on the arms. Browser check
  still recommended (`python -m http.server` from `github-export/`).

## 2026-07-10 — Contact finale: rocket launch → Super Heavy booster catch
- `index.html`, Contact section (`#ax-contact`): replaced the old rocket-**launch** finale
  with a SpaceX **Super Heavy booster catch** ("Mechazilla" chopsticks).
- Removed the SVG launch ship (`#ax-launch-ship`) and its constructor/reset references;
  the finale is now drawn entirely on the existing `#ax-launch-cv` canvas.
- Rewrote `_stepLaunch()`: a stainless-steel Super Heavy (stylized to the gold-on-space
  palette — vented hot-stage ring, deployed grid fins + catch hardpoints, weld rings,
  raceway, engine skirt) descends tail-first from the top, fires a decelerating landing
  burn (bright plume + core glow + section rumble), and is caught by two gold lattice
  chopstick arms that funnel open then clamp level under the grid fins. Tower is a faint
  gold lattice. Booster stays held in the arms as the resting frame (re-arms on scroll-out).
- Why: user asked to swap the contact rocket for a Starship Super Heavy and animate the
  booster being caught by the chopsticks. Design/proportions researched from Wikipedia
  (Super Heavy: ~8:1 stainless cylinder, grid fins + hardpoints on the interstage, hot-stage
  ring, catch by the tower arms). Verified via `node --check` on the extracted method plus a
  mock-canvas run across the full 6.2 s timeline at 5 viewport sizes (no runtime errors, no
  NaN geometry). Browser-based visual check still recommended (`python -m http.server`).

## 2026-07-10 — Intro constellation: belt line + removed duplicate star
- `index.html`, the Orion constellation SVG (appears 3× — intro overlay `#ax-intro-const`
  ~line 61, hero background `#ax-hero-const` ~line 148, and the decorative section
  background ~line 683): the two belt stars at `(47,112)` (gold) and `(112,121)` were
  previously only linked by a detour up through two near-coincident points `(91,91)` and
  `(99,90)` (8 units apart — the closest pair in the whole figure), so no line ever swept
  directly across the belt during the star-by-star intro draw-in.
- Removed the duplicate point at `(99,90)` (both its `<circle>` and the `91,91→99,90` /
  `99,90→112,121` lines), keeping `(91,91)` as the single bump star, rewired as a direct
  `91,91→112,121` line.
- Added a new direct `47,112→112,121` line (the actual belt), inserted right after the
  `32,93→47,112` line so it's the first thing drawn once the pen reaches the belt — the belt
  now visibly lights up in sequence rather than being skipped.
- Why: user reported the top-to-bottom line reveal never drew through the belt, and that a
  duplicate star near the head should be removed. Verified by rendering the SVG standalone
  with numbered points (Playwright screenshot) to identify the exact coordinates before
  editing, then re-screenshotted the live intro to confirm the fix.

## 2026-07-10 — Bigger, more visible top nav
- `index.html` `#ax-topbar` (~line 118): taller bar (padding 14px→22px vert,
  18px→22px horiz min), stronger backdrop (blur 12→14px, darker gradient,
  brighter bottom border) so it reads more clearly against busy hero content.
- Logo link "O·P" (~line 119): font-size 22px → 28px.
- `#ax-nav` links (~lines 121-126): font-size 10px (fixed) →
  `clamp(12px,1.1vw,14px)`, weight 500 → 600, letter-spacing .22em → .18em
  (tighter tracking reads better at the larger size), link padding 6px → 8px,
  nav item gap `clamp(14px,2.4vw,34px)` → `clamp(20px,3vw,42px)`.
- Why: user asked for the top nav to be bigger, clearer, and more visible.

## 2026-07-10 — Swap featured "This Very Website" with archived NFC Business Cards
- `index.html` Projects section, featured W03 slot (~line 527): now shows
  "NFC Business Cards" (was "This Very Website"), with its own image-slot
  (`images/nfc-cards.jpg`) and a "View on LinkedIn" link.
- `index.html` `archiveItems` array (~line 1659): the archive slot that held
  NFC Business Cards now holds "This Very Website", using a new image
  `images/website-hero.png` (copied in from the project root's
  `Website Hero .png`).
- Why: user asked to swap the two projects' positions — NFC cards promoted
  to the featured three, the site itself moved into the collapsed archive —
  and to give the website project a real hero image instead of an empty
  drop-placeholder.

## 2026-07-10 — Skills section defaults to Agentic AI + expanded tool list
- `index.html` `state = { skillActive: ... }` (~line 803): changed default
  `skillActive` from `0` to `6` so the Skills section opens on the "Agentic AI"
  group instead of "Languages" when the page loads.
- `index.html` skills `groups` array (~line 1619): expanded the "Agentic AI" group
  from `['Claude Code', 'Claude', 'Claude Cowork', 'Codex', 'Rovo Dev', 'Agentic
  Workflows']` to add `'Gemini'`, `'Nano Banana'`, `'MCP Servers'`, `'Skill
  Development'`, `'Multi-Agent Orchestration'` — now 11 items.
- Why: user wants the résumé to lead with agentic-AI/tooling experience since
  that's most relevant to recruiters right now.

## 2026-07-10 — Fixed image-slot thumbnails rendering tiny/corner-anchored
- `index.html` main `<style>` block (~line 47-51): added `#slot-analyzer, #slot-brainbench,
  #slot-website{width:100% !important;height:100% !important;display:block !important}`.
- Root cause: the dc-runtime's `x-import` extraction (`support.js`) only forwards
  `position/width/height/...` from an inline `style=` attribute to a wrapper `<div>`, never
  to the `<image-slot>` custom element itself — so the slot fell back to its shadow-DOM
  default of 240×160px and rendered small in the top-left corner of its frame instead of
  filling it. Support.js is generated/do-not-edit, so the fix targets the slot IDs directly
  with page-level CSS (an ID selector beats the component's internal `:host` default).
- Why: user reported the LLM Network Analyzer thumbnail sitting small in the corner instead
  of filling its card.

## 2026-07-10 — Set BrainBench (LLM tester) thumbnail
- Added `images/brainbench-slide1.png` — rendered from page 1 of the user-supplied
  `BrainBench_Poster_New.pptx (1).pdf` (the FIT Student Design Showcase poster for
  BrainBench, the LLM evaluation project) via PyMuPDF, downscaled to 3456×3024.
- `index.html` ~line 510: gave the `slot-brainbench` `<image-slot>` a
  `src="images/brainbench-slide1.png"` + `fit="cover"` fallback so the poster shows as the
  thumbnail without a manual drop.
- Why: user wanted the first slide of the poster PDF as the BrainBench project thumbnail.

## 2026-07-10 — Set LLM Network Analyzer thumbnail
- Added `images/network-analyzer.png` (user-supplied AI/network-security graphic).
- `index.html` ~line 499: gave the `slot-analyzer` `<image-slot>` (in the "Selected works" →
  W·01 LLM Network Analyzer card) a `src="images/network-analyzer.png"` + `fit="cover"`
  fallback, so the thumbnail shows without needing a manual drag-and-drop.
- Why: user wanted a real thumbnail there instead of the empty drop placeholder.

## 2026-07-10 — Swapped About Me photo
- Replaced `images/profile.jpg` (used at [index.html:248](Home%20page%20animation%20redesign/github-export/index.html#L248)
  in the ABOUT section) with a new headshot supplied by the user
  (`Gemini_Generated_Image_mh1yttmh1yttmh1y.jpg`).
- Why: user wanted a different About Me photo. No markup/anchor changes — same filename.

## 2026-07-10 — Thicker outline on Work Experience number glyphs
- `index.html` lines ~292, 306, 319: doubled `-webkit-text-stroke` from `1px` to `2px` on the
  large background "01"/"02"/"03" numerals in the pinned Work Experience section.
- Then recolored that stroke from cream `rgba(236,231,219,.07)` to gold
  `rgba(211,176,120,.1)`, matching the roman-numeral outlines (I, II, III...) used in every
  other section.
- Why: user asked for a bolder outline, then for it to be gold instead of silver/cream.

## 2026-07-09 — Added project documentation system
- Created `CLAUDE.md` (repo root), `docs/SITE-GUIDE.md`, and this `docs/CHANGELOG.md`.
- Purpose: a "live document" system so future sessions can orient fast, find content by
  stable anchors, and record changes. No changes to the site itself.

<!-- Add new entries above this line -->
