# LANDING_SPEC.md — v5 (supersedes v1–v4)

> Read this file at the start of EVERY task. If a task conflicts with it, stop and ask.
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
