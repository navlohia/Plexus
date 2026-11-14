# Plexus Frontend — Stress Lab v3 & Workspace Chrome TODO (Execution Plan)

Target: React + TypeScript + Vite frontend at `C:/Blood Bank/frontend`.
Every task names exact files, symbols, line references (verified against current code), acceptance criteria and verification steps. Execute tasks in the given order.

---

## Context summary

Plexus is an autonomous blood-logistics mesh demo. The workspace is rendered by `frontend/src/components/workspace/WorkspaceShell.tsx` (topbar `ws-topbar-clean`; tabs: map → `FlightyTVMapTab`, dashboard/dispatch → `MoveonDashboard`, surge → `SurgeTab`). A FastAPI backend must run on `127.0.0.1:8000` (`backend/main.py`; start from repo root: `.venv/Scripts/python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`); Vite proxies `/api` → it (`frontend/vite.config.ts`). If the backend is down, `/api/state` returns 500 and the workspace map renders blank. Frontend dev server: `npm --prefix frontend run dev` (5173; user often runs 5174).

The Stress Lab tab was already redesigned once: `SurgeTab.tsx` is now a thin composer (~100 lines) over `frontend/src/components/workspace/stresslab/` (`useWorld.ts`, `StressLabScenarioPicker.tsx`, `StressLabResults.tsx`, `BioMeshAnimation.tsx`); scenario params live in `frontend/src/world/scenarioPresets.ts`; all hardcoded outcome metrics were removed from `frontend/src/lib/crisisData.ts` and `frontend/src/world/counterfactual.ts` (results derive from the live World via `computeScenarioComparison`); keyboard 1/2/3 runs scenarios, Esc stops; a `.stresslab-*` CSS block exists at the end of `frontend/src/index.css` (~line 4672+). **PRESERVE all of this.** The remaining work is surface + chrome only.

Root causes verified against current code:

1. **Bad fonts** — `--ws-font: 'Outfit', …` (`frontend/src/index.css` ~259/301/338) but **Outfit is never loaded**. The Google Fonts link at `frontend/index.html:16` loads only Fraunces, JetBrains Mono, Plus Jakarta Sans; `index.css:1` imports Inter + JetBrains Mono. Everything using `var(--ws-font)` falls back to system Segoe UI.
2. **Blurry text** — `StressLabScenarioPicker.tsx:81`, `StressLabResults.tsx:63`, `BioMeshAnimation.tsx:147` are the ONLY workspace components using Tailwind's `animate-fade-up`; its `both` fill-mode leaves `transform: translateY(0)` applied permanently → composited layer → subpixel antialiasing lost.
3. **Wrong register** — Stress Lab is a centered 1060px column (`.stresslab-inner` max-width, `index.css:4681`) with a big hero headline card: marketing register instead of console register.
4. **Audience (user confirmed)** — Stress Lab is a live demo to evaluators: big readable controls, 3–4 headline numbers, animation front and centre. Do NOT shrink to Dispatch's 11px density; adopt Dispatch's *grammar* (strip / toolbar / hairline cards / mono values) at demo-friendly sizes.
5. **Sound** — remove entirely (usages verified, see Task 4).
6. **"+6h Solver Rebalance" topbar button** — remove (locations verified, see Task 5).
7. **The "box"** — `ws-fullbleed-root` (`workspace.css:35`) and `ws-fullbleed-stage` (`workspace.css:185`) are genuinely full-bleed. **Now identified (verified in this investigation):** the boxed look on Dispatch comes from `MoveonDashboard.tsx`:
   - Root div at **line 2129**: inline `background: C.canvas`, `padding: '20px'`, `justifyContent: 'center'` → 20px cream margin on all sides, content centered instead of flush.
   - Inner panel at **lines ~2211–2221**: `data-testid="dashboard-board"` div with `background: C.board`, `borderRadius: 28`, `maxWidth: 1100`, `padding: '22px 26px'` → the floating rounded white box inset ~28px from the viewport edge.
   On the Stress Lab tab, `.stresslab-root` padding-top 56px + `.stresslab-inner` max-width 1060px creates the same inset look. **Risk:** the persistent MapLibre map (`#persistent-map-stage`, fixed inset 0, z-index 0, rendered by `components/map/MapStage.tsx`) shows through workspace chrome — part of the "cream margin" may be the map's paper background. The fix must preserve that layering (no opaque full-screen backgrounds that would hide the live map on the TV tab).

**De-slop directive (user feedback, Nov 2026):** after reviewing the current Stress Lab the user still sees "AI slop" — glowing dots, pulsing effects, weird colored borders/rails, decorative lines/patterns. Task 3 therefore includes a **mandatory de-slop sweep (§3b)** that enumerates and removes every such element, plus a strict dispatch-alignment contract. No glow, pulse, tinted rail/border, dot grid, dashed stroke or hover theatrics may survive the restructure, and the Stress Lab strip must be pixel-identical to Dispatch's.

---

## RULES (hard rules for any session executing this plan)

1. **NO hardcoded data anywhere.** Every rendered number must derive from the live World (`computeScenarioComparison(world)`, selectors, `world.orders/requests/lots`) or the passed `TickState`. Grep gate after all tasks: no metric literals in `frontend/src/components/workspace/stresslab/*`.
2. **Tokens only.** Colors via `--ws-*` / `--font-*` CSS variables or `story/palette.ts` TOKENS; no new hex literals in components (the CSS block in `index.css` may define tokens only). Site body font is `--font-main: 'Plus Jakarta Sans'` (`frontend/src/workspace.css:11`); Tailwind fonts in `frontend/tailwind.config.js` (display "Outfit", body "Plus Jakarta Sans", mono "JetBrains Mono").
3. **No spec jargon in user-facing copy** (no "§", "PORTAL_SPEC", "Spec §").
4. **Never touch:** `world/index.ts`, `world/runner.ts`, `world/solver.ts`, `world/seed.ts`, `world/counterfactual.ts`, `world/scenarioPresets.ts`, `lib/crisisData.ts`, Dispatch tab *logic*, and the `WorkspaceShell` props contract (`state`, `activeCrisisId`, `onActivateScenario`, `onStopScenario`, `onNavigateToMap`).
5. **Buttons must actually work:** each scenario button dispatches `dispatchWorldEvent('ScenarioStarted'/'ScenarioStopped', …)` with `SCENARIO_PRESETS` params and calls `onActivateScenario`/`onStopScenario`.
6. **Quality floors:** WCAG-visible focus, `prefers-reduced-motion` honored (the existing block stays untouched), 390px layout works, no emoji icons (lucide only).
7. **Backend must be running for visual verification.** Frontend gates: `cd frontend && npx tsc --noEmit && npx vitest run src/world` (15 tests must pass).
8. **Visual verification** via headless Chrome + puppeteer-core (`executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'`). Note: webfetch/screenshot tools without WebGL show the MapLibre map as blank — trust puppeteer screenshots only.
9. **Map layering:** never introduce opaque full-screen backgrounds that would hide `#persistent-map-stage` (z-index 0) used by the TV tab; keep `ws-fullbleed-root`/`ws-fullbleed-stage` semantics.

**Execution order: 1 → 2 → 3 → 4 → 5 → 6.** Fonts/blur first so later visual checks are honest; box-fix last because it touches shared chrome. Tasks 4 and 5 are independent of 1–3 and may run in parallel in a separate session if desired. **Task 3 (including the §3b de-slop sweep) must complete BEFORE any visual sign-off of Tasks 1–2** — a font/blur check against the un-de-slopped Stress Lab is not meaningful; the §3b de-slop grep gate joins the global Verification section below.

---

## TASK 1 — Load the Outfit font (fixes bad fonts site-wide)

**Scope:** `frontend/index.html` only.

**Why:** `--ws-font: 'Outfit', …` is referenced by the workspace token block (`index.css` ~259/301/338) but Outfit is served by no source; every consumer silently falls back to Segoe UI. This is the root cause of the "Stress Lab fonts look bad" complaint and it affects the whole workspace, not just Stress Lab.

**Changes:**
- In `frontend/index.html` line ~16, extend the existing Google Fonts `css2` URL with `&family=Outfit:wght@400;600;700;800`. Keep `display=swap` (already present) and the existing families exactly as they are.

**Acceptance criteria:**
- DevTools computed `font-family` on an element styled with `var(--ws-font)` (e.g. `.stresslab-h1`) resolves to "Outfit".
- No layout shift on load (`display=swap` retained).

**Files:** `frontend/index.html`.

---

## TASK 2 — Kill the blur (opacity-only entrance)

**Scope:** `frontend/src/index.css` `.stresslab-*` block; three stresslab components.

**Why:** Tailwind's `animate-fade-up` uses `fill-mode: both`, leaving `transform: translateY(0)` permanently applied. A retained transform promotes the element to its own composited layer, losing subpixel antialiasing → soft/blurry text. These three spots are the only workspace usages.

**Changes:**
1. In the `.stresslab-*` block appended to `frontend/src/index.css` (after line ~4672), add a `.stresslab-fade` animation: `opacity 0 → 1`, ~360ms ease-out, **NO transform**, and no fill-mode that retains a transform (`animation-fill-mode: backwards` at most — after the animation the element must compute `transform: none`).
2. Swap the class `animate-fade-up` → `stresslab-fade` in:
   - `frontend/src/components/workspace/stresslab/StressLabScenarioPicker.tsx:81`
   - `frontend/src/components/workspace/stresslab/StressLabResults.tsx:63`
   - `frontend/src/components/workspace/stresslab/BioMeshAnimation.tsx:147`

**Acceptance criteria:**
- After the entrance completes, `getComputedStyle(section).transform === 'none'` for all three sections.
- Screenshot compare: text is crisp vs before (puppeteer screenshot, per Rule 8).

**Files:** `frontend/src/index.css`, `frontend/src/components/workspace/stresslab/{StressLabScenarioPicker,StressLabResults,BioMeshAnimation}.tsx`.

---

## TASK 3 — Stress Lab v3 restructure (demo-first, dispatch grammar)

**Scope:** `StressLabScenarioPicker.tsx` + `StressLabResults.tsx` + their CSS. `BioMeshAnimation` is kept as act 3, only re-framed (behaviour unchanged). Keep the component boundary: **rewrite `StressLabResults.tsx` in place**, do not delete it.

**Why:** The tab currently reads as a marketing page (centered 1060px column, hero h1 + prose). The audience is evaluators watching a live demo from a metre away: big readable controls, 3–4 headline numbers, animation front and centre — in Dispatch's *grammar* (strip / toolbar / hairline cards / mono values), not Dispatch's 11px density.

**Changes:**

*Act 0 — chrome:* keep the existing 38px strip (`.stresslab-strip` in `StressLabScenarioPicker.tsx`, already dispatch-identical via `dispatch-strip-*` classes).

*Act 0.5 — toolbar (replaces the hero card):* a 52px dispatch-style toolbar: left = "Stress Lab" label + a mono status chip (`BASELINE` / `RUNNING · <scenario name>` — derive the value from `world.activeScenario` / the existing `stateLabel`); right = small gray hint "pick a shock · 1/2/3".
- **DELETE:** the `h1.stresslab-h1` "Stress Lab", the `p.stresslab-sub` prose paragraph, and the "PICK A SHOCK" `stresslab-section-lbl` (all in `StressLabScenarioPicker.tsx` header at lines ~80–94).

*Act 1 — shock panels:* the 3 scenario buttons stay LARGE (~140px tall panels — the page's primary visual anchors) but in dispatch language: `--ws-surface` background, 1px `--ws-border`, 8px radius, mono numerals, 12–14px text, accent rail retained (`--scenario-accent` vars already set per button). Running state = accent background tint + live readout "×N.NN demand · Nh elapsed" + inline Stop (this state machine already exists at lines ~98–160 — keep its logic, restyle it). Full width, no max-width box: acts 1–2 span the stage width with dispatch's `0 20-24px` padding.

*Act 2 — evidence strip (replaces the results table):* rendered only after a run (keep the `hasRun` gate). Exactly 4 metrics, each a big mono numeral (~20px) with tinted deltas (green `--ws-emerald` / red `--ws-crimson`) and the footnote "Without column modelled":
1. **Unmet units** (with vs without)
2. **Service level** (with vs without)
3. **Rescued units**
4. **Expired units**
All values still from `computeScenarioComparison(world)` (`world/counterfactual.ts`) — **zero new literals**. Drop the other rows (`Open requests`, `Median time to assign`, `Outdate rate`) from the `ROWS` array in `StressLabResults.tsx`.

*Act 3 — bio-mesh:* re-frame the `BioMeshAnimation` card: radius 8, header 48px, dispatch paddings. Behaviour, geometry and animation logic unchanged.

*CSS:* remove the `.stresslab-inner` max-width 1060/centering (`index.css:4681`); the acts span the full stage width with `0 20-24px` padding; keep the `prefers-reduced-motion` block untouched.

### 3b. De-slop sweep (mandatory)

> This sub-section **supersedes** the accent wording in Act 1 above ("accent rail retained", "running state = accent background tint"): those elements are removed, not retained.

**REMOVE — every AI-slop element in the CURRENT implementation, with verified locations in `frontend/src/components/workspace/stresslab/` and the `.stresslab-*` block of `frontend/src/index.css`:**

1. **Glowing dots** — `.stresslab-strip-dot--live` (index.css): `box-shadow: 0 0 6px rgba(244,63,94,0.8)` + `animation: soft-pulse` → replace with a flat static 6px dot (`background: var(--ws-crimson)`, no shadow, no animation). Same for the inline restyled dot in `StressLabScenarioPicker.tsx` (running button status dot uses `stresslab-strip-dot--live` with inline style).
2. **Pulsing radar waves** — `BioMeshAnimation.tsx`: the `<circle>` with two `<animate>` elements (r 20→42, opacity 0.5→0) on each crisis node → delete entirely. Crisis nodes get a static ring only if needed, otherwise just the node circle.
3. **Glowing packet halos** — `BioMeshAnimation.tsx` vessels: the outer `<circle r="8" ... opacity="0.25">` glow behind each packet → remove; keep at most a single plain packet dot per vessel (no halo), or remove packets entirely if the line itself reads clearly.
4. **Dot-grid pattern background** — `BioMeshAnimation.tsx` `<pattern id="slGrid">` + `<rect fill="url(#slGrid)">` → remove; canvas is flat `var(--ws-surface-2)`.
5. **Accent rails** — `.stresslab-scenario-btn::before` (index.css): the 3px left colored rail → remove entirely.
6. **Accent-tinted borders/backgrounds** — `.stresslab-scenario-btn--running` uses `--scenario-accent` border + `--scenario-accent-bg` tint → replace with dispatch grammar: border `--ws-border-2`, background `--ws-surface-2`; running state communicated ONLY by a mono status text (`RUNNING · ×2.1 · 18h`) + Stop button, in `--ws-crimson`. Remove the `--scenario-accent`/`--scenario-accent-bg` custom properties from the button style prop in `StressLabScenarioPicker.tsx`.
7. **Pill-shaped SVG node cards** — `BioMeshAnimation.tsx` `<rect rx="18">` hospital pills → flat rectangles (rx 6) with 1px `--ws-border`, matching dispatch card corners; also the colored ring circles around crisis node circles (e.g. GTB/SFD double-circle) → single flat circle.
8. **Uppercase letterspaced micro-labels** — `.stresslab-section-lbl` (0.12em uppercase) used as decoration ("PICK A SHOCK", "PICK A SHOCK · PRESS 1 / 2 / 3") → already deleted with the hero (Act 0.5); ensure remaining labels match dispatch's label style (plain gray 11px, weight 500, normal case, e.g. `.dispatch-strip-lbl`).
9. **Dashed/dotted anything** — no `stroke-dasharray`, no dotted dividers anywhere in stresslab (verify none remain).
10. **Entrance/hover theatrics** — no `transform` on hover (`translateY(-1px)` in `.stresslab-scenario-btn:hover` → remove; hover = border-color + background change only, ≤120ms).

**REPLACE WITH — Dispatch alignment contract:**

- Every card: `background: var(--ws-surface)`, `border: 1px solid var(--ws-border)`, `border-radius: 6-8px`, `box-shadow: var(--ws-card-shadow)` or none.
- Every status: gray label (`.dispatch-strip-lbl` style) + mono value (`.dispatch-strip-val` style). No tinted chips for state — state is text.
- Accents (emerald/crimson) appear ONLY in: metric deltas, the Stop button (flat crimson text/border), and the map B-button (flat emerald solid). Nowhere else.
- Alignment: Stress Lab strip must be pixel-identical to Dispatch's (same top offset below the 60px topbar — note Task 6 de-boxes shared chrome, coordinate the two), same height (38-40px), same bg (`--ws-surface`), same border-bottom, same horizontal padding (`0 20px`); content padding `0 20-24px` full-width.
- Typography: labels 11px/500 gray, values 12-13px mono 700, panel titles 13-14px/700 Plus Jakarta Sans (via `--font-main`) — NOT giant display text. No letterspacing tricks.

**Acceptance criteria:**
- No h1/prose in the tab; `.stresslab-inner` max-width removed.
- All numbers still trace to `computeScenarioComparison` (grep gate: no metric literals in `components/workspace/stresslab/*`).
- Demo flow works end-to-end: click 01 → live button state → evidence strip appears → bio-mesh plays → Esc/Stop resets.
- 390px stacks cleanly; reduced-motion still honored.
- **De-slop grep gate:** `grep -nE "soft-pulse|box-shadow: 0 0|animate-fade-up|stroke-dasharray|letterSpacing: \"0\.1|::before"` over the stresslab files + the `index.css` `.stresslab` block → 0 hits (tune the pattern to the final CSS names).
- `--scenario-accent` custom property no longer exists in any component.
- **Pixel check:** side-by-side 1440px screenshots of Dispatch and Stress Lab — strip y-offset, height, bg color and border-bottom match exactly; card corner radii ≤8px everywhere; no glow/pulse visible in two screenshots 2s apart (pixel-diff of a running button is static except the elapsed-time text).

**Files:** `frontend/src/components/workspace/stresslab/StressLabScenarioPicker.tsx`, `frontend/src/components/workspace/stresslab/StressLabResults.tsx`, `frontend/src/components/workspace/stresslab/BioMeshAnimation.tsx` (re-frame only), `frontend/src/index.css` (`.stresslab-*` block), `frontend/src/components/workspace/SurgeTab.tsx` (only if the wrapper needs the new padding — logic untouched).

---

## TASK 4 — Remove sound everywhere

**Scope:** delete the sound system and every reference to it.

**Why:** user decision — the demo must be silent. Verified usages:

**Changes:**
1. `frontend/src/components/workspace/WorkspaceShell.tsx`:
   - Remove the `soundEngine` import (line 19) and the `Volume2`/`VolumeX` icon imports (lines 9–10, verify not used elsewhere in the file first).
   - Remove the `isMuted` state + `soundEngine.subscribe` effect (lines 309, 312).
   - Remove the mute toggle button JSX (line ~905, class `ws-sound-toggle-btn`).
2. `frontend/src/components/landing/StoryTextLayer.tsx`: remove the sound import/state (lines 13, 16) and its own mute toggle button (line ~623, in the story control bar) plus its Volume icons.
3. Remove call sites:
   - `frontend/src/components/landing/LandingPage.tsx:110,161` — `soundEngine.onScrollProgress(p)`; if a scroll handler exists *solely* to feed sound, remove that dead wiring too.
   - `frontend/src/components/workspace/MoveonDashboard.tsx:1960` — `playButtonClick`.
   - `frontend/src/data/dispatch/store.ts:153,174` — `playButtonClick`.
4. Delete `frontend/src/utils/soundEngine.ts`.
5. `grep -rn "soundEngine\|sound-engine" frontend/src` — fix any remaining references (including tests/stories and any lazily-loaded chunk importing it).

**Acceptance criteria:**
- `grep -rn "soundEngine" frontend/src` → 0 hits.
- `npx tsc --noEmit` clean.
- No console errors on landing → workspace flow.
- Topbar right side reads: View as hospital → Sign In (no speaker icon, no green button).

**Files:** `WorkspaceShell.tsx`, `components/landing/StoryTextLayer.tsx`, `components/landing/LandingPage.tsx`, `components/workspace/MoveonDashboard.tsx`, `data/dispatch/store.ts`, delete `utils/soundEngine.ts`.

---

## TASK 5 — Remove "+6h Solver Rebalance" button

**Scope:** `WorkspaceShell.tsx` only.

**Why:** user decision — the simulated-rebalance button is not part of the demo flow.

**Changes (all in `frontend/src/components/workspace/WorkspaceShell.tsx`):**
- Delete the button JSX at ~lines 932–937 (`Zap` icon, `disabled={isRebalancing}`, label "Rebalancing..."/"+6h Solver Rebalance"). The comment at line 849 describing the right cluster must be updated too.
- Delete the rebalance handler block ~lines 378–404 (uses the `plexus` store, toast "+6h simulated: network rebalanced") — and the toast wiring if it is used only by this handler.
- Delete the `isRebalancing` state (line 308).
- Remove now-unused imports (e.g. `Zap` — verify it isn't used elsewhere in the file before removing; also any store/toast imports left dead).
- Keep the `View as hospital` and `SIGN IN` buttons exactly as they are.

**Acceptance criteria:**
- Topbar right = View as hospital → SIGN IN only.
- `npx tsc --noEmit` clean; no dead code referencing `isRebalancing`.

**Files:** `frontend/src/components/workspace/WorkspaceShell.tsx`.

---

## TASK 6 — De-box the workspace (Dispatch fit)

**Scope:** `MoveonDashboard.tsx` root/board styles; cross-check Stress Lab (Task 3 covers it) and the TV tab (must be unaffected).

**Why:** the workspace reads as a floating rounded box on cream instead of a full-bleed console.

**Sub-task 6a — identify (partially done in this investigation, confirm at runtime):**
- **Verified:** the box is `MoveonDashboard.tsx` — root div at **line 2129** (`background: C.canvas`, `padding: '20px'`, `justifyContent: 'center'`) wrapping the `data-testid="dashboard-board"` panel at **lines ~2211–2221** (`background: C.board`, `borderRadius: 28`, `maxWidth: 1100`, `padding: '22px 26px'`).
- Confirm at runtime with headless Chrome (`elementFromPoint` at (20,120) / (720,120) / (1420,120) + computed style) to catch any additional wrapper (e.g. a `.dispatch-sleek-root`-level class) and to determine how much of the cream "margin" is the persistent map's paper background showing through.

**Sub-task 6b — fix:**
- In `MoveonDashboard.tsx`: make the root fill the stage (no 20px inset padding, no centering) and flatten the `dashboard-board` panel — no outer `borderRadius: 28`, no `maxWidth: 1100`, strips touch the topbar line; normalize content padding to `0 20-24px`. Adjust inner card radii only where they are intentional surface chrome, not the outer container.
- Stress Lab: already de-boxed by Task 3 (full-width acts, `0 20-24px` padding, strip alignment) — verify, don't redo.
- TV tab: verify `.flighty-tv-outer-shell` (workspace.css) is unaffected.
- **CRITICAL:** do not introduce opaque full-screen backgrounds that would hide the persistent MapLibre map (`#persistent-map-stage`, fixed inset 0, z-index 0, `components/map/MapStage.tsx`). Keep `ws-fullbleed-root` (`workspace.css:35`) / `ws-fullbleed-stage` (`workspace.css:185`) semantics; cream visible only where intentional.

**Acceptance criteria:**
- At 1440px the Dispatch strip/cards align edge-to-edge with the viewport (no floating box).
- TV map still renders through chrome.
- Stress Lab strip aligns pixel-identical with the Dispatch strip (same top offset, height, background).
- 390px pass.

**Files:** `frontend/src/components/workspace/MoveonDashboard.tsx` (styles only — no logic), `frontend/src/index.css` / `frontend/src/workspace.css` (if shared classes need the fix).

---

## Verification

Run from repo root / `frontend` as noted. Backend on `127.0.0.1:8000` must be up for anything visual (`.venv/Scripts/python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`).

1. **Static gates:** `cd frontend && npx tsc --noEmit && npx vitest run src/world` — 15 tests pass.
2. **Grep gates:**
   - `grep -rn "soundEngine\|sound-engine" frontend/src` → 0 hits.
   - `grep -rn "isRebalancing" frontend/src` → 0 hits.
   - No metric literals (e.g. no hardcoded unit/percent numbers) in `frontend/src/components/workspace/stresslab/*`.
   - **De-slop gate (Task 3 §3b):** `grep -nE "soft-pulse|box-shadow: 0 0|animate-fade-up|stroke-dasharray|letterSpacing: \"0\.1|::before"` over the stresslab files + the `index.css` `.stresslab` block → 0 hits (tune the pattern to the final CSS names).
   - `grep -rn "scenario-accent" frontend/src` → 0 hits (the `--scenario-accent`/`--scenario-accent-bg` custom properties are gone).
3. **Font check (Task 1):** DevTools computed font on `.stresslab-h1` (or any `var(--ws-font)` element) = "Outfit".
4. **Blur check (Task 2):** after entrance, `getComputedStyle(section).transform === 'none'` on all three sections.
5. **Demo flow (Task 3):** with the backend up, puppeteer: click scenario 01 → button enters running state with live multiplier/hours → evidence strip appears with 4 metrics → bio-mesh plays → Esc resets to baseline. Repeat at 1440px and 390px.
6. **Chrome regression (Tasks 4–5):** landing → workspace flow, console clean; topbar right = View as hospital → SIGN IN only; no speaker icon, no green rebalance button; no sound.
7. **De-box check (Task 6):** puppeteer screenshot at 1440px — Dispatch strip flush with viewport edges, Stress Lab strip pixel-identical in top offset/height/background; TV tab map still visible through chrome (`#persistent-map-stage` not covered by an opaque background). Remember: only puppeteer screenshots are trustworthy (WebGL map is blank in non-WebGL capture tools).

---

## Out of scope

- Counterfactual engine semantics (`world/counterfactual.ts`).
- Backend / API changes.
- The emergency-route ETA strings mapped in `WorkspaceShell`'s `handleActivateScenario`.
- Bio-mesh geometry-from-lat/lng (diagram coordinates stay as presentation constants).
- Dispatch tab *logic* (only its container styles change in Task 6).
