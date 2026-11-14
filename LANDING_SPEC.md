# LANDING_SPEC.md — v5.2 (supersedes v1–v5.1)

> Read this file at the start of EVERY task. If a task conflicts with it, stop and ask.
> **Sections 19, 20 and 21 (amendments) OVERRIDE any conflicting text above them. Later sections win.**
> Workspace components may be edited where a task says so (sections 11–14 are approved for change).
> Do not drift. If you substitute anything in this spec, say so in your report. `window.__story.checks()` (section 18) must pass.

**Owner decisions so far**
- KEEP (approved): the Story beats and the Story → Workspace morph ("decent"), the dissolve/cloud, the warm map, the halos, the header, the green CTA.
- REMOVE: the "DELHI-NCR AUTONOMOUS MESH | 25 HOSPITALS | FEFO ENGINE ARMED" pill, the "O-NEG APHERESIS" pill, the "Corridors" toggle, the "3D Pitch" toggle.
- CHANGE: hero feels white and dull; motion feels childish; red/amber/green shades; routes look fake; clicking a hospital must zoom and show its optimal routes; the hospital detail dashboard is replaced entirely.

---

## 1. Concept

Scroll is the 120-hour clock. A garnet platelet ages, cracks and dissolves into drifting discs. 25 become hospital blood banks, fly to their real locations and land as the workspace's markers. Rescue routes first appear as rough "intent" arcs and then settle onto the real road network as the solver converges. The camera dives, the full-bleed map morphs into the workspace card, and every hospital can be opened to see its optimal routes.

---

## 2. Direction, palette, layout

- **Light-first, warm, editorial.** One ink color, hairlines, mono technical labels, large type contrast. Color appears only where it MEANS something.
- **Tokens** (CSS variables + `src/story/palette.ts`; sample `paper` and `ink` from the app, tune the rest by eye, never below 4.5:1 for text):

| Token | Value (starting point) | Use |
|---|---|---|
| `paper` | ≈ `#F4EEE3` | page and Story background |
| `paper-raised` | ≈ `#FAF7F0` | sheet, list cards, filter bar |
| `ink` | ≈ `#141B2D` | text; hairlines at ink/10 and ink/18 |
| `red-50 / 100 / 500 / 600 / 700` | `#FBEDEE / #F6D5D9 / #DC3E52 / #C9263B / #9F1D2F` | shortage |
| `amber-50 / 500 / 600 / 700` | `#FDF3E3 / #E08A1E / #BF6F10 / #9A560A` | at-risk (<36h expiry) |
| `green-50 / 500 / 600 / 700` | `#EAF6F1 / #1F9A74 / #17805F / #0F6149` | solution, routes, primary buttons, OK |

- **Meaning:** red = shortage (nodes, halos, critical text). Amber = at-risk. Green = the solution (routes, primary buttons, OK states). Nothing else is colored. Text on paper uses the 700 shades, never 500.
- **Markers:** fill = the 600 shade, 2px white ring, 1px ink/12 outer ring, shadow `0 1px 2px ink/25%`. Halos use the 500 shade at ≤ 0.18 alpha.
- **Fonts:** the workspace display sans (600/700, tracking −0.03em) + the existing mono (tabular numerals).
- **Layout:** left column x 8vw–40vw (text), right stage x 44vw–100vw. No cards behind text.
- **Header:** logo top-left at its workspace position. "Skip to map →" is a plain mono text link with an arrow (no pill).

---

## 3. Motion language (this is what removes the "childish" feel)

- **Easing tokens:** `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-inout: cubic-bezier(0.65, 0, 0.35, 1)`. **No** bounce, overshoot, elastic, spring or scale-pops anywhere.
- **Durations:** micro 160–240 ms; UI 320–480 ms; scene 700–1200 ms; camera 1000–1400 ms.
- **Hero idle:** the light moves, not the object. Platelet rotation amplitude ≤ 3.5° with period ≥ 14 s, vertical float ≤ 4 px, plus a slow specular sweep across the surface. No spinning.
- **Cloud:** drift ≤ 12 px/s, tumble ≤ 0.12 rad/s, parallax by depth (far slower, near faster). No uniform random jitter.
- **Choreography:** staggers are distance-based. At most 3 things accelerate at the same time. Entrances ease out; exits are faster than entrances.
- **Headlines:** line-masked reveal. Each line goes from `clip-path: inset(0 0 100% 0)` + `translateY(0.35em)` to `inset(0)` + `0`, 700 ms ease-out, 70 ms stagger; exit 300 ms.
- **Camera and routes:** `ease-inout`, long tails, no linear moves.
- `prefers-reduced-motion`: replace every move with a 200 ms cross-fade.

---

## 4. Map style, labels, markers (Story and workspace)

- Keep the warm "clinical atlas" and the halos.
- **Veil:** paper veil opacity 0.55 → 0 over progress 0 → 0.30. No per-frame `setPaintProperty`.
- **Place-name labels:** 11px, ink/45, letter-spaced caps; below markers and pills in z-order. A label that is overlapped by a pill or marker is hidden (checked on zoom-end/resize, not per frame), so "NEW DELHI" is never split by a pill.
- **Pills:** greedy non-overlapping placement (anchors bottom/top/right/left, red first); hidden pills appear on hover/focus. Pills are clickable (hit area ≥ 32 px high). Marker hit area ≥ 28 px.
- Map attribution includes "Routes © OpenStreetMap contributors · OSRM" (section 12).

---

## 5. Architecture and the loop

- **MapStage** (MapLibre + deck.gl `MapboxOverlay`, interleaved) persists above the router; created once. deck.gl layers: halos, routes (`PathLayer` + `TripsLayer`).
- **StoryScene:** one transparent R3F canvas (px-calibrated perspective camera), lazy-loaded: hero platelet, `cloud` and `nodes` InstancedMeshes, `scene.fog` in paper color.
- **One loop:** `gsap.ticker` drives `lenis.raf` and one `frame(dt)`; damped progress `p += (target − p) * (1 − exp(−dt * 7))`; update order: map camera → Three → DOM; no React state per frame; transform/opacity/clip-path only. 800vh scroll.
- **Camera:** pitch 40°, bearing −12°; push 0 → 0.28; drift 0.28 → 0.54 easing to rest; FROZEN 0.54 → 0.72; free from 0.72.

---

## 6. Hero

**Remove:** the "DELHI-NCR AUTONOMOUS MESH | 25 HOSPITALS | FEFO ENGINE ARMED" pill, the "O-NEG APHERESIS" pill and its leader, and the "0% SCROLLED" pill. The hero keeps exactly ONE pill: the dark "Explore Live Mesh →" CTA.

**Annotations (text-only, no pill):** `22.0°C AGITATED` and `REMAINING 120:00:00`, mono 11px, ink/70, each with a hairline leader that ends in a 4px contact dot ON the platelet silhouette (anchored to a 3D rim point, projected every frame). The countdown is NOT real-time; it is static at `120:00:00` and hands off to the hours clock at 0.12. Annotations are visible 0–0.12 and never overlap the platelet.

**Red light leak (decision: do it, restrained):**
- One fixed layer: `radial-gradient(ellipse 60vw 90vh at -8vw 62vh, rgba(201,38,59,0.28) 0%, rgba(201,38,59,0.11) 38%, rgba(201,38,59,0) 72%)`, `mix-blend-mode: multiply`, plus ~4% SVG-noise grain to prevent banding.
- Remove the current white wash on the left of the hero.
- Opacity is bound to the clock: 1 at progress 0 → 0 at 0.31 (the red drains as the platelet ages).
- Text over it keeps ink contrast ≥ 7:1. Provide `?leak=0` to disable it for comparison.

**Platelet material (garnet, not candy):** core `#B8213A`, shade `#7A1127`, rim `#E0505F`. `roughness ≈ 0.42`, `clearcoat ≤ 0.2`. Soft, broad softbox reflections; NO hard white specular streaks. Fake subsurface: a fresnel inner glow (lighter toward grazing angles), a deeper core, and a faint translucent warmth. Visible granule bumpMap. Contact shadow beneath plus a faint red-tinted caustic on the map. Same lens geometry as before (section 8). Aging drains toward a warm rose-grey (`#C9A9AD`), never concrete grey.

**Headlines:** explicit line arrays from `copy.ts`, masked reveals (section 3). "Skip to map →" plain text link. SCROLL cue never touches text.

---

## 7. Beats

| Progress | Beat | Notes |
|---|---|---|
| 0.00–0.12 | Hero | Platelet, annotations, red leak at full strength. |
| 0.12–0.28 | Aging | Hours clock 0 → 120. Leak drains. |
| 0.28–0.31 | Cracks | |
| 0.31–0.44 | Dissolve | Approved. Keep. |
| 0.44–0.54 | Drift | Cloud flows; nodes grow. |
| 0.54–0.72 | Rescue | Nodes fly, land. Intent arcs draw (section 9). |
| 0.72–0.88 | Dive | Camera → workspace camera. Arcs settle onto roads. Labels fade in after 0.78. |
| 0.88–0.985 | Settle | "The mesh, live." + green CTA. One flow pass per route. |
| ≥ 0.985 | Commit | Approved morph (section 10). |

---

## 8. Dissolve and cloud (approved; unchanged)

Lens geometry: `LatheGeometry`, `r(t) = R*|cos t|^(2/n)`, `y(t) = T*sign(sin t)*|sin t|^(2/n)`, R = 1, T = 0.22, n = 2.4, `t` from −PI/2 to PI/2. Cracks (Voronoi, deep rose, 45%), analytic directional dissolve (`leave(p)` identical in JS and GLSL) with a rose edge band, `uDissolve = remap(progress, 0.31, 0.44)`. Cloud 160 desktop / 90 mobile, face-biased slow tumble, curl-noise flow, fog depth, scale to 0 at the text column edge. 25 nodes at 1.6–2x size. Rescue flights per v4 section 8: nodes face the camera from the start of flight, wave-like landing stagger, one 450 ms ripple per landing, workspace marker colors only, DOM marker crossfade at landing (≤ 1 px, ΔE ≤ 6).

---

## 9. Routes in the Story: "more accurate as you scroll"

The solver converges. Routes begin as rough intent and settle onto the real roads.

- **Route set:** the same solver transfers the workspace shows by default (≤ 8). Each draws only after BOTH endpoint nodes have landed.
- **Stage A, intent (0.62–0.70):** a draw-on quadratic arc (perpendicular lift = 18% of length), 3 px `green-500` at 70%, with a soft casing glow (8 px, 18% alpha).
- **Stage B, settle (0.70–0.86):** morph arc → road geometry. Resample both to 160 points by normalized arc-length; `P(s) = lerp(arc(s), road(s), e(a))`, `a = remap(progress, 0.70, 0.86)`, `e = easeInOutCubic`. Width 3 → 2.4 px, casing alpha 0.18 → 0.08 (the line "sharpens" as it becomes certain).
- **Stage C, certain (≥ 0.86):** the final road-snapped path. One flow pulse per route (a `TripsLayer` head, 2.2 s), then rest.
- No stray dots, "packet" rings, dangling starts, or segments that begin away from a hospital. No red or orange route lines, ever (routes are green).
- Route data is pre-computed (section 12). The Story never calls a routing API.

---

## 10. Story → Workspace morph (approved; unchanged)

1.3 s GSAP timeline per v4 section 9: text fades; map container clip-path animates to the measured workspace card rect with `map.setPadding` compensation; header, panel and filter bar reveal; interrupt-safe (reverse from current time); `exitToStory()` is the exact reverse. Markers are never recreated.

---

## 11. Workspace shell, list, filter bar

- Page background `paper`. Map card radius 28, 1px ink/8 border, no heavy shadow.
- **Filter bar (top-left of the map):** `All NCR (25) · Shortages · <36h Risk`, segmented control, `paper-raised`. **Remove the "Corridors" and "3D Pitch" toggles entirely**, including their code, state, and the 3D pitch/buildings path. Routes are no longer a user toggle: see section 13.
- **Map padding:** the map's clear area is the card minus the list panel (and minus the sheet when open). Fit hospital bounds into the CLEAR area so no hospital ever sits under the list scrim.
- **List panel:**
  - Width 400 px (360 at < 1400 px).
  - Fix the hard-edged scrim at its right side and the off-color strip along its bottom (replace with a soft 48 px fade into `paper-raised`).
  - Add a header line: `25 hospitals · by urgency` (mono 11px).
  - The selected row uses a 3 px left accent bar in its state color and a slightly raised background. Remove the thick black outline.
  - Hover on a row highlights its marker, and the reverse.
  - Show a subtle scroll affordance.
- The dark "Today's Hospital Blood Disruption" banner is gone. That is acceptable; the list header carries the context.
- Pills and place labels per section 4.

---

## 12. Routes: data and rendering (shared by Story and workspace)

**Data (build-time, never at runtime):**
- `scripts/build-routes.mjs`, run locally with network access.
- Input: hospitals (code, lng, lat) from the SAME source as the workspace, and the solver transfers.
- Pair set: every solver pair, plus each hospital's 6 nearest neighbors by haversine distance. Undirected and unique; the reverse direction reuses the same geometry reversed.
- Provider: OSRM public demo, `https://router.project-osrm.org/route/v1/driving/{lng,lat};{lng,lat}?overview=full&geometries=polyline6&alternatives=false&steps=false`.
- **Etiquette (required by the demo server):** at most 1 request per second (use ≥ 1.1 s spacing), a descriptive `User-Agent` identifying this app with an owner contact (ask the owner to supply one), retry with backoff, cache and resume. Show OSM/OSRM attribution.
- Output `src/data/routes.json`: `{ meta: { source, profile: "driving", generatedAt, note: "free-flow estimate, no live traffic" }, routes: { "AIM|MAX": { d: meters, t: seconds, p: "<polyline6>" } } }`.
- Validate: first/last vertex within 150 m of each hospital coordinate. If a marker is more than 15 m from its route's endpoint, draw a short hairline connector so the route visibly meets the marker.

**Rendering:**
- `PathLayer` casing in `paper` (4.5 px) beneath a `green-600` core (2.5 px), rounded caps/joins.
- Selected hospital: best route solid with a `TripsLayer` pulse (direction supplier → shortage, 2.4 s per pass, eased); alternatives dashed (2 px, green at 55%, `PathStyleExtension`).
- ETA label at each route midpoint for the selected hospital's routes only: mono 11 px, `12 min · 4.8 km`, labeled "est." in the sheet. Never imply live traffic.
- Missing pair: fall back to an arc with no ETA, log it, and report it in `checks()`.

---

## 13. Hospital selection

- **Triggers:** click a dot, a pill, or a list row; keyboard (↑/↓ moves between hospitals). Hash updates to `#/workspace/map/<CODE>` so Back closes the selection and links are shareable.
- **Camera:** save the current camera, then `fitBounds` of the selected hospital ∪ its route partners. Padding: `{ left: listW + 32, right: sheetW + 32, top: 88, bottom: 72 }`, duration 1100 ms, `ease-inout`, `maxZoom 13.5`. When the fit allows, end at least 0.6 zoom levels in from the overview. A lone hospital with no partners flies to zoom ~12.5.
- **Optimal routes** = the solver's transfers involving this hospital. If the solver has none, show the 3 nearest counterparties by ETA and label them "candidates", never "optimal".
- **Visual state:** unrelated markers dim to 35% and lose pills; related markers keep pills; the selected marker gets a 2 px ink ring and a stronger halo; place labels fade to 30%; unrelated routes are hidden.
- **Close:** Esc, the close control, or a click on empty map. Restore the saved camera (1000 ms) and the default route set.
- During any selection change the map stays interactive.

---

## 14. Hospital sheet (full redesign)

**Pattern:** a standard (non-modal) side sheet. It coexists with the map, which stays interactive and re-pads so the selection stays in the clear area. On ≤ 700 px it becomes a bottom sheet with snap points 28% / 62% / 92% and a hairline drag handle.

**Frame:** anchored to the right of the map card, width 392 px (420 at ≥ 1600 px), `paper-raised`, 1px ink/10 left hairline, follows the card's corner radius, **no drop shadow**, no dark header, no gradient. Sections are separated by 1px hairlines with 24 px padding.

**Anti-"AI" rules:** no bordered tinted tiles, no pill badges, no icon-in-circle rows, no equal-weight card grids, no centered text, no emoji. Hierarchy comes from type scale, whitespace, hairlines and numerals. Color only where abnormal.

**Content (top to bottom; use only fields that exist in the data):**
1. **Header:** mono `SFD` (ink/60) left; `ESC` as a small mono text button right. Hospital name in the display sans (24/28, 600, −0.02em). Sub line: `South Delhi · Tertiary trauma centre` (ink/60). Status: a 6 px dot + `Critical shortage` in red-700 (text, no pill).
2. **Balance:** mono label `NET BALANCE`; the numeral `−36u` at 56/56, 600, tabular, red-700 (amber-700 for at-risk, green-700 if positive). One human sentence beneath it: "49 units on hand. 25 expire within 36 hours." If a need figure can be derived from existing fields, add a 2 px ruler: solid segment = usable, hatched segment = expiring, an end tick labeled with the need. Otherwise omit the ruler. Never invent data.
3. **Blood groups:** mono heading. Rows sorted by severity; the 4 most critical shown, then a text button "Show all 8". Row: group label (mono 13/600), units (tabular), a 2 px hairline bar (red-600 fill when critical, ink/50 otherwise; never green), and a mono status word only when not OK ("critical", "low"). No boxes.
4. **Optimal routes:** mono heading + count. Rows: `MAX · Max Saket` / `24 min · 11.2 km · est.` / `+12u` at the right. The first row is selected by default with a 2 px green left bar and the word "Best" in mono (no pill). Hover highlights the route on the map (and the reverse); click focuses that route (camera fit). Candidates are labeled "Candidates".
5. **Cold chain:** one quiet mono line above the footer: `Cold chain 22.0°C · agitated · OK` with a 6 px green dot.
6. **Footer (sticky, hairline above):** one full-width green-600 button using the existing dispatch handler. Label: `Dispatch 12u from MAX · 24 min` (fix the double "+" typo). On success it becomes `Dispatched` in mono and the best route's pulse speeds up once.

**Motion:** the sheet enters with `translateX(24px)` + fade, 420 ms ease-out; sections stagger by 50 ms (opacity + `translateY(8px)`). Closing is 260 ms. The map re-pad runs with the sheet.
**A11y:** focus moves to the heading on open and returns to the trigger on close; `aria-labelledby`; Esc closes; touch targets ≥ 44 px on mobile; reduced-motion = cross-fade.

---

## 15. UI, type, copy

- Headlines: `clamp(2rem, 4.2vw, 4.5rem)`, tracking −0.03em, explicit line arrays, left column; mobile may use `text-wrap: balance`.
- Copy lines (unchanged): hero "A platelet lives" / "120 hours."; aging "Every hour, it gets" / "harder to use."; dissolve "25 hospitals." / "One clock."; drift "The blood exists." / "It's in the" / "wrong building."; rescue "Plexus moves it" / "before it expires."; dive "The mesh, live." Supporting lines unchanged.
- Clock: mono, no card, bottom-right of the stage, 1px bar; gone by 0.34.
- No `[COPY TODO]` anywhere.

---

## 16. NEVER DO

- No hero pills except the one dark CTA. No "0% scrolled" pill. No tinted bordered tiles, pill badges or dark-header cards in the sheet.
- No Corridors or 3D toggles. No routes that cut across blocks or rivers. No straight "spoke" lines in the workspace.
- No red or orange route lines. No stray ring/"packet" dots on routes. No dangling route starts.
- No hard white specular streaks on the platelet. No bounce, overshoot, spring, elastic or scale-pops. No spinning platelet.
- No runtime routing API calls. No live-traffic claims. ETAs are always "est.".
- No invented data in the sheet. No fields shown that the data does not have.
- No cards behind text. No dark/black page background. No pill overlaps. No colors outside the palette.
- No per-frame `setPaintProperty`, React state per frame, or per-frame layout reads. No marker re-creation during the morph. No `Math.random()` at render time.
- No dev UI without `?dev=1`.

---

## 17. Performance and accessibility

- Plugged in, Chrome Energy Saver off: p95 frame ≤ 16.7 ms, no frame > 50 ms, during scroll, the morph, the selection camera move, and the sheet open/close.
- Text contrast ≥ 4.5:1 everywhere (≥ 7:1 over the red leak). Focus rings visible. `prefers-reduced-motion` honored. Marker and pill hit areas per section 4.

---

## 18. Definition of done (every task)

1. No new console errors or warnings. "map created" logs once.
2. Screenshots at the requested progress values or UI states, `?dev=1`, panels collapsed, 1440x900 and 390x844.
3. **`window.__story.checks()`** returns JSON; every field present at this stage passes:
   - `hero.pillCount = 1`, `hero.removedPills = true`, `hero.leakOpacityAt0 > 0`, `hero.leakOpacityAt031 = 0`
   - `palette.offPaletteColors = []`, `contrast.minTextRatio ≥ 4.5`
   - `motion.maxIdleRotationDeg ≤ 3.5`, `motion.easingsOutsideTokens = 0`
   - `routes.count`, `routes.missing = []`, `routes.snapped = true`, `routes.endpointOffsetMaxM ≤ 150`, `routes.redOrOrange = 0`
   - `story.routeMorphMonotonic = true` (accuracy only increases with progress)
   - `workspace.toggles = 0` (no Corridors or 3D), `workspace.listScrimHardEdge = false`
   - `selection.allPartnersInClearRect = true`, `selection.zoomedInVsOverview` (report), `selection.restoreCameraOnClose = true`
   - `sheet.widthPx ≤ 420`, `sheet.boxedTiles = 0`, `sheet.pillBadges = 0`, `sheet.dropShadow = false`, `sheet.invalidFieldsShown = []`
   - `pills.overlapCount = 0`, `labels.splitByPill = 0`
   - `mapCreatedCount = 1`, `frame.p95Ms`, `frame.maxMs`
4. YOU critique the screenshots against sections 2, 3, 6, 14 and 16 before reporting, and fix what's wrong. Do not claim something looks good unless the screenshots show it.
5. Report: what changed, files touched, check results, anything skipped or substituted.


---

## 19. v5.1 amendments (OVERRIDE anything above that conflicts)

### 19.1 Status check
The latest build is MISSING the hero work from sections 2 and 6: the "DELHI-NCR AUTONOMOUS MESH | 25 HOSPITALS | FEFO ENGINE ARMED" pill, the "O-NEG APHERESIS" pill, the "0% SCROLLED" pill, pill-style annotations, the ticking countdown (it still shows 119:59:38), the crimson platelet with hard white streaks, the new red/amber/green shades, and the red light leak. All of it is REQUIRED. `checks()` must prove it. Before editing, search the repo for those strings and list every file where they appear.

### 19.2 Hero additions
- **Intro slide:** on first load the platelet slides in from the right: `translateX(+14vw → 0)` + opacity 0 → 1, 1400 ms, `cubic-bezier(0.16, 1, 0.3, 1)`. Annotations fade in 500 ms after it lands; headline lines reveal in parallel. It never affects the scroll animation.
- **Red light leak:** exactly as section 6, opacity driven ONLY by progress (1 at 0 → 0 at 0.31) through a slow `smootherstep`, so it fades gently while the user scrolls slowly. Nothing else about the scroll animation changes.

### 19.3 Sound (new)
- Web Audio API. Every sound is synthesized (no audio files, no licensing). One `AudioEngine` module, master gain ≤ 0.35, a gentle `DynamicsCompressor` as limiter, lowpass at 8 kHz.
- **Default OFF.** A text toggle `SOUND OFF` / `SOUND ON` (mono 12px, same style as "Skip to map →", placed to its left) in the header. Preference stored in `localStorage` (`plexus.sound`). Browsers block audio until a click, key press or touch (wheel scrolling does not count), so the engine starts only from the toggle or a later gesture. Never autoplay.
- **Sounds:**
  - Scroll bed: filtered noise ("air"). Gain and lowpass cutoff (400–1800 Hz) follow scroll velocity; silent at rest. 120 ms attack, 600 ms release, gain ≤ 0.18.
  - Cracks (0.28–0.31): quiet glass ticks (bandpassed noise 2–5 kHz, 8–20 ms) each time a new batch of crack segments appears, max 12 per second.
  - Dissolve (0.31–0.44): a soft granular shimmer (tiny bandpassed grains 3–6 kHz, random pan), density follows `uDissolve` speed, gone by 0.46.
  - Landings (0.54–0.72): one soft pluck per landed node (sine + triangle, ~150 ms decay), pitch from a major-pentatonic scale by landing order, pan by node x, max 6 at once.
  - Route settle (0.70–0.86): a faint rising pad (two detuned sines + lowpass), gain ≤ 0.08, following the morph progress.
  - Morph (1.3 s): a low thump at t = 0 (60 Hz sine, 250 ms) plus a filtered-noise whoosh peaking at t = 0.5 s; reversed on exit.
  - UI: tiny tick on sheet open, a lower tick on close, a pentatonic pluck on selection by hospital index.
- Event sounds (cracks, landings, shimmer) fire only on FORWARD progress, never when scrubbing backward. Suspend the `AudioContext` when the tab is hidden. Honor `prefers-reduced-motion` by keeping sound off until the user toggles it on.

### 19.4 Routes (overrides sections 9 and 12)
- **Exactly ONE route type exists on screen:** road-snapped dark green (green-600 core, paper casing). The light-green/direct/arc routes are REMOVED everywhere: no arc fallback, no "intent" arcs on screen at progress ≥ 0.86, and none in the workspace on any path (first load, deep link, reload, selection).
- A pair missing from `routes.json` is NOT drawn. Extend `build-routes.mjs` to cover it and report. `routes.missing` must be `[]`.
- **Blur fix:** one geometry per route per frame (no arc + road cross-fade overlay), no glow, no animated casing alpha, line widths snapped to 0.5 px steps, MSAA enabled on the map canvas (use the option that the installed MapLibre version supports), deck.gl `useDevicePixels: true` with the same DPR as the map. Diagnose by capturing frames at 0.74, 0.78, 0.82, 0.86 and report which cause (glow, double draw, DPR) produced the blur. Add a flag `ROUTE_MORPH` (default true). If mid-morph frames still look soft, set it false so roads simply draw on, crisp.
- **Reload bug:** on `#/workspace/map` and `#/workspace/map/<CODE>`, road routes must render on first paint. Import `routes.json` statically (or re-render the layer when it resolves). The default route layer must not depend on any Story state.
- **Refinement:**
  - Default view shows only the top 6 solver transfers by urgency.
  - Width by zoom: 1.4 px at zoom ≤ 10, 2.2 px at 12, 3 px at ≥ 13.5 (interpolated). Paper casing is +2 px at 90% opacity. Round joins and caps.
  - Remove kinks with Douglas–Peucker at 3 m tolerance and no further smoothing (the line must stay on the road).
  - Where routes share a road segment, draw the non-primary at 55% opacity.
  - Markers always draw above routes.

### 19.5 Selection and camera (overrides section 13)
- **Centering:** after selecting a hospital, its marker sits at the center of the CLEAR rect (the visible map area not covered by the list panel, filter bar, header or sheet) within ±12 px. Every vertex of every route of that hospital is inside the clear rect with ≥ 40 px margin.
- **How:** compute the clear rect from the real DOM rects at call time, never from constants. Wait for the sheet's final measured width. Build bounds SYMMETRICALLY around the hospital (mirror the farthest route vertex on each axis) so the hospital lands in the center and every route still fits, then `fitBounds`. Apply the same on `#/workspace/map/<CODE>` after first paint and on window resize.
- The map and the sheet show the SAME routes. The map must not show routes the sheet does not list.
- **Closing:**
  - The **× button** closes only the sheet. The hospital stays selected: the camera re-centers in the wider clear rect (600 ms), routes stay, other markers stay dimmed, the hash keeps `/<CODE>`.
  - **Esc** fully unselects: the sheet closes, the saved camera is restored (1000 ms), dimming and routes return to the default set. If the sheet is already closed and a hospital is still selected, Esc also unselects.
  - A click on empty map also unselects. Clicking the selected hospital again re-opens the sheet. Clicking another hospital switches the selection directly (no restore in between).
- **Filters** (`All NCR`, `Shortages`, `<36h Risk`) affect the list, markers, halos and default routes consistently. Non-matching markers dim to 25% and lose pills; they are not removed. (Currently the list filters but the map does not.)

### 19.6 Sheet compaction (overrides the sizes in section 14)
- KEEP the existing outer box size. Make the contents compact: section padding 24 → 16; name 20/24; balance numeral 36/36; sentence 13; blood-group rows ~34 px each; route rows ~48 px; footer button 44 px with a 14 px label; section gaps 16.
- Target: header + balance + 4 blood-group rows + up to 3 route rows + cold chain + footer are visible WITHOUT internal scrolling at 1440×900 and 1920×1080. If there are more routes, only the routes section scrolls (with a soft fade).
- Replace the `ESC` text with a × icon button (1.5 px stroke, ink/60, 40 px hit area, tooltip "Close panel (keeps hospital selected)"). No "esc" hint text.

### 19.7 Layout fixes
- **Filter bar:** move it up and to the left, anchored to the top-left of the clear map area, 40 px high. Reserve map top padding = its bottom + 16 px so no hospital or pill ever sits under or against it. (Interpretation: it must stop overlapping the white hospital pills.)
- **Left padding:** the clear rect starts at the list panel's right edge + 24 px, so no hospital is faded under the list scrim.
- **Deep link / reload:** initialize synchronously in the final workspace state (no flash): map clipped to the card with `paper` outside it, padding = list panel, all hospitals fit into the clear rect. (Currently a reload shows the map full-bleed around the card, the cluster small and left-weighted, and a large empty area at the right.)
- **Attribution:** small mono 10px, ink/45, on a paper chip (no border) at the bottom-right inside the card; place labels are hidden beneath it. It must not overlap "GREATER NOIDA" or any other label.

### 19.8 New checks
`hero.pillCount = 1`, `hero.removedPills = true`, `hero.countdownStatic = true`, `hero.leakOpacityAt0 > 0`, `hero.leakOpacityAt031 = 0`, `hero.introSlide = true`, `palette.offPaletteColors = []`; `sound.default = "off"`, `sound.usesFiles = false`, `sound.masterGain ≤ 0.35`, `sound.autoplayAttempts = 0`; `routes.types = 1`, `routes.arcsOnScreen = 0`, `routes.missing = []`, `routes.blurCause` (string), `routes.deepLinkRendersRoads = true`, `routes.defaultCount ≤ 6`; `selection.centerOffsetPx ≤ 12`, `selection.routeVerticesInClearRect = true`, `selection.mapMatchesSheetRoutes = true`, `selection.closeKeepsSelection = true`, `selection.escUnselects = true`; `sheet.compactFitsWithoutScroll = true`; `filterBar.overlapsPills = 0`, `filters.affectMap = true`; `deepLink.mapClippedToCard = true`; `attribution.overlapsLabels = 0`.


---

## 20. v5.2 map fixes (OVERRIDE anything above that conflicts)

- **No moving elements on routes or on the map. At all.** Remove every `TripsLayer` pulse, "packet"/ring head dot, pink/red pulse trail, and the one-time landing ripple, in the Story AND the workspace. Routes are static green lines. (The pink lines with white-ring dots in the latest build are the pulse trails.) `routes.animatedElements = 0`.
- **Selection shows ONLY the selected hospital's routes.** With a hospital selected, render only routes where `from === code || to === code`. Everything else is HIDDEN, not dimmed. If the hospital has no solver transfers, show its 3 nearest candidates (dashed, labeled "candidates"). With no selection, show only the top 6 transfers by urgency (the latest build shows a much denser network).
- Unrelated markers dim to 35% with no pills; their halos dim to 30%.
- Re-verify section 19.5: the selected hospital is centered (±12 px) in the clear rect and the map zooms so all its routes fit. The latest build leaves a selected hospital off-center at the overview zoom.
- The map and the sheet list the SAME routes.
- `checks()`: `routes.animatedElements = 0`, `routes.visibleOnSelect` equals the selected hospital's route ids, `routes.defaultCount ≤ 6`, `selection.centerOffsetPx ≤ 12`.

---

## 21. Dispatch dashboard (the "Clinical Dashboard" tab)

### 21.1 Principle
KEEP the existing design EXACTLY: layout grid, cards, radii, type, pastel look, icons, spacing, chart styles and motion. Change only what the cards SAY and WHICH DATA they show, and replace boxes that make no sense for platelet dispatch. Do not restyle. Reuse existing classes and tokens for any small new element (button, chip, tooltip).
- Rename the tab "Clinical Dashboard" → **"Dispatch"**. New route `#/workspace/dispatch`; keep `#/workspace/dashboard` as an alias.
- The inner brand text "Plexus." becomes "Dispatch." (same black icon tile).
- Accent: sample the existing purple/lavender family. It is allowed ONLY for neutral series, progress and selection. Red/amber/green keep their meaning from section 2 (status and exceptions).
- Locale: en-IN, 24 h IST times (HH:MM), dates like "05 Nov 2026", distances in km, platelet quantities in "u" (units). No $, kg, miles, flags or US references.

### 21.2 Widget mapping

| # | Template box | Becomes |
|---|---|---|
| 1 | Inner logo "Plexus." | "Dispatch." (same icon tile) |
| 2 | Globe / truck / clipboard / trend icon buttons | Jump links with tooltips: Network map (`#/workspace/map`), Fleet & queue, Transfer orders, Insights |
| 3 | Bell + "Anna Torres · Admin" | Bell with a red dot when exceptions > 0 (click → Exceptions tab). Operator name or node ID from the sign-in session, role "Dispatch operator" |
| 4 | "#A-BB84610 · In Transit" card | **Active dispatch:** `#TX-0412`, status chip, `14.1 km · 16 min left · ETA 15:58`, progress bar, pickup → drop-off (hospital name + code, with time and units), one-line FEFO reason, one action |
| 5 | "Total Performance · 92%" bars | **Units rescued · last 30 days** (total in u; one bar per day; today highlighted) |
| 6 | "Michael Reynolds · Driver" | **Courier:** name, "Courier · VAN-02", call and message buttons (demo toasts) |
| 7 | Truck illustration | Keep the art. Add small chain-of-custody chips: vehicle ID, "Seal intact", "Door opened 0×", "Tilt events 0" |
| 8 | "70/75L · 93.3%" fuel card | **Shelf life on arrival:** wave fill = % of 120 h; value in hours; amber below 24 h, red below 12 h |
| 9 | "Engine Load (RPM) 2,850" gauge | **Box temperature:** gauge with the 20–24 °C safe band, value "22.0 °C", line "Agitation off 0:16 of 24:00 h" |
| 10 | "Route Revenue $19 200 / $14 300" line chart + calendar button | **Expiry horizon:** units expiring over the next 120 h; value "49u expire within 36 h"; secondary "37u covered"; the calendar button becomes a 24 h / 72 h / 120 h toggle |
| 11 | Bottom cargo cards ("Medical 760kg") | **Dispatch queue:** `#TX-0412`, `Apheresis · O− · 12u`, `APL → LNJ`. Vehicle icon by payload: ≤ 4u two-wheeler, 5–12u van, > 12u large van. Selected card = white; click selects the order |
| 12 | "Distribution Map · USA" + "2,561 shipments" | **Coverage · NCR:** tile map of NCR zones colored by net balance, hover tooltip, dropdown "All NCR ⌄" filters by zone |
| 13 | "Total shipments 38,450 / On-time delivery 92.6% / 9 High Vol. · 6 Low Vol." | "Units in transit 64u / On-time delivery 92.6% (30 d) / n zones short · n surplus" |
| 14 | "Orders 264" table | **Transfer orders:** tabs Proposed · In transit · Delivered · Exceptions; columns Order, Courier, Pickup, Delivery, ETA, Status; flags → hospital code badges; calendar button → Export CSV; the filter button works |

### 21.3 Data layer (`src/data/dispatch/`)
- **One source of truth.** Orders are derived from the SAME solver transfers and `routes.json` that the map uses. The map sheet and the dashboard must agree on units, ETA and distance for every order.
- `DispatchOrder`: `id` ("TX-0412"), `from`, `to`, `units`, `product` ("Apheresis" or "RDP"), `group`, `shelfLifeAtDispatchH`, `distanceKm` and `etaMin` (from `routes.json`), `status` (`proposed | approved | picked_up | in_transit | delivered | delayed | alert`), `vehicleId`, `courier`, `startedAt`, `progress` (0..1), `coldChain { tempC, agitationOffMin, sealOk, doorOpens, tiltEvents }`.
- **Fleet:** 4 vans (VAN-01…04) and 4 two-wheelers (BIKE-01…04) with demo courier names. Assign the nearest free vehicle to the pickup hospital (haversine), with a seeded tie-break.
- **Sim clock:** real time by default, `?speed=N` for demos. Statuses advance `proposed → (approve) → picked_up (+4 min) → in_transit → delivered at ETA`. Seeded: about 10% of orders carry a delay (+8–14 min), and one carries a temperature excursion (24.6 °C for 6 min) so Exceptions is not empty. Updates run at 1 Hz at most.
- **Delivered tab:** simulated earlier-today orders (seeded).
- **History:** 30 seeded days of `{ rescued, expired, onTimePct }` feed the bars and the "On-time delivery" stat.
- **Expiry horizon:** use existing inventory fields (units by hours-to-expiry). If only the "< 36 h" figure exists, derive the 120 h curve deterministically and label the chart "modelled". "Covered" = units of expiring stock that are inside active orders.
- **Exceptions:** (a) temperature outside 20–24 °C for more than 5 min; (b) ETA slip of more than 15 min; (c) shelf life on arrival below 6 h; (d) agitation-off above 75% of budget or any single interruption above 8 h.
- **Cold-chain facts (researched):** platelets are stored at 20–24 °C with continuous gentle agitation for up to 5 days (120 h). Agitation may be interrupted, but guidance limits it cumulatively (UK guidance: 24 h total, no single interruption above 8 h, with inter-hospital transfers counted); AABB-based guidance for transport allows more (up to 30 h). Keep `AGITATION_OFF_BUDGET_H = 24` as a config constant.
- **FEFO reason string:** "FEFO: {from}'s oldest unit has {h} h left; {to} is {n}u short." Use real inventory values only.
- **Zones** (nearest-centroid assignment of each hospital; report the mapping): North Delhi (28.72, 77.17), West Delhi (28.65, 77.05), Central Delhi (28.63, 77.21), East Delhi (28.66, 77.30), South Delhi (28.53, 77.21), Gurugram (28.46, 77.03), Faridabad (28.41, 77.31), Noida (28.57, 77.35), Ghaziabad (28.67, 77.43).
- Everything simulated is footnoted in the UI (21.6).

### 21.4 Interactions and cross-links
- Click a queue card or table row → selects the order. The top section (active dispatch, courier, art chips, shelf life, temperature) updates, and the card and the row highlight.
- **Approve & dispatch** (for `proposed` orders): status → `picked_up` now, toast, UI tick sound if sound is on. The map sheet's dispatch button calls the SAME action.
- **Open on map →:** navigates to `#/workspace/map/<TO>` with that order's route visible.
- Bell → Exceptions tab, scrolled into view. Zone dropdown or tile click → filters the table and queue by zone (either end of the transfer). Export → CSV of the current filtered rows. Filter button → popover (status, product, zone).
- **"+6h Solver Rebalance"** on this tab regenerates proposals. The table and queue update with a 400 ms fade, and a toast reads "Solver proposed N transfers (Xu)".
- Empty states (no active order): "No active dispatches. Run +6h Solver Rebalance."
- Charts draw in over 700 ms (ease-out), tooltips fade in 160 ms, no bounce. Reduced motion = cross-fade. Mobile stacks the grid; the queue becomes a horizontal scroller.

### 21.5 Banned strings (a DOM scan must find none)
`Anna Torres`, `Michael Reynolds`, `Edgar Humbert`, `Craig Howard`, `Timothy Hines`, `Lisa Collins`, `Admin`, `Driver`, `Engine Load`, `RPM`, `Route Revenue`, `Distribution Map`, `USA`, `shipments`, `38,450`, `2,561`, `70/75L`, `London`, `Tallinn`, `Rome`, `Berlin`, `Dubai`, `Oslo`, `Lyon`, `Milan`, `kg`, `$`, ` mi`, `#A-BB`, `#B-AC`, `#C-BA`, `fuel`.

### 21.6 Footnote
A small mono line at the bottom of the dashboard: "Simulated data, generated from the live solver run. ETAs are free-flow estimates (OSRM), not live traffic."

### 21.7 Checks
`dashboard.bannedStrings = []`, `dashboard.layoutShiftPx ≤ 8` (each of the 14 widgets within 8 px of its position in the reference screenshot at 1440×900), `dashboard.tabCountsMatchRows = true`, `dashboard.kpisDerived = true`, `consistency.mapVsDashboard = true` (same units, ETA, distance per order), `orders.sumUnitsMatchesKpi = true`, `dashboard.simulatedFootnote = true`, `dashboard.exceptionsNonEmpty = true`, `dashboard.aliasRouteWorks = true`, `dashboard.mapMovingDots = 0`, `contrast.minTextRatio ≥ 4.5`.
