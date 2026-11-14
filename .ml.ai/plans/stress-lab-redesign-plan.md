# Stress Lab (SurgeTab) Redesign Plan — Plexus

> Note: this file is mirrored at the requested path `docs/stress-lab-redesign-plan.md` content-wise; the tooling only permits writes under `.ml.ai/plans/`.

**Goal:** Rebuild the "Stress Lab" tab as a minimal, dispatch-consistent screen: 3 scenario buttons → live simulation → counterfactual results → the existing bio-mesh animation. Delete the Scenario Configuration control panel. Remove every hardcoded metric; derive everything from the live `World`.

**Scope of files touched**
- Rewrite: `frontend/src/components/workspace/SurgeTab.tsx` (2490 lines → split into 4 components)
- Edit: `frontend/src/world/counterfactual.ts` (de-hardcode the WITHOUT column)
- Edit: `frontend/src/lib/crisisData.ts` (strip hardcoded outcome numbers; keep scenario metadata)
- New: `frontend/src/world/scenarioPresets.ts` (fixed per-preset parameters that used to be UI controls)
- New: `frontend/src/components/workspace/stresslab/*` (picker, results, bio-mesh, world hook)
- Additive: small `stress-lab-*` CSS block appended to `frontend/src/index.css` (reuses the `dispatch-sleek-*` variable system; no Tailwind config change needed)

**What stays untouched:** `WorkspaceShell.tsx` props contract (`state`, `activeCrisisId`, `onActivateScenario`, `onStopScenario`, `onNavigateToMap`), `world/index.ts`, `runner.ts`, `solver.ts`, `seed.ts`, the Dispatch tab.

---

## 1. Brainstorm / critique — why it reads as cluttered and off-brand

1. **Two competing design systems in one tab.** The rest of the workspace runs on `story/palette.ts` `TOKENS` (cream `paper #F3EEE4`, ink `#111827`, emerald `#15997A`, crimson `#E11D48`) and the `dispatch-sleek-*` CSS grammar in `index.css` (56px-cleared root, 38px status strip, hairline `--ws-border` dividers, `--ws-font-mono` values). SurgeTab hand-rolls slate-gray Tailwind hexes (`#F8FAFC` bg, `#0F172A` text, `#059669` emerald, `#CBD5E1` borders) in ~2,000 inline `style` objects. Same hues, wrong temperature — the tab visibly doesn't belong.
2. **Spec jargon in user-facing copy.** "PORTAL_SPEC §5", "Counterfactual Analysis (Spec §5)", "LANDING_SPEC" — implementation notes leaked into headings. No other tab does this.
3. **Duplicate control surfaces.** The scenario can be started from PAGE 1 ("Launch Simulation & Scroll"), from the config card ("Start Dengue Surge"), and per-card — three start buttons for one action. Results also appear twice (event-log strip inside the config card AND the Live Results table).
4. **Control-panel density.** Preset selector (with a 'drought' preset no scenario button references), 24h/72h/7d duration buttons, ×1.0–×4.0 slider with ± steppers, 6-zone multi-select, 3 "Dengue Model Calibration" chips, ×1/×6/×30/×120 speed buttons, autopilot toggle, start + reset — 20+ interactive controls where 3 buttons suffice. Every extra control is another thing that can desync from the world state.
5. **Redundant motion.** `scroll-snap-type: y mandatory` over four full-viewport pages makes the tab fight the scrollbar and hides results below a full screen of chrome. DispatchTab fits its whole job in one screen.
6. **Dead data.** The `state: TickState` prop is destructured as `_state` and never used (SurgeTab line ~120), while the tab renders hardcoded numbers from `crisisData.ts`. The tab looks data-rich while being data-blind.

## 2. Research / inspiration

| Direction | Takeaway applied here |
|---|---|
| **SCADA annunciator / mimic boards** (control-room HMI grammar) | One alarm-annunciator strip at top: pulsing dot only while a scenario is armed, values in mono, labels in 500-weight gray. Status is a single line, never a card. |
| **Linear / Vercel minimal ops consoles** | Flat surface, hairline dividers, one accent color per state (idle/run/armed). Buttons are text + arrow, not gradient cards. Zero decorative chips. |
| **Awwwards control-room dashboards** (mission-control sites by e.g. Active Theory / Locomotive-grade studios) | Big display numeral per scenario (01/02/03) — typography carries hierarchy, not boxes. |
| **Dribbble "simulation launcher" UI kits** | A scenario run changes state in place: card swaps label → progress hairline → results, no navigation. |
| **Game-HUD scenario pickers** (Frostpunk / Into the Breach mission select) | One-screen decision: 3 large targets, keyboard 1/2/3 select, Esc = stop. No scroll to configure. |
| **Flighty / ferry-departure boards** | The WITH/WITHOUT table reads as a two-column departure board: mono numerals, delta column tinted `TOKENS.green`/`TOKENS.red`. |

**Signature idea (the one justified flourish):** the **3 scenario buttons are the page** — each button *is* the live status surface for its scenario (idle → armed → running with a live elapsed/demand-multiplier readout inside the button). Nothing else on the page is a control. The bio-mesh animation below is the payoff, driven by live world geometry.

## 3. Design direction

**Tokens (align to `frontend/src/story/palette.ts`):**
- Page background: `TOKENS.paper #F3EEE4`; cards: `paperPure #FFFFFF`; hairlines: `inkHairline`.
- Text: `ink` / `inkSecondary` / `inkMuted`. Kill all slate `#0F172A / #F8FAFC / #CBD5E1`.
- Status: `green #15997A` (armed / with-Plexus wins), `red #E11D48` (running shock / without-Plexus losses), `amber #F59E0B` (risk).
- Scenario accents from `CRISIS_BUTTONS` (`#E11D48`, `#D97706`, `#0284C7`) stay as per-scenario identity, used only as a 3px left rail + tinted `accentBg` on the running button.

**Typography (Tailwind config `frontend/tailwind.config.js`):** `font-display` (Outfit) for the h1 + scenario numerals; `font-body` (Plus Jakarta Sans) for prose; `font-mono` (JetBrains Mono) for every metric value, exactly like `dispatch-strip-val`. Type scale: h1 28/36px, section label 11px / 0.12em uppercase, metric value 15px mono 700, metric label 11px.

**Visual grammar:** mirror `dispatch-sleek-root` structure — a root that clears the 60px topbar, a 38px status strip (`dispatch-strip-item/lbl/val`, `dispatch-strip-dot-red` when running), then a single column of white cards on paper. Reuse the `--ws-*` CSS variables the dispatch classes consume; add a small `.stresslab-*` block in `index.css` rather than duplicating hexes. Radii 12px; shadow = `shadow.card` from the Tailwind config.

**Depth/spacing:** one level of elevation (white card on paper). No nested boxes; section separation is hairline borders, not boxes-in-boxes. Card padding 20/28px, 24px gutter between cards.

**Motion:** entrance = existing Tailwind `animate-fade-up` (already in config). Scenario-run pulse = 2s `soft-pulse` on the running dot. Bio-mesh vessel animation stays but wrapped in `@media (prefers-reduced-motion: reduce)` → static strokes, no dash animation, no counter tween (render final values). All transitions ≤ 200ms ease-out.

**Mobile (390px):** status strip scrolls horizontally (`dispatch-sleek-strip` already does); the 3 buttons stack full-width; results table becomes a 2-col grid (label / delta); bio-mesh SVG scales via `viewBox` (already does) with pill labels collapsed to dot+code.

## 4. Target IA / layout — ONE screen, no scroll-snap

```
┌ stresslab-root (paper, clears 60px topbar, no scroll-snap) ─────────────┐
│ stresslab-strip: ● STRESS LAB · scenario state · sim clock · ×speed     │ ← all from world
│ ┌ card: Pick a shock ─────────────────────────────────────────────────┐ │
│ │  h1 "Stress Lab" + one-line sub                                     │ │
│ │  [01 Dengue…] [02 NH-48…] [03 Agitator…]   ← the ONLY 3 buttons     │ │
│ │   running button: rail accent, live "×2.3 demand · 18h elapsed",    │ │
│ │   inner "Stop" (Square icon); idle: "Run simulation" (Play icon)    │ │
│ └────────────────────────────────────────────────────────────────────-┘ │
│ ┌ card: Live results · with vs without Plexus (only when armed/ran) ──┐ │
│ │  7 metrics × (WITH | WITHOUT | Δ) from computeScenarioComparison()  │ │
│ └────────────────────────────────────────────────────────────────────-┘ │
│ ┌ bio-mesh animation section (kept, refactored, below the fold) ─────┐ │
│ │  plays on activation; nodes/vessels from live world data           │ │
│ │  footer: "View Active Routes on Live Map" (onNavigateToMap)         │ │
│ └────────────────────────────────────────────────────────────────────-┘ │
└────────────────────────────────────────────────────────────────────────-┘
```

**DELETED:** the entire "Scenario Configuration · PORTAL_SPEC §5" card (`SurgeTab.tsx` ~lines 791–1226): preset selector, duration buttons, multiplier slider + steppers, zone multi-select, "Dengue Model Calibration" chips, SIM SPEED buttons, autopilot toggle, "Start Dengue Surge", "Reset Demo". Also delete: PAGE-1 "Launch Simulation & Scroll" links (the card buttons ARE the launch), the duplicate event-log strip, all "§"/spec references, the PAGE-1 hero headline (replaced by the card h1), and the `scroll-snap` wrappers.

**Parameter resolution (no UI):** scenario dispatch uses fixed per-preset defaults from new `frontend/src/world/scenarioPresets.ts`:
```ts
export const SCENARIO_PRESETS = {
  dengue:   { durationH: 72, multiplier: 2.0, zones: ['East Delhi', 'South Delhi'], autopilot: true },
  trauma:   { durationH: 24, multiplier: 2.5, zones: ['Gurugram', 'South Delhi'],   autopilot: true },
  agitator: { durationH: 12, multiplier: 1.0, zones: ['South Delhi'],               autopilot: true },
} as const;
```
`handleStartOutbreak(presetId)` (SurgeTab ~line 159) currently reads `selectedPreset / dengueDurationH / dengueMultiplier / selectedZones` state — it will read `SCENARIO_PRESETS[presetId]` instead and dispatch the same `dispatchWorldEvent('ScenarioStarted', 'operator:DISPATCH-01', {...})` payload. `runner.ts` line 62 honours `world.settings.autopilot || world.activeScenario?.autopilot`, so `autopilot: true` inside the event keeps the solver dispatching with zero UI. Speed: sim speed is a **clock concern, not a scenario concern** — `simClock.setSpeed()` exists and `clock.ts` supports `?speed=` query params; the plan drops the in-tab speed buttons (open question §7).

**Button behavior contract (must actually work):**
- Idle → click a button → `onActivateScenario(id)` (Shell's `handleActivateScenario`) **and** `handleStartOutbreak(id)` both fire (they already do at line ~254); button enters RUNNING state.
- RUNNING → click "Stop" (Square icon) → `dispatchWorldEvent('ScenarioStopped', …)` + `onStopScenario()` (Shell resets via `/api/reset` + `plexus.resetScenario()`); results collapse to baseline.
- The bio-mesh animation section reveals + plays on activation (scroll into view once), driven by `world.activeScenario`.

**Component split (new files, all in `frontend/src/components/workspace/stresslab/`):**
- `StressLabScenarioPicker.tsx` — strip + h1 + 3 buttons; props: `world`, `activeScenarioId`, `onActivate`, `onStop`.
- `StressLabResults.tsx` — the with/without board; prop: `comparison: ScenarioComparison` from `computeScenarioComparison(world)`; renders "—" for `medianTimeToAssignMin: null`.
- `BioMeshAnimation.tsx` — moved from SurgeTab lines ~1514–2490 and refactored (§5); keeps "Back to Scenarios" as an anchor scroll; keeps `onNavigateToMap`.
- `useWorld.ts` — `subscribeWorld`/`getWorld` hook (SurgeTab already does this manually; extract once, reuse in all three).

## 5. De-hardcoding plan

| Hardcoded today | Live source | Change |
|---|---|---|
| `CRISIS_SCENARIOS[*].siloedStockouts / rescuedUnits / rescuedSavingsText / oNegProtectedPct / bannerTelemetry` (`crisisData.ts`) | Delete fields. Results come only from `computeScenarioComparison(world)`; scenario buttons keep only `id/num/label/sub/accent` (the `CRISIS_BUTTONS` shape). Bio-mesh header telemetry → `TickState.solver_telemetry.solve_time_ms` + `arcs_generated` (the currently-unused `_state` prop) | `crisisData.ts` trim |
| `counterfactual.ts` WITHOUT column: `unmetUnitsWithout = max(+32, +28)`, `serviceLevelPctWithout = 24/32`, `outdateRateWithout = 8.1`, `expiredUnitsWithout = max(34, rescued*0.75)` | **Recompute, don't const.** Same demand math with zero cross-hospital assignments (below) | `counterfactual.ts` section 2 rewrite |
| `counterfactual.ts` WITH clamps: `Math.max(88, …)`, median fallback `6`, service fallback `98` | Remove clamps; render `null` → "—" until the first assignment exists (median fallback `6` → `null`) | `counterfactual.ts` |
| `BASELINE_SCENARIO.*` numbers (`crisisData.ts`) | Deleted; baseline strip values computed from world (`selectors.getOutdateRate`, open requests via `world.requests`) | `crisisData.ts` + strip |
| `DONOR_NODES / CRISIS_NODES` fixed coordinates (`SurgeTab.tsx` ~lines 32–48) | **Keep as presentation constants** (node identity/position is diagram layout, not data) but derive *membership and values* from `world.hospitals`: a node appears only if that hospital has open scenario requests or active orders; sub-line shows live `selectors.getNetBalance(world, code)` | `BioMeshAnimation.tsx` |
| `WIDE_VESSELS` 7 fixed béziers + corridor labels | Derive vessels from `world.orders` in `pickedUp/in_transit` status: one vessel per active order, donor-node position → crisis-node position, `delay` = stagger by index. Corridor labels dropped (decoration) | `BioMeshAnimation.tsx` |
| "Converged in 14.8ms · 7,840 arcs evaluated" | `TickState.solver_telemetry` / world solver stat | strip + bio-mesh header |
| Emergency-route ETAs `"14m · Green Corridor"` (drive Shell's `emergencyTransfers`) | Out of tab scope this pass — Shell maps them into `TickState.transfers`; flagged in §7 | none |

**Counterfactual WITHOUT-column derivation (honest version):** for the scenario's target zones, compute per-hospital deficit as `selectors.getDemand36(world, h) − selectors.getUsableUnits(world, h)` **ignoring `getIncomingUnits`** (no cross-hospital transfers exist in the counterfactual), summed over affected hospitals → `unmetUnitsWithout`. `serviceLevelPctWithout = 100 × fulfilledIfSiloed / allRequests`, where `fulfilledIfSiloed` counts scenario requests coverable by the requesting hospital's own usable stock alone. `expiredUnitsWithout = expiredUnitsWith + Σ surplus lots ≥36h at donor hubs` (the lots `getRescuedUnits` credits to the mesh). `outdateRateWithout = expiredUnitsWithout / receivedUnits` over the same `history30d` window `selectors.getOutdateRate` uses — no 8.1 literal. These remain *modelled projections* (a counterfactual cannot be measured), but they are recomputed from world state each tick instead of pasted constants; document that in a header comment in `counterfactual.ts`.

**Existing code to reuse (do not rewrite):** `selectors.getUsableUnits / getDemand36 / getNetBalance / getRescuedUnits / getOutdateRate / getHospitalState / getScenarioMultiplier`; `computeScenarioComparison` section 1 (keep verbatim); `dispatchWorldEvent('ScenarioStarted' / 'ScenarioStopped')`; `subscribeWorld / getWorld`; `simClock.setSpeed`; `CRISIS_BUTTONS`; Shell's `handleActivateScenario` / `handleStopScenario` (unchanged); `dispatch-sleek-strip` classes + `--ws-*` variables; Tailwind `fade-up` / `soft-pulse` animations.

## 6. Step-by-step implementation order

1. **`frontend/src/world/scenarioPresets.ts` (new).** Fixed presets above. *AC:* exports a typed `Record<ScenarioId, {durationH; multiplier; zones; autopilot}>`; no UI imports it yet.
2. **`frontend/src/world/counterfactual.ts`.** Replace section 2 with the derivation above; remove WITH-column clamps. *AC:* `computeScenarioComparison(getWorld())` before any scenario returns baseline service level; no magic ±32/+28/8.1/88; existing `world/__tests__` pass; add a unit test asserting unmet-units WITHOUT ≥ unmet-units WITH and expired WITHOUT ≥ expired WITH.
3. **`frontend/src/lib/crisisData.ts`.** Delete `BASELINE_SCENARIO` and the numeric fields from `CrisisScenario`; keep `CRISIS_BUTTONS` + geometry fields (`centerCoords`, `affectedNodeIds`, `emergencyRoutes` if Shell still needs them — see §7). *AC:* `grep -nE "₹|Stockouts \(|bannerTelemetry|rescuedUnits: [0-9]" frontend/src/lib/crisisData.ts` → 0 hits; `tsc` clean.
4. **`frontend/src/components/workspace/stresslab/useWorld.ts` (new).** Subscribe/`getWorld` hook. *AC:* re-renders on `ScenarioStarted` and on sim ticks.
5. **`StressLabScenarioPicker.tsx` (new).** Status strip + 3 buttons per §4. Real `<button>`s, `aria-pressed` for running, keyboard 1/2/3 to run, Esc → stop; no disabled states except during a transition tick. *AC:* click dengue → `dispatchWorldEvent('ScenarioStarted', …, {preset:'dengue', durationH:72, multiplier:2, zones:[…], autopilot:true})` observable via `window.__world.getLog()`; button shows live `selectors.getScenarioMultiplier` and elapsed h; Stop fires `ScenarioStopped` and Shell resets.
6. **`StressLabResults.tsx` (new).** Departure-board table; 7 metrics; deltas tinted green/red; `null` → "—"; hidden (not zero-filled) when no scenario has run this session. *AC:* every rendered number traces to `computeScenarioComparison`; at 390px it stacks to a 2-col grid.
7. **`BioMeshAnimation.tsx` (new; refactor of SurgeTab lines ~1514–2490).** Keep the SVG + `wideBezierPath`; nodes filtered by live hospital/order data; vessels from `world.orders`; animated counters only when `matchMedia('(prefers-reduced-motion: reduce)')` is false. *AC:* with no active orders the vessel layer renders empty (no fake traffic); running dengue shows ≥1 vessel per active order.
8. **Rewrite `SurgeTab.tsx`** to compose the three components; delete the config card, scroll-snap, `DONOR_NODES/CRISIS_NODES/WIDE_VESSELS` constants, and all slate hexes; wire `TickState` solver telemetry into the strip. *AC:* file < ~350 lines; no inline hex literals outside token refs; picker + results fit in one viewport at 1440px.
9. **Append `.stresslab-*` CSS to `frontend/src/index.css`** beside the `dispatch-sleek-*` block, consuming the same `--ws-*` variables. *AC:* side-by-side with DispatchTab at 1440px: same canvas color, same strip height, same border color.
10. **Verify (narrowest useful):** `cd frontend && npx tsc --noEmit && npm test -- world`, then manual: run all 3 scenarios end-to-end, confirm results differ per scenario, stop resets to baseline, keyboard-only pass, `prefers-reduced-motion` pass, screenshots at 1440px & 390px next to Dispatch.

## 7. Risks & open questions

- **Losing demo functionality.** Removing speed/autopilot/zone controls assumes demo speed belongs to the clock (URL `?speed=`), not the tab. If the demo script needs in-tab speed, add ONE `×6` toggle to the status strip later — do not restore the panel. The 'drought' preset exists in the config card but has no scenario button; if it's required it becomes a 4th button, not a dropdown.
- **One screen vs PAGE 1 hero.** This plan collapses PAGE 1 + config + results into one screen and demotes the hero. If stakeholders want the cinematic landing, keep the h1 and drop the separate hero page — do not keep both.
- **Bio-mesh nodes from `world.hospitals` vs constants.** `world.hospitals` is keyed by code (`AIM`, `GTB`…) and the diagram needs screen positions; deriving positions requires a lat/lng projection. Recommended: keep coordinates as layout constants, derive *membership and values* live (§5). Full geometry-from-lat/lng is a follow-up.
- **Counterfactual honesty.** WITHOUT-Plexus can never be *measured*; the plan makes it computed-from-world-model rather than constants, but it is still a projection. Label the column "modelled" in the UI to stay honest.
- **Shell double-start.** `handleActivateScenario` in `WorkspaceShell.tsx` also injects `#EMG-*` transfers from `CRISIS_SCENARIOS` — verify `emergencyRoutes` survives the `crisisData.ts` trim or move it to `scenarioPresets.ts`, otherwise Shell's emergency-transfer injection loses its data source.
- **Scroll-snap removal** changes the tab's length; confirm no e2e test asserts on the four-page structure.
- **`TickState` vs `World` duplication.** Shell passes the backend `TickState` while the tab reads the frontend `World`; the two clocks can disagree briefly. Keep each metric on one source (results = World; strip telemetry = TickState) and note it in code comments.
