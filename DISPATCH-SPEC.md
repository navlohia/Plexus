# PLEXUS — V3 UNIFIED STORE, REALISTIC STUDIO VEHICLES & CLEAN DISPATCH SPEC (`DISPATCH-SPEC.md`)

> **CRITICAL DIRECTIVE:** This specification upgrades the Dispatch Dashboard (`230822.jpg` – `230911.png`) to match the exact visual polish of the `Moveon` reference (`232739_3.jpg`) and unifies live state across `Live Disruption TV`, `Dispatch Dashboard`, and `Stress Lab`.
> **STRICT GIT BAN:** NEVER run `git add`, `git commit`, `git push`, or any git commands.
> **STRICT TERMINOLOGY BAN:** NEVER use the words `"Ambulance"`, `"Box Ambulance"`, `"Bike Ambulance"`, `"Rapido"`, `"FEFO Match"`, or emoji icons (`🚑`, `🏍️`).

---

## SECTION 1: UNIFIED GLOBAL STATE STORE (`src/context/PlexusStore.tsx`)

### 1.1 Single Source of Truth Across All 3 Workspaces
Create (or upgrade) a shared React Context (`PlexusStoreProvider` & `usePlexusStore`) wrapping the entire workspace (`Live Disruption TV`, `Dispatch`, `Stress Lab`) so ZERO data is hardcoded locally in individual tabs:
- **`hospitals` (25 NCR Nodes):** Holds live `netBalance`, `unitsOnHand`, `expiringWithin36h`, `status` (`critical` | `warning` | `optimal`), `zone` (`Central`, `South`, `North-East`, `West`, `Noida`, `Gurugram`, `Faridabad`, `Ghaziabad`), and `[lat, lng]`.
- **`inTransitOrders` (Live Active Fleet Array):**
  - Default 5 active orders (`#TX-0412`, `#TX-1041`, `#TX-1042`, `#TX-1048`, `#TX-1049`).
  - Powers **both** the `In transit` table, the **Row 3 Horizontal Scrollable Fleet Carousel**, AND the moving highway corridors on `Live Disruption TV`.
- **`proposedRequests` (Incoming Hospital Blood Requests):**
  - Default 4 requests (`#REQ-901` AIM `12u O-`, `#REQ-902` GTB `6u B+`, `#REQ-903` LNJ `10u A+`, `#REQ-904` SFD `4u AB+`).
- **`activeVehicleId`:** Controls which vehicle card is selected in the Row 3 Carousel and displayed in the Row 2 Center Stage.

### 1.2 Shared Actions (`dispatchRequest` & `triggerOutbreak`)
1. **`dispatchRequest(reqId, sourceCode, targetCode, units)`:**
   - Generates a new order (e.g., `#TX-0419`), assigns `BIKE-02` if `units <= 6` or `VAN-05` if `units > 6`, and **prepends it to `inTransitOrders[0]`**.
   - Removes `reqId` from `proposedRequests`.
   - Sets `activeVehicleId` to the new `#TX-0419` order and smoothly scrolls the Row 3 horizontal carousel to `left: 0` so the new vehicle card appears first!
   - Updates `hospitals` balances (`sourceCode` stock `-units`, `targetCode` deficit `+units`) and increments `totalUnitsInTransit` (`64u` $\rightarrow$ `64 + units`) across both `Dispatch` and `Live Disruption TV`.
2. **`triggerOutbreak(scenarioId)` (Called from `Stress Lab`):**
   - When the user activates an outbreak simulation in `Stress Lab` (e.g., *East Delhi Dengue Surge* or *NH-48 Highway Mass Casualty*):
     - Immediately mutates `hospitals` in the global store (plunging `GTB`, `LNJ`, `AIM`, or `MDT` into severe deficits).
     - Injects 3 urgent new `#REQ-90X` items at the top of `proposedRequests` in the `Dispatch` tab.
     - Updates the `Coverage · NCR` zone colors and `Expiry Horizon` counters in real time.

---

## SECTION 2: PHOTOREALISTIC STUDIO VEHICLE RENDERS + X-RAY OVERLAY

### 2.1 Why Previous SVGs Failed & How to Fix Them
Look at `Screenshot 230911.png`—hand-coded circle/stick-art looks like a cartoon tricycle. We need true automotive studio realism matching `Moveon` (`232739_3.jpg`):
- **Option A (Generate & Embed High-Res Studio Cutout Assets + Live SVG X-Ray Overlay):**
  - Use your image generation tool (or high-precision multi-mesh WebGL/Canvas studio shader) to create two crisp, transparent-background side-profile studio renders facing LEFT on a soft floor shadow:
    1. **Heavy Commercial Box Van (`VAN`):** Photorealistic white aerodynamic box truck/van in side profile (matching the exact angle, lighting, cab proportions, dark glass windshield, and 3D alloy wheels of the `Moveon` truck in `232739_3.jpg`).
    2. **Indian Delivery Motorcycle (`BIKE`):** Photorealistic white/silver commuter motorcycle (Hero/Honda Zomato-rider bike proportions) in side profile facing left—with telescopic front forks, sculpted fuel tank, rider saddle, alloy wheels, and a **compact square insulated delivery box mounted on the rear luggage rack behind the seat** (NEVER a stretched 3-wheeler or cart!).
- **The Interactive Purple X-Ray Cargo Overlay (`#C084FC` / `#9333EA`):**
  - Position an interactive SVG/CSS **Translucent Purple Cargo Cube Grid** (`rgba(192, 132, 252, 0.42)` fill, `1px solid #9333EA` wireframe borders, subtle inner depth) aligned strictly inside the rectangular cargo box of the Van (`6×4` grid) and inside the square rear delivery top-box of the Bike (`3×2` grid).
  - Highlight `N` cubes dynamically matching the order's exact `units` (`12u`, `6u`, `8u`).

### 2.2 Dynamic Sideways-Scrolling Fleet Carousel (`Row 3`)
- Render Row 3 as a smooth horizontal scroll container (`display: flex; gap: 12px; overflow-x: auto; scroll-behavior: smooth; padding: 4px 2px;`) mapping over **all items in `inTransitOrders`**.
- Each card (`min-width: 225px`, `height: 74px`, `flex-shrink: 0`) shows:
  - Left: `#TX-0412` (`13px` bold), `Apheresis · O- · 12u` (`11px` `#71717A`), `APL → LNJ` (`10px` `#A1A1AA`).
  - Right: Miniature side-profile render of that order's exact vehicle (`VAN` or `BIKE`), with the purple X-Ray cargo window glowing on the currently active card!
- When a new delivery is assigned via the Dispatch Modal, prepend the new card (`#TX-0419`) into this horizontal carousel so the user sees the new Van or Bike card appear and slide into the active slot!

---

## SECTION 3: DE-CLUTTERED `IN TRANSIT` TABLE & LINEAR-STYLE ASSIGN MODAL

### 3.1 Clean 6-Column `In Transit` Table (Matching `Moveon` `232739_3.jpg`)
Fix the visual clutter in `Screenshot 230841.png`:
1. **DELETE the 7th Column (`Map →`):** Remove the `Map →` text column completely. (Clicking a row selects that vehicle in the center stage; double-clicking or clicking a subtle icon opens the map).
2. **One Clean Element Per Cell (No Side-by-Side Crammed Pills):**
   - **Col 1 (`Order ID`):** `#TX-0412` (`12px` bold `#18181B`) — move `12u O-` into a clean subtle sub-label or tooltip instead of a purple pill next to the ID.
   - **Col 2 (`Assigned courier`):** `Amit Sharma` (`12px` `#18181B`) — remove the grey `VAN-02` box next to the name.
   - **Col 3 (`Pickup`):** Borderless `<HospitalCodeBadge code="APL" />` (`● APL` with **NO grey rectangular box background**—just a crisp 8px colored circle dot + bold `APL` text, with the dark hover tooltip showing `"Indraprastha Apollo · South Delhi"`).
   - **Col 4 (`Delivery`):** Borderless `<HospitalCodeBadge code="LNJ" />` (`● LNJ` with **NO grey box background** + hover tooltip).
   - **Col 5 (`Est. delivery`):** `15:58` (`12px` `#18181B`, `tabular-nums`).
   - **Col 6 (`Status`):** Clean Moveon status pill (`In Transit` in `#BBF7D0`/`#15803D`, `Picked Up` in `#E9D5FF`/`#7E22CE`, `Alert` in `#FDE68A`/`#B45309`).

### 3.2 High-Craft `Assign` Dispatch Modal (Fixing `Screenshot 230900.png`)
Upgrade the centered Dispatch Modal so it looks like a sleek Linear / Stripe command dialog:
1. **Clean Top Header:**
   - Left: `Assign Transfer` eyebrow (`10px` uppercase `#8E929F`) + `#REQ-901 · AIM` (`18px` bold) + `12u O- Apheresis` pill (`#FEE2E2` / `#B91C1C`).
   - Right: Circular `✕` button.
2. **3-Column Source Hub Selector Cards:**
   - Each card shows:
     - Top: `● N62` (with hover tooltip) | `14 min` pill
     - Middle: **`28u`** (`18px` bold `#18181B`) `available`
     - Bottom: Thin `3px` progress bar showing stock ratio (`#A855F7` on selected card, `#E4E4E7` on unselected).
3. **Refined Quantity & Carrier Bar (No Toy Squares, No Emoji):**
   - **DELETE** the 12 tiny purple squares (`▪▪▪▪`) and **DELETE** the `🚑` emoji from `230900.png`!
   - Left side: Clean tactile stepper (`[ - ]   12 units   [ + ]`) with a smooth continuous progress bar (`50% carrier capacity`).
   - Right side: Clean architectural carrier badge with a miniature monochrome SVG silhouette of the Van or Bike:
     - For `1u – 6u`: **`BIKE-02 · 2-Wheeler Carrier`**
     - For `7u – 24u`: **`VAN-04 · Isothermal Carrier`**
4. **Primary Action Button:**
   - `Confirm & Dispatch 12u · N62 → AIM` (`height: 46px`, `#18181B` background, `#FFFFFF` text, `border-radius: 12px`).

---

## SECTION 4: AUTHENTIC GEOGRAPHIC `COVERAGE · NCR` MINI-MAP

### 4.1 Replace the Cartoon Pie-Chart Blobs (`230833.jpg`)
Delete the ugly hand-drawn bezier blobs in `Coverage · NCR`. Replace them with an **authentic cartographic mini-map** using one of these two exact methods:
- **Method A (Preferred — Locked Mini Carto/MapLibre Choropleth Canvas):**
  - Mount a lightweight, non-interactive (`dragPan: false, scrollZoom: false, zoomControl: false, attributionControl: false`) MapLibre / Leaflet canvas locked to `[77.18, 28.58]` (`zoom: 8.8`) using the ultra-clean light Positron basemap, overlaid with 6 translucent GeoJSON zone polygons (`Central Delhi` `#C084FC`, `South Delhi` `#334155`, `East/North-East` `#FDBA74`, `Noida` `#A855F7`, `Gurugram` `#FDE68A`, `West/North` `#CBD5E1`) and the 25 hospital dots!
- **Method B (Exact GeoJSON Coordinate Projection):**
  - Project the real multi-point GeoJSON administrative coordinates of NCT Delhi, Gurugram, Noida, Faridabad, and Ghaziabad (minimum 40–60 vertices per polygon with realistic jagged municipal borders + the Yamuna River path) into the SVG viewport, colored in Moveon's exact pastel palette (`#C084FC`, `#FDBA74`, `#FDE68A`, `#334155`, `#E4E4E7`) with the dark floating tooltip pill (`Central NCR · 64u in transit`) that updates on zone hover and reacts live to `PlexusStore` updates.