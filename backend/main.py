"""FastAPI server for the HEMO-GRID dual-reality clearinghouse simulation.

Endpoints
---------
GET  /api/state                  current tick state (no time advance)
POST /api/tick                   advance both engines (``{"hours": 6}``, default 6, max 48)
POST /api/mode                   switch the active engine (``ISOLATED_FIFO`` / ``ORTOOLS_SOLVER``)
POST /api/chaos                  inject a demand or cold-chain shock on both engines
POST /api/transfers/request      manual request -> solver-recommended donor hospital
POST /api/transfers/{id}/status  move a transfer to ``APPROVED`` or ``DELIVERED``
GET  /api/benchmark              cached 7-day isolated-vs-solver impact run
POST /api/reset                  rebuild both engines from the identical seed
GET  /health                     liveness probe
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.models import (
    ChaosPayload,
    ModePayload,
    TransferRequestPayload,
    TransferStatusPayload,
)
from backend.network_data import build_nodes
from backend.simulator import DualSimulator

app = FastAPI(title="HEMO-GRID Clearinghouse", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_sim: DualSimulator | None = None
_benchmark: dict[str, Any] | None = None


def _ensure_sim() -> DualSimulator:
    global _sim
    if _sim is None:
        _sim = DualSimulator(build_nodes())
    return _sim


@app.get("/api/state")
def get_state() -> dict[str, Any]:
    return _ensure_sim().tick(hours=0).model_dump()


@app.post("/api/tick")
def post_tick(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    hours = 6
    if payload and "hours" in payload:
        try:
            hours = int(payload["hours"])
        except (TypeError, ValueError):
            hours = 6
    hours = max(0, min(48, hours))
    return _ensure_sim().tick(hours=hours).model_dump()


@app.post("/api/mode")
def post_mode(payload: ModePayload) -> dict[str, Any]:
    sim = _ensure_sim()
    if payload.mode not in {"ISOLATED_FIFO", "ORTOOLS_SOLVER"}:
        return {"error": "invalid mode"}
    sim.switch_mode(payload.mode)
    return sim.tick(hours=0).model_dump()


@app.post("/api/chaos")
def post_chaos(payload: ChaosPayload) -> dict[str, Any]:
    sim = _ensure_sim()
    valid = {
        "DENGUE_SURGE_EAST_DELHI",
        "DENGUE_SURGE_SOUTH_DELHI",
        "HIGHWAY_TRAUMA_NH48",
        "FREEZER_FAULT_NOIDA",
    }
    if payload.event not in valid:
        return {"error": "unknown event"}
    return sim.inject_chaos(payload.event).model_dump()


@app.post("/api/transfers/request")
def post_transfer_request(payload: TransferRequestPayload) -> dict[str, Any]:
    sim = _ensure_sim()
    state, order = sim.create_transfer_request(
        payload.target_id, payload.blood, payload.units, payload.urgency
    )
    if order is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "No compatible donor hospital has viable cold-chain stock "
                "for this request."
            ),
        )
    return state.model_dump()


@app.post("/api/transfers/{tx_id}/status")
def post_transfer_status(
    tx_id: str, payload: TransferStatusPayload
) -> dict[str, Any]:
    sim = _ensure_sim()
    status = payload.status.upper()
    if status == "APPROVED":
        return sim.approve_transfer(tx_id).model_dump()
    if status == "DELIVERED":
        return sim.deliver_transfer(tx_id).model_dump()
    raise HTTPException(status_code=400, detail="status must be APPROVED or DELIVERED")


@app.get("/api/benchmark")
def get_benchmark() -> dict[str, Any]:
    """Seven-day side-by-side run of both engines on the identical demand stream."""
    global _benchmark
    if _benchmark is not None:
        return _benchmark

    sim = DualSimulator(build_nodes())
    for _ in range(14):
        sim.tick(12)
    state = sim.tick(0)

    metrics = state.comparison_metrics
    assert metrics is not None
    saved = max(0, sim.isolated_waste_total - sim.solver_waste_total)
    _benchmark = {
        "window_hours": 168,
        "hours_per_tick": 12,
        "ticks": 14,
        "comparison_metrics": metrics.model_dump(),
        "solver_telemetry": (
            state.solver_telemetry.model_dump()
            if state.solver_telemetry is not None
            else {}
        ),
        "isolated_waste_units": sim.isolated_waste_total,
        "solver_waste_units": sim.solver_waste_total,
        "units_saved_from_incineration": saved,
        "value_saved_inr_lakhs": round(saved * 12000 / 100_000, 1),
    }
    return _benchmark


@app.post("/api/reset")
def post_reset() -> dict[str, Any]:
    return _ensure_sim().reset().model_dump()


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True}
