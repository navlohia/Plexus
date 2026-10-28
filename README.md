# HEMO-GRID // Autonomous Blood & Platelets Cold-Chain Clearinghouse

B2B hospital-to-hospital middleware for a **25-node Delhi-NCR mesh** that clears
5-day perishable platelets (120-hour hard clock) using an OR-Tools minimum-cost
network flow model. Two engines are seeded identically and advance on the exact
same demand stream:

| Engine | Behaviour |
| --- | --- |
| `ISOLATED_FIFO` | No lateral flow, exact-group consumption only. Silos incinerate platelets. |
| `ORTOOLS_SOLVER` | GLOP transportation LP clears expiring stock to surge centres, with ABO/Rh substitution penalties and a 4-hour cold-chain viability buffer. |

## Stack

- **Backend** — Python 3.13, FastAPI, Pydantic v2, Google OR-Tools (`pywraplp`/GLOP).
- **Frontend** — React 18 + Vite + TypeScript, Tailwind CSS, deck.gl (`ScatterplotLayer` + `ArcLayer`), MapLibre GL with the free Carto Dark Matter basemap. No paid API keys.

## Run

```bash
# backend
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --port 8000

# frontend (second terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173  (proxies /api -> :8000)
```

## Verify

```bash
python backend/verify_solver.py
```

The suite simulates 7 days (14 × 12h ticks) through both engines and asserts:

1. Zero ABO/Rh incompatible transfusions.
2. Zero transshipments that land at/after 120 hours.
3. Solver latency < 150 ms per tick over 25 nodes.
4. Isolated FIFO waste ≥ 20% while the solver stays ≤ 4%.
5. Solver stockouts never exceed the siloed baseline.

Current result: **7/7 checks pass** (FIFO 29.3% waste vs solver 0.2%, mean solve 31 ms).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/state` | Current tick state, no time advance |
| POST | `/api/tick` | Advance both engines (`{"hours": 6}`, default 6) |
| POST | `/api/mode` | Switch active reality (`ISOLATED_FIFO` / `ORTOOLS_SOLVER`) |
| POST | `/api/chaos` | Dengue surge, NH-48 mass trauma, Noida freezer fault |
| POST | `/api/reset` | Rebuild both engines from the identical seed |
| GET | `/health` | Liveness probe |

## Layout

```
backend/
  main.py           FastAPI app + REST endpoints
  models.py         Pydantic contracts (nodes, arcs, KPIs, telemetry)
  network_data.py   25 Delhi-NCR hospitals, ABO matrix, distances, seed stock
  solver.py         OR-Tools transshipment LP + dispatch manifests
  simulator.py      Dual-engine tick loop, ageing, expiry, chaos, KPIs
  verify_solver.py  Deterministic verification suite
frontend/src/
  App.tsx           4-zone command center
  components/       TopCommandBar, KpiStrip, DecayMatrixPanel, ShadowPricePanel,
                    NodeWatchlist, GeospatialMapCanvas, ChaosInjectorBar,
                    SolverManifestPanel
```

Inventory buckets are **remaining shelf life**: bucket 1 = 0–24h (critical),
bucket 5 = 96–120h (fresh).
