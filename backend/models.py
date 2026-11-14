"""Pydantic v2 data contracts for HEMO-GRID 25-node Delhi-NCR clearinghouse."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class HospitalNode(BaseModel):
    id: str
    name: str
    zone: str
    lat: float
    lng: float
    trauma_level: int = Field(ge=0, le=3)
    active_surge_type: str = "NONE"
    inventory_by_blood_and_age: dict[str, dict[int, int]] = Field(default_factory=dict)
    demand_forecast_24h: dict[str, int] = Field(default_factory=dict)
    net_balance: int = Field(default=0)


class TransshipmentArc(BaseModel):
    tx_id: str
    source_id: str
    source_name: str
    source_coords: tuple[float, float]
    target_id: str
    target_name: str
    target_coords: tuple[float, float]
    donor_blood: str
    recipient_blood: str
    units: int
    age_hours: int
    remaining_hours: int
    distance_km: float
    eta_mins: float
    cooler_temp_c: float
    substitution_used: bool
    reason_tag: str


class KPIRow(BaseModel):
    label: str
    primary: float
    baseline: float | None = None
    delta_text: str = ""


class TransferOrder(BaseModel):
    """A human-facing cold-chain transfer with its workflow status."""

    id: str
    source_id: str
    source_name: str
    source_zone: str
    target_id: str
    target_name: str
    target_zone: str
    donor_blood: str
    recipient_blood: str
    units: int
    distance_km: float
    eta_mins: float
    cooler_temp_c: float = 22.0
    age_hours: int = 0
    remaining_hours: int = 0
    status: str = "RECOMMENDED"  # RECOMMENDED | APPROVED | DELIVERED
    origin: str = "SOLVER"  # SOLVER | MANUAL
    urgency: str = "ROUTINE"  # ROUTINE | URGENT | CRITICAL
    reason_text: str = ""
    created_at: str = ""


class SolverTelemetry(BaseModel):
    solve_time_ms: float
    objective_value: float
    active_arc_count: int
    expiry_penalty_avoided: float
    o_minus_buffer: float
    arcs_generated: int


class ComparisonMetrics(BaseModel):
    isolated_waste_pct: float
    solver_waste_pct: float
    isolated_stockouts: int
    solver_stockouts: int
    units_saved_from_incineration: int
    unmet_trauma_demand_delta: int
    cold_chain_cost_efficiency: float
    solver_latency_ms: float


class SimulationTickState(BaseModel):
    day: int = 1
    hour: int = 0
    mode: str = "ISOLATED_FIFO"
    kpis: list[KPIRow] = Field(default_factory=list)
    nodes: list[HospitalNode] = Field(default_factory=list)
    active_arcs: list[TransshipmentArc] = Field(default_factory=list)
    transfers: list[TransferOrder] = Field(default_factory=list)
    decay_matrix_8x5: list[list[int]] = Field(default_factory=list)
    solver_telemetry: SolverTelemetry | None = None
    comparison_metrics: ComparisonMetrics | None = None


class ChaosPayload(BaseModel):
    event: str


class ModePayload(BaseModel):
    mode: str


class ResetPayload(BaseModel):
    pass


class TransferStatusPayload(BaseModel):
    status: str


class TransferRequestPayload(BaseModel):
    target_id: str
    blood: str
    units: int = 6
    urgency: str = "URGENT"
    source_id: str | None = None
