\# DESIGN.md — Plexus Final Billion-Dollar Overhaul (Unified Store + Real OSRM Road Routing + Linear/Vercel UI + Interactive 3D Physics)



\## 0. CORE ARCHITECTURAL MANDATES (ZERO DESYNC, ZERO FAKE ARCS)

1\. \*\*SINGLE UNIFIED REACTIVE STORE (100% SYNC ACROSS ALL 3 TABS):\*\*

&#x20;  - Never hardcode static numbers like `1,080`, `365`, `720`, or `480` in JSX!

&#x20;  - All 3 tabs (`Live Disruption TV`, `Clinical Dashboard`, `Stress Lab`) MUST read and mutate the \*\*exact same React state (`hospitals`, `manifests`, `activeCrisis`, `solverLogs`, `rescuedTotal`)\*\*.

&#x20;  - \*\*Unified Hospital Codes \& Statuses:\*\* Use the exact same 3-letter codes (`AIM`, `SFD`, `N62`, `MDT`, `APL`, `MAX`, `GTB`, `LNJ`, `RML`, `BLK`, `DWK`, `ROH`, etc.) across the Map, Ledger, and Dispatch Queue (never `H01`, `H04`, `H05`!). If `AIM` or `SFD` is in `Shortage` on the Map, it MUST show `● Shortage` in the `Clinical Dashboard` Ledger!

&#x20;  - \*\*Cross-Tab Live Sync:\*\*

&#x20;    - Toggling a crisis in `Stress Lab` immediately updates hospital deficits, injects emergency road manifests, updates the `Clinical Dashboard` KPIs/Ledger, and draws the new highway routes on `Live Disruption TV`!

&#x20;    - Clicking `Authorize` or `+ Dispatch Courier` in `Clinical Dashboard` (or in the Map drawer) immediately deducts donor stock, increments recipient inbound stock, updates KPI counters, and animates a live moving courier van on the `Live Disruption TV` highway route!



\---



\## 1. TAB 1: `Live Disruption TV` — REAL OSRM STREET-LEVEL HIGHWAY ROUTING \& PIN CLIP FIX (`224447.jpg`)



Replace the fake parabolic dashed curves (`224447.jpg`) with \*\*real Delhi-NCR highway geometry\*\* and fix the sliced top pins (`ROH`, `SDP`, `GTP`):



\### A. Real Street-Level Road Polylines (OSRM API + Instant Multi-Waypoint NCR Highway Fallback)

1\. \*\*Live OSRM Road Geometry Fetcher with Pre-Mapped Highway Waypoints:\*\*

&#x20;  - For every active/pending transfer manifest, fetch real driving geometry from `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full\&geometries=geojson`.

&#x20;  - \*\*Instant Multi-Point NCR Highway Fallback (Zero Latency / Offline Safe):\*\* While OSRM resolves (or if rate-limited), provide realistic 8–12 waypoint road polylines that follow actual Delhi-NCR arterial corridors (DND Flyway across the Yamuna for Noida->AIIMS/Safdarjung, NH-48 for Medanta/Gurugram->Central Delhi, Ring Road \& Vikas Marg for East Delhi->LNJP/GTB).

2\. \*\*Two-Layer Highway Rendering (`GeoJSONSource` / `PathLayer`):\*\*

&#x20;  - \*\*Outer Road Casing:\*\* `width: 6px`, color `#0F172A` (dark slate casing, opacity `0.75`).

&#x20;  - \*\*Inner Traffic Core:\*\* `width: 3.5px`, color `#10B981` (Emerald for `In-Transit` / `FEFO Rescue`) or `#F43F5E` (Crimson for `CRITICAL` emergency transfers).

3\. \*\*Live Moving Courier Van Markers Riding Along the Road Polylines:\*\*

&#x20;  - For every `In-Transit` manifest, interpolate a live `<Marker>` position along its road polyline array using a continuous `requestAnimationFrame` / `100ms` progress tick (`progress = (progress + 0.008) % 1`).

&#x20;  - Render a sleek floating pill marker on the road: `background: #111827; color: #FFFFFF; padding: '3px 8px'; borderRadius: 999; fontSize: 10.5; fontWeight: 700; border: '1.5px solid #10B981'; boxShadow: '0 4px 12px rgba(0,0,0,0.25)'` showing \*\*`🚐 {m.units}u {m.bloodGroup} · {m.etaMin}m`\*\*!



\### B. Fix Top Pin Clipping (`ROH`, `SDP`, `GTP` in `224447.jpg`)

\- In `224447.jpg`, pins near the top edge were cut in half by the top border of the map container.

\- \*\*Fix:\*\* Keep all 25 hospital latitudes strictly between `28.49` and `28.645` (so North Delhi `ROH` and `GTP` have at least `60px` of headroom below the top border) and set initial camera to `longitude: 77.15, latitude: 28.565, zoom: 10.55`.



\### C. 1-Click Instant Dispatch Inside the Right Map Drawer

\- Inside the inline-styled Right Hospital Terminal Pass Drawer, replace the simple button at the bottom with an \*\*Instant 1-Click Express Dispatch Widget\*\*:

&#x20; - Shows auto-matched donor (`Best Match: N62 Fortis Noida · 8u O+ Ready · 16m via DND Flyway`).

&#x20; - Clicking \*\*`⚡ Launch Emergency Courier Now`\*\* triggers a button spring animation (`✓ Van Dispatched on Highway!`), creates the live `In-Transit` road manifest immediately, and starts the moving van marker right on the map without forcing the user to leave the map tab!



\---



\## 2. TAB 2: `Clinical Dashboard` — LINEAR / STRIPE RADAR SPLIT-WORKBENCH (`224458.jpg`–`224518.jpg`)



Eliminate the clunky tab-switching and 3-screen scrolling from `224458.jpg`–`224518.jpg`. Redesign `Clinical Dashboard` into a \*\*Stripe Radar / Linear Operational Split-Workbench\*\* that shows analytics, hospital inventory, and live dispatching seamlessly on one cohesive screen:



\### A. Row 1 — 4-Card Live Reactive Telemetry Ribbon (`display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;`)

Every number MUST be dynamically computed from the shared `hospitals` and `manifests` state (with smooth CSS transition when values change):

1\. \*\*Card 1 (`Network Stock \& Viability`):\*\* Mini 3-color SVG donut (`totalStock` inside) + 3 live rows (`Fresh >72h`, `Reroute <36h`, `O- Trauma Buffer`).

2\. \*\*Card 2 (`FEFO Units Rescued`):\*\* Live counter (`rescuedTotal` units) + 3-segment shelf-life bar + `95.5% Spoilage Reduction vs Siloed FIFO`.

3\. \*\*Card 3 (`Active Highway Couriers`):\*\* Live count of `In-Transit` + `Pending` manifests + Mediso striped barcode progress bar + `Mean Cold-Chain: 22.1°C`.

4\. \*\*Card 4 (`Mesh Solver Efficiency`):\*\* `98.8%` gauge ring + \*\*1-Click `+ Inject Random Demand Spike` micro-button\*\* that visibly perturbs a hospital's demand and triggers an automatic solver rebalance!



\### B. Row 2 — The Split-Screen Operational Workbench (`display: grid; grid-template-columns: 1.45fr 1fr; gap: 18px; align-items: start;`)



\#### Left Column (`1.45fr`): `Live 25-Node Hospital Inventory Matrix` (With Fixed Sticky Header \& Inline 1-Click Dispatch!)

\- \*\*Fix the Sliced Table Header (`224518.jpg`):\*\* Give the `<thead>` `position: sticky; top: 0; zIndex: 10; backgroundColor: '#F8FAFC'; boxShadow: '0 1px 0 #E2E8F0'` inside a clean scrollable table container (`maxHeight: 500, overflowY: 'auto'`) so column headers NEVER get sliced horizontally in half!

\- \*\*Toolbar:\*\* Search input + instant filter pills (`All (25)`, `Shortage`, `<36h Surplus`, `Optimal`) + `Sort: Deficit / Stock`.

\- \*\*1-Line Hospital Rows (`height: 52px; white-space: nowrap`):\*\*

&#x20; - Columns: `Facility (\[Code] + Name)` | `Zone` | `Stock` | `ABO Reserve (\[O+ 34u] \[O- 8u])` | `Live Status Pill` | `Quick Actions (`Map ↗` | `⚡ Dispatch`)`.

\- \*\*Inline 1-Click Express Dispatch Popover/Row Expansion:\*\*

&#x20; - When the user clicks \*\*`⚡ Dispatch`\*\* on ANY hospital row in the table, expand a sleek 1-line emerald action strip directly beneath that row:

&#x20;   `Auto-Matched Donor: \[N62] Fortis Noida ──► \[AIM] AIIMS Trauma | Select Blood: \[O-] \[O+] \[A+] \[B+] | Qty: \[4u] \[8u] | \[🚀 Confirm \& Launch Van (16m ETA)]`

&#x20; - Clicking `Confirm \& Launch Van` dispatches the courier with an animated checkmark toast, updates the hospital's row status immediately, and adds the van to the Right Dispatch Dock and Map!



\#### Right Column (`1fr`): `Sticky Autonomous Cold-Chain Dispatch Dock` (Always Visible Next to the Ledger!)

\- \*\*Fix the Double Lightning Bolt (`224504.png`):\*\* Ensure the top-right batch button has only ONE icon: `<Zap size={13} /> Authorize All Pending ({pendingCount})`.

\- \*\*Compact 1-Card Express Matchmaker at Top of Dock:\*\*

&#x20; - Clean 2-row grid (`Recipient Select` + `Blood Group Pills` + `Qty Pills` + full-width `#111827` \*\*`+ Dispatch Highway Courier`\*\* button with spring press animation).

\- \*\*Live Highway Transit Cards (Showing Active \& Pending Couriers with Animated Progress Tracks):\*\*

&#x20; - Each manifest card (`padding: 12px 14px; borderRadius: 12; border: '1px solid #E2E8F0'; background: '#FFFFFF'`) displays:

&#x20;   - Top row: `#TX-1041` + Highway Corridor tag (`via DND Flyway · 14.2 km`) + Cold-Chain pill (`● 22.1°C · 19h left`).

&#x20;   - Middle row: \*\*`\[N62] Fortis Noida`\*\* $\\longrightarrow$ \*\*Animated Highway Progress Bar with moving `🚐` icon\*\* $\\longrightarrow$ \*\*`\[AIM] AIIMS Trauma`\*\* + Cargo Badge (`8u O+ PLT`).

&#x20;   - Bottom/Right action: Single-click \*\*`Authorize Launch →`\*\* (if `Pending`) or \*\*`Confirm Arrival ✓`\*\* (if `In-Transit` — clicking it transfers the units into the recipient hospital's stock and flashes an emerald completion animation!).



\---



\## 3. TAB 3: `Stress Lab` — VERCEL / PALANTIR "25-NODE LIVE RADAR \& CHAOS WORKBENCH" (`224524.jpg`)



Delete the toy 7-circle diagram and the overpowering green `Baseline Active` box from `224524.jpg`!

Build a \*\*Vercel Firewall / Palantir Foundry Chaos Engineering Workbench\*\* (`height: calc(100vh - 60px); padding: '20px 28px'; display: 'flex'; flexDirection: 'column'; gap: 18; backgroundColor: '#F8FAFC'; overflow: 'hidden'`):



\### A. Row 1 — 3 Tactile Hardware-Toggle Crisis Cards (`display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;`)

\- \*\*ONLY 3 Cards in the Top Grid\*\* (Put a compact `↺ Reset to Steady State` pill button inside the section header above them—do NOT render a giant 4th card!).

\- Each card has an \*\*Apple/Linear-style animated sliding toggle switch\*\* (`width: 44, height: 24, borderRadius: 999`) in the top-right corner that smoothly slides and turns `#E11D48` / `#15997A` when toggled ON:

&#x20; 1. \*\*`01 · East Delhi Dengue Hemorrhagic Surge`\*\* (`+340% Platelet Demand at GTB, LNJP \& AIIMS`)

&#x20; 2. \*\*`02 · NH-48 Expressway Multi-Vehicle Pile-Up`\*\* (`Level-1 O-Negative \& O+ Hemorrhage Drain at Medanta \& Artemis`)

&#x20; 3. \*\*`03 · Safdarjung 28°C Agitator Cooling Failure`\*\* (`42u Platelets Require <2h Emergency Lateral Evacuation`)



\### B. Row 2 — The Split Live Chaos Telemetry Stage (`flex: 1; display: grid; grid-template-columns: 1.25fr 1fr; gap: 18px; minHeight: 0;`)



\#### Left Card (`1.25fr`): `Live 25-Node NCR Bio-Radar Matrix \& Solver Execution Stream`

\- \*\*Top Header:\*\* Live status pill (`● SOLVER SWEEP ACTIVE · 7,840 ARCS EVALUATED IN 14.2ms`) + \*\*`View Active Emergency Routes on Map →`\*\* button.

\- \*\*Center — The 5x5 Live Hospital Radar Grid (All 25 Delhi-NCR Hospitals!):\*\*

&#x20; - `display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8`

&#x20; - Each of the 25 hospitals renders as a tactile telemetry micro-tile (`padding: '8px 10px', borderRadius: 10, border: '1px solid', transition: 'all 0.3s ease'`) showing:

&#x20;   - Top row: \*\*`{h.code}`\*\* (`fontWeight: 800, fontSize: 12`) + Status Dot (`●` Crimson pulsing if hit by crisis, Sky/Emerald if acting as an active OR-Tools Donor, Slate/Mint if nominal).

&#x20;   - Bottom row: Live Stock (`{total}u`) + Net Delta badge (`-34u SURGE` in crimson or `⚡ +12u SENT` in emerald!).

&#x20; - \*\*Animated Radar Scan Line \& SVG Vector Overlay:\*\* When a crisis is toggled ON, an emerald/crimson radar sweep line animates across the 5x5 grid (`@keyframes radarSweep`), highlighting the exact donor tiles (`N62`, `MDT`, `APL`, `MAX`) pumping units into the crisis tiles (`GTB`, `LNJ`, `AIM`)!

\- \*\*Bottom — Live OR-Tools Solver Terminal Stream (`backgroundColor: '#0F172A', color: '#E2E8F0', borderRadius: 12, padding: '10px 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, height: 84, overflowY: 'auto'`):\*\*

&#x20; - Prints live timestamped solver actions as you click each scenario:

&#x20;   - `\[14.2ms] CRITICAL\_SHOCK: East Delhi Dengue (+340% demand at GTB, LNJ, AIM)`

&#x20;   - `\[14.6ms] FEFO\_MATCH: Dispatched 12u O+ from \[N62] Fortis Noida -> \[GTB] via NH-24 (14m ETA)`

&#x20;   - `\[15.1ms] ABO\_SHIELD: Preserved 92u O- universal buffer; routed 14u A+ from \[APL] -> \[LNJ]`



\#### Right Card (`1fr`): `Live Crisis Impact Telemetry \& Generated Highway Dispatches`

1\. \*\*Top 3 Dynamic Impact Tiles (`gridTemplateColumns: 'repeat(3, 1fr)', gap: 12`):\*\*

&#x20;  - `Stockouts Prevented`: \*\*`0 hrs`\*\* (`vs {siloStockouts}h Siloed`)

&#x20;  - `Units Rerouted Live`: \*\*`+{reroutedUnits} u`\*\* (`₹{rupeesSaved}L Saved`)

&#x20;  - `O- Trauma Buffer`: \*\*`100%`\*\* (`{oNegCount}u Intact`)

2\. \*\*Middle — Animated Silo Collapse vs. Plexus Mesh Resilience Bars:\*\*

&#x20;  - Smooth CSS width transitions (`transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)'`) showing how Siloed Hospitals collapse (`78% Unmet Demand`) while Plexus Mesh absorbs the shock (`99.4% Fulfilled`).

3\. \*\*Bottom — Live Generated Highway Couriers (Synced with Global Manifests!):\*\*

&#x20;  - Shows the 4 emergency highway dispatches just injected into the global store, each with a highway badge (`via DND Flyway`, `via NH-48`, `via Ring Road`) and a 1-click \*\*`Track on Map ↗`\*\* button!



\---



\## 4. LANDING PAGE (`224435.jpg` \& `224441.jpg`) — KEEP GLOSSY SPHERES \& DNA HELIX + ADD CURSOR PULL PHYSICS \& FIX TEXT OVERLAP



Look at `224435.jpg` and `224441.jpg`:

1\. \*\*KEEP the Exact Glossy Spheres, Beaded DNA Double-Helix, and Burgundy-to-Peach Gradient Palette!\*\*

&#x20;  - Revert/ensure `Biologics3DScene.tsx` uses the smooth glossy `SphereGeometry` cells and the beaded DNA double-helix with the exact same lighting and pink/crimson materials shown in `224435.jpg`.

2\. \*\*Fix the Left Sphere Overlapping the Text (`An intercept` / `2,200+`):\*\*

&#x20;  - Move the two left-floating spheres (`x < -1.0`) over to the right/background (`x >= 0.4`) so the left 45% of the screen (`An intercept network of vital importance` and `2,200+ platelet units tracked`) has \*\*zero spheres floating behind or over the text\*\*!

3\. \*\*Add Silky Interactive Cursor Pull \& Drag Spring Physics (`Raycaster` + Hooke's Law Spring):\*\*

&#x20;  - Make every sphere and the DNA helix physically responsive to the user's cursor:

&#x20;    - \*\*Magnetic Cursor Pull:\*\* As the mouse moves across the canvas, calculate the 3D mouse world position and apply a smooth magnetic attraction/tilt (`lerp` factor `0.08`) to nearby spheres and the DNA helix so they organically follow and react to the cursor!

&#x20;    - \*\*Click-and-Drag Sling Physics:\*\* Using Three.js `Raycaster` on `pointerdown` / `pointermove` / `pointerup`, let the user \*\*grab and pull any sphere or the DNA helix with their cursor\*\*, and when released, snap it smoothly back to its home orbit using damped spring physics (`vel.add((homePos - pos) \* 0.08); vel.multiplyScalar(0.88); pos.add(vel)`)!

