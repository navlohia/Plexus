# HOSPITAL_UI_SPEC_V2.md — "Ledger"
Complete visual and interaction redesign of the hospital portal, plus the dispatch Transfer-orders table.

> This file REPLACES the visual sections (2–11) of `HOSPITAL_UI_SPEC.md`. Section 1 of that file (data and logic fixes) still applies. Behavior and the data model stay as in `PORTAL_SPEC.md`. Motion rules and the never-do list stay as in `LANDING_SPEC.md` (sections 3 and 16) unless this file says otherwise.
> **Read this whole file before touching any code. Every rule here is testable; the checks are in section 15.**

---

## 0. Why a rebuild, and the direction

The current portal reads as AI-generated because it is built from defaults: a rounded geometric sans, uniform 24 px cards on a tinted page, stat tiles, emoji icons, red pills holding whole sentences, green solid buttons, mono uppercase labels, and explanatory text inside boxes. Users read this as "generic, template-y, unfinished".

**Direction: "Ledger."** Copy the structure that the best operational tools share, and add one original idea:
- **Linear:** content on the page divided by hairlines (not boxed cards), compact text tabs, rows with status glyphs, a properties list for details, a `⌘K` palette, keyboard-first, calm color.
- **Stripe:** a near-monochrome UI where color only marks state, tabular figures on every number, progressive density (spacious summary on top, compact rows below).
- **Flighty:** a state-aware headline that says what matters now, in plain words, and tells you why when something is late.
- **Original: the Hour Rail.** The product is about a 120-hour clock, so time is the one visual motif: a horizontal time axis that appears as the Today timeline, the per-group expiry strip in Stock, and the progress line in Tracking.

**Principles**
1. Say it in a sentence, then show the evidence. No stat-tile rows.
2. One page background. Boxes only for sheets and popovers. Everything else is rows, hairlines and whitespace.
3. Color means state. Status is a dot or a glyph plus plain text. Never a filled pill, never a sentence in a pill.
4. A hierarchy of size and weight, not a uniform everything.
5. Numbers are right-aligned, tabular, and never decorative.
6. Terse words. No explanations inside the UI.
7. Safety first: a blood group is never ambiguous (section 14).

---

## 1. Hard bans and requirements

**BANNED (any occurrence fails the task)**
- Emoji anywhere in the UI or source strings (including ✓ ✗ ⚠ 🚨 ✏️ 🛡️). Use the icon set.
- Filled status pills, outlined red pills, and any alert banner or box that contains a sentence.
- Cards with the same radius and shadow repeated across a page; "card in card"; dashed boxes; stat-tile rows.
- Gradients, glass, blur, glow, lavender or blue anywhere in the hospital portal.
- Inter, Geist, Roboto, system-ui or the current rounded geometric sans as the UI face.
- Mono for anything except IDs and hospital codes (never for blood groups, numbers in sentences, labels).
- Letter-spaced uppercase labels.
- Developer or marketing text in the UI ("48px stepper", "Autonomous FEFO mesh", "Max 3 priority actions · Auto-expires", "Automated Platelet Logistics Mesh").
- Centered empty states with an icon in a circle.
- A weight above 600 in the UI face.

**REQUIRED**
- A real type pairing (section 2), tabular numerals, one icon set (Lucide, 16 px, 1.5 stroke), a radius hierarchy (4 / 6 / 10), at most two shadows (popover, sheet).
- Text tabs with an underline, rows with hover states, a properties list for details, `⌘K`.

---

## 2. Tokens (create `src/ui/ledger/tokens.css` exactly like this, then tune by eye only within ±6% lightness)

```css
:root {
  /* canvas and ink: warm neutral, no tint on the page */
  --canvas:#FCFBF8; --surface:#F6F4EF; --hairline:#E7E4DC; --hairline-strong:#D9D5CA;
  --ink:#14171C; --ink-2:#4A4F57; --ink-3:#7B8088; --ink-4:#A7AAAF;

  /* one action color: ink. Green is a STATE color, not a button color. */
  --primary:#14171C; --primary-text:#FFFFFF; --primary-hover:#2A2F37;

  /* state colors: dots, glyphs, numbers. Never fills except the two soft tints below. */
  --good:#1C8A68; --warn:#B86F10; --bad:#C42B3C;
  --warn-tint:rgba(184,111,16,.07); --bad-tint:rgba(196,43,60,.06);

  /* type (final pair chosen in the gallery test, see section 2.1) */
  --font-ui:"Instrument Sans", "Hanken Grotesk", sans-serif;
  --font-display:"Instrument Serif", "Fraunces", Georgia, serif;
  --font-mono:"JetBrains Mono", ui-monospace, monospace;

  /* modular scale 1.25 from 14 (deliberately not the 12/14/16/18/24/30/36 default stack) */
  --t12:12px; --t14:14px; --t17:17px; --t22:22px; --t27:27px; --t34:34px;
  --t42:42px; --t53:53px; --t66:66px;

  /* radius hierarchy */
  --r-sm:4px; --r-md:6px; --r-lg:10px;

  /* elevation: overlays only */
  --shadow-pop:0 1px 2px rgba(20,23,28,.06), 0 12px 32px rgba(20,23,28,.10);
  --shadow-sheet:-1px 0 0 var(--hairline), -24px 0 48px rgba(20,23,28,.08);

  /* layout */
  --content-max:1120px; --gutter:32px; --gutter-m:16px; --row-h:44px; --topbar-h:52px;
}
```

**Rules:** weights 400 / 500 / 600 only. Letter-spacing −0.02em on sizes ≥ 27 px. Line-height 1.4 for body, 1.1 for display. `font-variant-numeric: tabular-nums` on every number. The primary button is ink on canvas; there is no green button in the portal. Page background is `--canvas` everywhere (no tinted page, no floating cards).

### 2.1 Type pairing test (do this in the gallery)
Candidates: **A** = Instrument Sans (UI) + Instrument Serif (display); **B** = Hanken Grotesk (UI) + Fraunces (display). Load via `@fontsource` packages, self-hosted. Render "2u O− arrived · 15:58 · 12u O− · 0.0 d · 0 1 2 3 4 5 6 7 8 9" in both and verify: (a) `tabular-nums` really changes figure widths, (b) the capital O and the digit 0 are clearly different, (c) the display face has lining figures. Choose the first pair that passes all three, report which, and set `--font-ui` and `--font-display` accordingly. Display is used ONLY for the page sentence (≥ 42 px) and large figures; everything else is the UI face.

---

## 3. Primitives (`src/ui/ledger/`)

- **TextTabs:** 14/500 text, ink-3 inactive, ink active with a 2 px underline, 28 px gap, optional count in ink-3. No pill background.
- **Row:** 44 px high, no box, 1 px bottom hairline, hover `--surface`, focus ring 2 px ink at 2 px offset, chevron appears on hover. Columns right-align numbers.
- **StatusDot:** 8 px circle (good / warn / bad / hollow ink-3) + 13/400 text in ink-2. Example: `● On time`, `● Delayed +8 min`, `● Alert`, `○ Packed`.
- **StageGlyph:** 16 px circular progress: empty = requested, quarter = source found, half = packed, three-quarter = on the way, filled with a tick = delivered. Delayed uses `--warn`, alert uses `--bad`.
- **Properties:** label (13, ink-3, 140 px) and value (14, ink) rows with hairlines; used instead of boxed detail cards.
- **Sheet:** right side, 440 px, radius 10 on the left corners, `--shadow-sheet`, 56 px header, scrolling body with `padding-bottom: 104px`, sticky 72 px footer holding a one-line summary and the primary button. The footer must never overlap content.
- **Popover / tooltip:** radius 6, `--shadow-pop`, 12/400, max 240 px.
- **Button:** primary (ink fill, 36 px high, radius 6, 14/500), secondary (hairline-strong border), text button (ink-2, underline on hover). One primary per screen region.
- **Kbd:** 12 px mono keycap for shortcut hints.
- **BloodGroup:** see section 14.
- **Sentence:** the page headline: display face 53/56 (42/46 on tablet, 34/38 on mobile), ink, max 9 words, followed by one 17/24 ink-2 line.
- **EmptyState:** left-aligned text only: one line + one action + a ghost preview of what will appear. No icon circles.

---

## 4. The signature: Hour Rail, Expiry Strip, Stage glyph

### 4.1 Hour Rail (Today, Tracking)
A full-width horizontal time axis, 72 px high.
- 1 px `--hairline-strong` axis, ticks every 6 h (Today, 36 h window) with clock labels in 12/400 ink-3 (e.g. `03:00 09:00 15:00 21:00`), a date label when it crosses midnight. "Now" is a 6 px ink dot at the left with the label `Now`.
- **Markers (3 kinds only):**
  - Arrival: the small vehicle thumbnail (32×16, from `VehicleArt` thumb) above the axis, a 1 px stem to the axis, label below: time `15:58` (14/600 tabular) and sub `12u O− · Medanta` (12/400 ink-3).
  - Expiry: a 6×10 `--bad` tick on the axis, label `6u expire` + hours.
  - Deadline: a hollow ink circle, label `REQ-901 due`.
- Labels avoid collisions by using two vertical lanes. Hover a marker shows a popover with details; click opens the item.
- No zone shading on the Today rail. No moving elements. Updates every 15 s with a 240 ms ease.
- **Tracking variant:** the axis runs from pickup to ETA with checkpoints (Packed, Picked up, In transit, Arrived), the elapsed portion drawn in ink, the rest in hairline-strong, a small ink dot at "now", and the ETA range as a soft bracket. No vehicle dot moves; the dot jumps every 15 s.

### 4.2 Expiry Strip (Stock)
One row per blood group, all sharing the same 0–120 h axis.
- Row height 56. Left: group (`BloodGroup`, 17/600) and `par 9` (13/400 ink-3, click edits in a popover). Middle: a strip up to 560 px wide, 24 bins of 5 h; bar height = units ÷ the largest bin across all groups × 28 px (min 2 px when units > 0). Bar colors: bins under 12 h `--bad` at 70%, 12–36 h `--warn` at 70%, beyond that `--ink-3` at 40%. Behind the bars, zone bands: 0–12 h `--bad-tint`, 12–36 h `--warn-tint`. Right: total units (17/600 tabular) and cover `6.0 d` (14/400 ink-2) or `—`.
- A shared axis above the first row with labels `0`, `12 h`, `36 h`, `72 h`, `120 h`.
- A group with low cover or a shortage shows a `--bad` dot before the group name and the cover value in `--bad`. No banner, no pill, no extra sentence.
- Hover a bar: popover "6u · 28–33 h left". Click opens the lot list for that bin.
- Product toggle as TextTabs: `Apheresis (SDP)` / `RDP (random donor)`.

---

## 5. Shell

```
┌ top bar 52 px, canvas, 1px bottom hairline ───────────────────────────────────────┐
│ ◧ AIIMS Trauma ▾     Today  Requests  Stock               ⌘K    ◔    [Request platelets] │
└───────────────────────────────────────────────────────────────────────────────────┘
```
- Left: a 20 px logomark and the hospital name as a text button with a chevron (opens the hospital menu: demo hospital switcher in demo mode, sound toggle, sign out, "Simulated data"). No code badge, no chip.
- Center-left: TextTabs (Today, Requests, Stock).
- Right: a `⌘K` hint button (Kbd), the bell as an icon button (a 6 px `--bad` dot when there is an item, no number badge), and the one primary button "Request platelets".
- Content: max width 1120, left aligned, 32 px gutters (16 px on mobile). The page sits on `--canvas` with no cards.
- Mobile: top bar with logomark, hospital name, bell; a bottom bar with three text-labeled Lucide icons (Today, Requests, Stock), 56 px high, hairline top border; a primary "Request" button replaces the bell on Requests.

---

## 6. Today

```
Tue 10 Nov · 03:08 IST                                          (14, ink-3)
2u O− arrived.                                                  (Sentence, display 53/56)
Confirm receipt for TX-1138 from Medanta Hub.                   (17/24, ink-2)   [Confirm receipt]
● O− cover is 0.0 d · Request platelets →                       (14, ink-2; dot --bad)

Next 36 hours                                                   (14/600)
 ●──────────────▲──────────────────────────|─────────
 Now            15:58 · 12u O− · Medanta    6u expire 28 h        ← Hour Rail

In motion  2                         │  Stock                          Open →
 ◔ TX-1138  RML → AIM  2u O− Apheresis   03:09  ● On time │  O−  0u  ▁▁▁ —
 ◑ TX-0412  MDT → AIM  12u O− Apheresis  03:41  ● On time │  O+  26u ▂▃▅ 6.0 d
 ...                                                      │  ...
```
- **The Sentence is state-aware** (driven by `attention`, see `HOSPITAL_UI_SPEC.md` section 1.1). States: arrived ("2u O− arrived."), inbound ("12u arriving 15:58."), shortage ("You're 8u short."), at risk ("6u expire in 9 h."), stale ("Stock not counted since 18:10."), steady ("All steady."). One inline action per state, as a primary button only if it is the next step (Confirm receipt, Request platelets), otherwise a text link.
- Under the Sentence: at most 2 secondary "also" lines, each `● text →` with a state dot (no pills, no boxes).
- The **Hour Rail** spans the content width below it. Empty state: the axis with `Now` and the line "Nothing arriving in the next 36 hours." plus the text link "Request platelets".
- **In motion** (left, 7 columns): Row list, max 5, then "All requests →". Row: StageGlyph, `TX-id` (mono 13 ink-3), route, product and units, a right-aligned tabular ETA, StatusDot + text. Times earlier than "now" must show a date label ("Yesterday 15:33").
- **Stock** (right, 5 columns): a compact Expiry Strip list (8 rows, no axis labels except the first), "Open →" to Stock.
- No stat tiles, no boxes, no net-position card. The net position is mentioned only inside the Sentence or the "also" lines when it matters (for example "Net +23u over 36 h" as ink-2 text on the Stock link).

---

## 7. Requests and the request sheet

**Requests page:** TextTabs `Active 2 · Completed 14`. Rows grouped by status with Linear-style group headers (`In transit 2`, `Searching 1`, collapsible, 13/600 ink-2 with a hairline). Row: StageGlyph, `REQ-901` (mono), `12u O− Apheresis`, urgency in ink-3 ("within 3 h"), right-aligned ETA, StatusDot. Click opens Tracking. Completed rows show the outcome in plain text ("Delivered 12u · on time"). Empty: "No active requests." + text link + a ghost row.

**Request sheet** (`Sheet`, 440 px; full-height bottom sheet on mobile):
1. Header: "Request platelets" and a close icon button.
2. Product: two segmented text buttons, `Apheresis (SDP)` / `RDP (random donor)`; helper 13/ink-3 "1 unit ≈ 1 adult dose (≈ 4–6 RDP)".
3. Blood group: 4×2 grid of 56 px buttons, 17/600 `BloodGroup`; selected = 1.5 px ink border and `--surface` fill.
4. Units: a stepper (36 px icon buttons) with the number in 22/600 tabular and presets as text buttons `1 · 2 · 4 · 6`; helper "≈ 2 adult doses · max 12u".
5. Needed within: four radio rows with the window on the right: `Immediate  < 1 h`, `Urgent  < 3 h`, `Same day  < 8 h`, `Planned  < 24 h`.
6. "More options" as a text disclosure (ABO substitutes, partial OK, contact, indication, case reference).
7. Footer (sticky, never overlapping): a one-line summary "2u O− Apheresis · within 3 h" and under it the live match line "Best source Medanta · 14 min · arrives with 29 h left" (or an honest "No source can reach you in this window"), and the primary button "Send request".
- Fix the current bug where the sticky button covers "Needed within". Body scrolls above the footer with 104 px bottom padding.

---

## 8. Tracking

```
On the way.                                       (Sentence)
Arrives 15:52–16:04 · est. · 29 h left on arrival (17/24, ink-2)

 ●─────────────●─────────────◔────────────○
 Packed 15:31  Picked up 15:36  In transit      Arrived 15:58      ← Hour Rail (tracking variant)

Properties                                        │  Route map (static, 7 col)
 Source        Medanta Hub (MDT)                  │
 Units         12u O− Apheresis                   │
 Vehicle       Cold-chain van · VAN-02            │
 Courier       Rajesh                             │
 Temperature   22.0 °C · seal intact              │
 Shelf life    29 h on arrival                    │
 Lots          3 lots · oldest expires 31 h       │
```
- The Sentence reflects state. A delay says why when known: "Delayed 8 min." + "Heavy traffic on the route." An alert: "Temperature 24.6 °C for 6 min." + "Clinical review before use." Partial: "8 of 12u assigned." + "Looking for 4u."
- Details are a Properties list (no boxes). The static map uses the app's map style with the route and the elapsed portion drawn darker; **no moving dot**.
- Arrived: the Sentence becomes "Arrived." with one primary button "Confirm receipt" opening the Receive drawer (behavior per `PORTAL_SPEC.md` 3.4: units received, seal, temperature, labels, result).
- Mobile: the map on top (55%) with a peeking bottom sheet holding the Sentence and the rail.

---

## 9. Stock and the update drawer

```
Stock                                      Counted 02:30 by in-charge     [Update stock]
Usable now                                                                (14, ink-3)
26u                                                                       (display 66/68)
On hand 26u · Expiring < 36 h 0u · Cover 0.0 d (O−)                       (14, ink-2; "0.0 d (O−)" in --bad)

Expiry                              Apheresis (SDP)   RDP (random donor)  ← TextTabs
        0        12h      36h              72h                   120h     ← shared axis
● O−  par 9   [ strip ………………………………………… ]              0u    —
  O+  par 18  [ strip ………………………………………… ]             26u   6.0 d
  ...
30 days
7.8%  outdate rate      Issued 1,412u · Sent 135u · Expired 130u
[=======================================|====|===]   ← one 8 px bar
Nothing at risk of expiring.
```
- **Usable now** is the only large figure. Secondary stats are one line of text, not tiles.
- **Alerts:** no banners. A short-cover group shows a `--bad` dot and a `--bad` cover value inside its row. An arrival that needs confirmation appears in the page Sentence area of Today, not here, except as one text line under the header: "● TX-1138 arrived · Confirm receipt →".
- **Flow:** the outdate rate in display 53/56, an 8 px stacked bar (issued `--good`, sent `--ink-3`, expired `--bad`) and a legend as text. No boxes. A comparison to the network appears only if computed from the world.
- **Surplus:** only when non-empty, as Row items (`6u O+ · expires 9 h · suggested: LNJ 11 min · Release`). Otherwise the single line "Nothing at risk of expiring." in the Flow section.
- **Update drawer** (`Sheet`): TextTabs `Adjust · Receive · Count · History`. Adjust: a row per group with a compact stepper (28 px buttons), one reason selector at the bottom for the whole batch (required), footer "Save 3 changes" and an undo toast for 8 s. Receive: group, product, units, collected date-time, source. Count: system vs counted per group with a variance in text. History: the audit rows (who, when, why, before → after). Behavior per `PORTAL_SPEC.md` 3.6.

---

## 10. Dispatch: Transfer orders table (inside the existing dashboard card)

Keep the Moveon-style container. Replace the table, tabs and pills with the Ledger primitives. No filled status pills; no hospital badges with colored dots (codes are plain mono text).
- **Tabs:** TextTabs `Proposed 0 · In transit 1 · Delivered 10 · Exceptions 1` (counts always match rows).
- **Rows:** 44 px, hairlines, sticky header row, right-aligned numbers, "Show earlier" button instead of a faded last row and a tiny inner scrollbar (the card shows up to 8 rows, then the button).
- **Per-tab columns:**
  - Proposed: Request (REQ mono) · Hospital (code + name) · Need (`12u O− Apheresis`) · Deficit (`−15u` with a state dot) · Needed within · `Assign` text button.
  - In transit: Order · Route · Units · Courier and vehicle · ETA (`15:58 · 7 min` with a 56 px mini rail) · StatusDot.
  - **Delivered:** Order · Route · Units · **Delivered at** · **Outcome** (`On time`, `+6 min`, or `Alert` with a dot) · **Receipt** (`Confirmed 03:20` or `Awaiting`). No Status column. Rows are grouped by day with sticky group headers (`Today`, `Yesterday`).
  - Exceptions: Order · Route · Issue (`Temperature 24.6 °C · 6 min`) · Since · `Review`.
- Delivered rows are never rendered as 10 identical green pills.
- Also tone down the Coverage map tint: active zones at 8% alpha of the state color, not a solid yellow.

---

## 11. Copy rules

Sentences of at most 9 words for headlines, one line of at most 12 words beneath. No explanations inside boxes (there are no boxes). Examples:

| Now | Becomes |
|---|---|
| "Transfer TX-1138 arrived. Consignment from Medanta Hub arrived at blood bank receiving bay. Temperature and tamper inspection required." | "2u O− arrived." / "Confirm receipt for TX-1138 from Medanta Hub." |
| "Critical low cover: O- (0.0d). O- cover is critically below the 1.5-day safety threshold…" | "● O− cover is 0.0 d." |
| "Units needed (48px stepper)" | "Units" |
| "Safe for clinical release (≥ 6 h shelf-life remaining)" | "Usable now" (tooltip holds the rule) |
| "Verified 02:30 · Dispatcher" | "Counted 02:30 by in-charge" |
| "Needs your attention · Max 3 priority actions · Auto-expires" | (removed) |
| "AIIMS Trauma (AIM) • Autonomous FEFO Mesh Network" | (removed) |
| "Request Platelet Units / Autonomous FEFO mesh dispatch • AIM" | "Request platelets" |

---

## 12. Keyboard and `⌘K`
- `⌘K` / `Ctrl K` opens a command palette (use `cmdk` or an equivalent headless list): Request platelets, Update stock, Go to Today / Requests / Stock, Open request … (search by id), Switch hospital (demo), Toggle sound. 320 ms max, radius 10, `--shadow-pop`.
- Shortcuts: `g t`, `g r`, `g s` go to a tab; `r` new request; `u` update stock; `j`/`k` move between rows; `Enter` opens; `Esc` closes. Hints appear as Kbd in tooltips.

---

## 13. Mobile (design first for 390 wide)
- Sentence 34/38. The Hour Rail shows a 24 h window, and below it the next arrivals as Rows.
- The Expiry Strip becomes two-line rows (group and totals on the first line, the strip full width on the second).
- Rows keep 44 px height with 44 px touch targets. Sheets are full-height bottom sheets with a hairline handle and a sticky footer inside the safe area. No horizontal scroll anywhere.

---

## 14. Safety details (blood groups)
- Render a blood group with one `BloodGroup` component: UI face (never mono), weight 600, the proper minus sign **U+2212 ("−")**, never a hyphen, and **the letter O, never a zero** in the data or the display.
- `aria-label` reads "O negative", "AB positive".
- The font test in 2.1 must prove the capital O and the digit 0 are clearly distinct.
- Show hospital codes in mono, and blood groups never in mono.

---

## 15. Checks (extend `window.__story.checks()`; add `scripts/ai-tells.mjs` and run it in CI)

`ai.emoji = 0`, `ai.pillsWithSentences = 0`, `ai.alertBanners = 0`, `ai.cardsSameRadiusRepeats ≤ 1`, `ai.cardInCard = 0`, `ai.gradients = 0`, `ai.blurOrGlass = 0`, `ai.lavenderOrBlueInPortal = 0`, `ai.bannedFonts = []`, `ai.monoOnlyIds = true`, `ai.uppercaseLetterSpaced = 0`, `ai.devTextLeaks = []` (regex: `px stepper`, `FEFO mesh`, `Auto-expires`, `Priority \d of`), `ai.maxWeight ≤ 600`, `ai.radiusDistinct = 3`, `ai.shadowsOnlyOverlays = true`, `ai.fontScaleIsModular = true`;
`ledger.primaryButtonsPerRegion ≤ 1`, `ledger.statStileRows = 0`, `ledger.statusAsDotOrGlyph = true`, `ledger.numbersTabular = true`, `ledger.numbersRightAligned = true`, `ledger.sheetFooterOverlap = false`, `ledger.hourRailMarkerKinds = 3`, `ledger.stripSharesAxis = true`, `ledger.cmdKWorks = true`;
`safety.bloodGroupNotMono = true`, `safety.minusSignCorrect = true`, `safety.oVsZeroDistinct = true`, `safety.ariaLabelsOnGroups = true`;
`data.noRowTimeBeforeNowWithoutDate = true`, `data.attentionConsistent = true`, `dispatch.deliveredHasOutcomeAndReceipt = true`, `dispatch.noIdenticalPillRows = true`, `dispatch.tabCountsMatchRows = true`;
`a11y.contrastMin ≥ 4.5`, `a11y.touchTargetsMin ≥ 44`, `a11y.keyboardOnlyRequestFlow = true`, `mobile.noHorizontalScroll = true`.

---

## 16. Definition of done (every task)
1. No new console errors.
2. Screenshots at 1440×900, 1920×1080 and 390×844 for every changed screen, in at least three data states.
3. Before/after against the current build.
4. `window.__story.checks()` and `node scripts/ai-tells.mjs` both pass for the fields touched; paste the JSON.
5. Critique your own screenshots against sections 0, 1 and 11. List anything that still looks generic. Never claim something looks good unless the screenshots show it.
6. Report what changed, files touched, anything skipped or substituted.
