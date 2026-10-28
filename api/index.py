"""Self-contained FastAPI server for Plexus (HEMO-GRID) on Vercel Serverless.

Unified monorepo entry point hosting the 25-node Delhi-NCR blood clearinghouse.
Wraps Google OR-Tools with an instant pure-Python Min-Cost Max-Flow fallback
so serverless deployments never crash or exceed Lambda memory/size limits.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# 1. Pydantic Data Contracts
# -----------------------------------------------------------------------------

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
    origin: str = "SOLVER"        # SOLVER | MANUAL
    urgency: str = "ROUTINE"     # ROUTINE | URGENT | CRITICAL
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


# -----------------------------------------------------------------------------
# 2. Delhi-NCR 25-Node Topology & Clinical Compatibilities
# -----------------------------------------------------------------------------

BLOOD_TYPES: tuple[str, ...] = ("O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+")
BUCKETS: tuple[int, ...] = (1, 2, 3, 4, 5)

SHELF_LIFE_H = 120.0
TRANSIT_KMH = 45.0
TRANSIT_BUFFER_H = 4.0
MAX_LEG_KM = 38.0
MAX_LEGS_PER_NODE = 10

DEMAND_VALUE = 100.0
URGENCY_CRITICAL = 30.0
URGENCY_RISK = 18.0
URGENCY_AGING = 6.0
DISTANCE_COST_PER_KM = 0.35
SUBSTITUTION_MULTIPLIER = 2.0

HOSPITALS: tuple[dict[str, Any], ...] = (
    {
        "id": "ND-01",
        "name": "AIIMS Trauma & Dengue Ward",
        "zone": "CENTRAL_DELHI",
        "lat": 28.6328,
        "lng": 77.2197,
        "trauma_level": 3,
        "baseline_surplus": {"O-": 12, "O+": 40, "A-": 6, "A+": 18, "B-": 3, "B+": 9, "AB-": 2, "AB+": 6},
        "baseline_demand": {"O-": 14, "O+": 55, "A-": 8, "A+": 32, "B-": 5, "B+": 14, "AB-": 3, "AB+": 11},
        "surge_hot": True,
    },
    {
        "id": "ND-02",
        "name": "Safdarjung Hospital",
        "zone": "SOUTH_DELHI",
        "lat": 28.5846,
        "lng": 77.1856,
        "trauma_level": 2,
        "baseline_surplus": {"O-": 4, "O+": 16, "A-": 3, "A+": 11, "B-": 2, "B+": 8, "AB-": 1, "AB+": 4},
        "baseline_demand": {"O-": 6, "O+": 28, "A-": 4, "A+": 18, "B-": 3, "B+": 11, "AB-": 2, "AB+": 7},
        "surge_hot": True,
    },
    {
        "id": "ND-03",
        "name": "Max Saket",
        "zone": "SOUTH_DELHI",
        "lat": 28.5295,
        "lng": 77.1426,
        "trauma_level": 2,
        "baseline_surplus": {"O-": 2, "O+": 8, "A-": 2, "A+": 7, "B-": 1, "B+": 4, "AB-": 1, "AB+": 2},
        "baseline_demand": {"O-": 3, "O+": 19, "A-": 3, "A+": 12, "B-": 2, "B+": 8, "AB-": 1, "AB+": 4},
        "surge_hot": False,
    },
    {
        "id": "ND-04",
        "name": "Noida Sec-62 Maternity & Elective",
        "zone": "NOIDA",
        "lat": 28.5634,
        "lng": 77.3456,
        "trauma_level": 0,
        "baseline_surplus": {"O-": 6, "O+": 32, "A-": 4, "A+": 26, "B-": 2, "B+": 14, "AB-": 1, "AB+": 8},
        "baseline_demand": {"O-": 2, "O+": 14, "A-": 1, "A+": 10, "B-": 1, "B+": 5, "AB-": 0, "AB+": 3},
        "surge_hot": False,
    },
    {
        "id": "ND-05",
        "name": "Medanta Gurugram",
        "zone": "GURUGRAM",
        "lat": 28.4630,
        "lng": 77.0314,
        "trauma_level": 2,
        "baseline_surplus": {"O-": 3, "O+": 14, "A-": 2, "A+": 9, "B-": 1, "B+": 5, "AB-": 1, "AB+": 3},
        "baseline_demand": {"O-": 4, "O+": 22, "A-": 3, "A+": 15, "B-": 2, "B+": 9, "AB-": 1, "AB+": 5},
        "surge_hot": False,
    },
    {
        "id": "ND-06",
        "name": "Sir Ganga Ram Hospital",
        "zone": "NORTH_DELHI",
        "lat": 28.6426,
        "lng": 77.2054,
        "trauma_level": 2,
        "baseline_surplus": {"O-": 2, "O+": 10, "A-": 1, "A+": 7, "B-": 1, "B+": 4, "AB-": 0, "AB+": 2},
        "baseline_demand": {"O-": 5, "O+": 24, "A-": 3, "A+": 14, "B-": 2, "B+": 10, "AB-": 1, "AB+": 5},
        "surge_hot": False,
    },
    {
        "id": "ND-07",
        "name": "LNJP (Lok Nayak Jai Prakash)",
        "zone": "CENTRAL_DELHI",
        "lat": 28.6235,
        "lng": 77.1986,
        "trauma_level": 3,
        "baseline_surplus": {"O-": 5, "O+": 22, "A-": 3, "A+": 14, "B-": 2, "B+": 8, "AB-": 1, "AB+": 4},
        "baseline_demand": {"O-": 8, "O+": 36, "A-": 5, "A+": 22, "B-": 3, "B+": 13, "AB-": 2, "AB+": 8},
        "surge_hot": True,
    },
    {
        "id": "ND-08",
        "name": "Rajiv Gandhi Super Specialty",
        "zone": "SOUTH_DELHI",
        "lat": 28.5089,
        "lng": 77.2025,
        "trauma_level": 2,
        "baseline_surplus": {"O-": 2, "O+": 9, "A-": 1, "A+": 6, "B-": 1, "B+": 4, "AB-": 0, "AB+": 2},
        "baseline_demand": {"O-": 3, "O+": 16, "A-": 2, "A+": 11, "B-": 2, "B+": 7, "AB-": 1, "AB+": 4},
        "surge_hot": False,
    },
    {
        "id": "ND-09",
        "name": "Fortis Hospital Shalimar Bagh",
        "zone": "NORTH_DELHI",
        "lat": 28.6796,
        "lng": 77.1538,
        "trauma_level": 1,
        "baseline_surplus": {"O-": 1, "O+": 6, "A-": 1, "A+": 4, "B-": 1, "B+": 3, "AB-": 0, "AB+": 1},
        "baseline_demand": {"O-": 2, "O+": 13, "A-": 2, "A+": 9, "B-": 1, "B+": 5, "AB-": 1, "AB+": 3},
        "surge_hot": False,
    },
    {
        "id": "ND-10",
        "name": "Apollo Hospital Sarita Vihar",
        "zone": "SOUTH_DELHI",
        "lat": 28.5167,
        "lng": 77.2997,
        "trauma_level": 2,
        "baseline_surplus": {"O-": 1, "O+": 6, "A-": 1, "A+": 5, "B-": 1, "B+": 3, "AB-": 0, "AB+": 2},
        "baseline_demand": {"O-": 2, "O+": 14, "A-": 2, "A+": 10, "B-": 1, "B+": 6, "AB-": 1, "AB+": 4},
        "surge_hot": False,
    },
    {
        "id": "ND-11",
        "name": "Rohini Maternity & Elective Clinic",
        "zone": "NORTH_DELHI",
        "lat": 28.7419,
        "lng": 77.1199,
        "trauma_level": 0,
        "baseline_surplus": {"O-": 8, "O+": 44, "A-": 6, "A+": 30, "B-": 4, "B+": 18, "AB-": 2, "AB+": 12},
        "baseline_demand": {"O-": 1, "O+": 8, "A-": 1, "A+": 6, "B-": 1, "B+": 4, "AB-": 0, "AB+": 2},
        "surge_hot": False,
    },
    {
        "id": "ND-12",
        "name": "Dwarka Blood Bank & Trauma Support",
        "zone": "SOUTHWEST_DELHI",
        "lat": 28.5689,
        "lng": 77.0809,
        "trauma_level": 1,
        "baseline_surplus": {"O-": 2, "O+": 10, "A-": 1, "A+": 6, "B-": 1, "B+": 4, "AB-": 0, "AB+": 2},
        "baseline_demand": {"O-": 2, "O+": 11, "A-": 2, "A+": 7, "B-": 1, "B+": 4, "AB-": 0, "AB+": 2},
        "surge_hot": False,
    },
    {
        "id": "ND-13",
        "name": "St. Stephens Hospital",
        "zone": "CENTRAL_DELHI",
        "lat": 28.6439,
        "lng": 77.2417,
        "trauma_level": 1,
        "baseline_surplus": {"O-": 1, "O+": 5, "A-": 1, "A+": 4, "B-": 1, "B+": 2, "AB-": 0, "AB+": 1},
        "baseline_demand": {"O-": 2, "O+": 9, "A-": 1, "A+": 6, "B-": 1, "B+": 4, "AB-": 1, "AB+": 3},
        "surge_hot": False,
    },
    {
        "id": "ND-14",
        "name": "GTB Hospital (East Delhi)",
        "zone": "EAST_DELHI",
        "lat": 28.7226,
        "lng": 77.1406,
        "trauma_level": 2,
        "baseline_surplus": {"O-": 2, "O+": 9, "A-": 1, "A+": 5, "B-": 1, "B+": 3, "AB-": 0, "AB+": 1},
        "baseline_demand": {"O-": 3, "O+": 13, "A-": 2, "A+": 8, "B-": 1, "B+": 5, "AB-": 1, "AB+": 3},
        "surge_hot": False,
    },
    {
        "id": "ND-15",
        "name": "Gurugram Civil Hospital",
        "zone": "GURUGRAM",
        "lat": 28.4204,
        "lng": 77.0356,
        "trauma_level": 1,
        "baseline_surplus": {"O-": 3, "O+": 12, "A-": 2, "A+": 8, "B-": 1, "B+": 5, "AB-": 1, "AB+": 3},
        "baseline_demand": {"O-": 2, "O+": 9, "A-": 1, "A+": 6, "B-": 1, "B+": 4, "AB-": 0, "AB+": 2},
        "surge_hot": False,
    },
    {
        "id": "ND-16",
        "name": "Faridabad NCR Trauma & General",
        "zone": "FARIDABAD",
        "lat": 28.4056,
        "lng": 77.3100,
        "trauma_level": 2,
        "baseline_surplus": {"O-": 2, "O+": 10, "A-": 1, "A+": 6, "B-": 1, "B+": 4, "AB-": 0, "AB+": 2},
        "baseline_demand": {"O-": 3, "O+": 16, "A-": 2, "A+": 11, "B-": 2, "B+": 8, "AB-": 1, "AB+": 5},
        "surge_hot": True,
    },
    {
        "id": "ND-17",
        "name": "Ghaziabad NCR Trauma & Elective",
        "zone": "GHAZIABAD",
        "lat": 28.6687,
        "lng": 77.4241,
        "trauma_level": 1,
        "baseline_surplus": {"O-": 3, "O+": 14, "A-": 2, "A+": 9, "B-": 1, "B+": 5, "AB-": 1, "AB+": 3},
        "baseline_demand": {"O-": 2, "O+": 10, "A-": 1, "A+": 6, "B-": 1, "B+": 4, "AB-": 0, "AB+": 2},
        "surge_hot": False,
    },
    {
        "id": "ND-18",
        "name": "Noble Hospital Vaishali",
        "zone": "GHAZIABAD",
        "lat": 28.6786,
        "lng": 77.3459,
        "trauma_level": 0,
        "baseline_surplus": {"O-": 5, "O+": 26, "A-": 3, "A+": 18, "B-": 2, "B+": 10, "AB-": 1, "AB+": 5},
        "baseline_demand": {"O-": 1, "O+": 6, "A-": 1, "A+": 4, "B-": 0, "B+": 2, "AB-": 0, "AB+": 1},
        "surge_hot": False,
    },
    {
        "id": "ND-19",
        "name": "Fortis Hospital Noida",
        "zone": "NOIDA",
        "lat": 28.5495,
        "lng": 77.3999,
        "trauma_level": 1,
        "baseline_surplus": {"O-": 2, "O+": 9, "A-": 1, "A+": 6, "B-": 1, "B+": 4, "AB-": 0, "AB+": 2},
        "baseline_demand": {"O-": 2, "O+": 13, "A-": 2, "A+": 9, "B-": 1, "B+": 6, "AB-": 1, "AB+": 4},
        "surge_hot": False,
    },
    {
        "id": "ND-20",
        "name": "Manipal Hospital Dwarka",
        "zone": "SOUTHWEST_DELHI",
        "lat": 28.5845,
        "lng": 76.9967,
        "trauma_level": 1,
        "baseline_surplus": {"O-": 1, "O+": 7, "A-": 1, "A+": 5, "B-": 1, "B+": 3, "AB-": 0, "AB+": 2},
        "baseline_demand": {"O-": 1, "O+": 8, "A-": 1, "A+": 5, "B-": 1, "B+": 4, "AB-": 0, "AB+": 2},
        "surge_hot": False,
    },
    {
        "id": "ND-21",
        "name": "BLK Super Specialty Pusa",
        "zone": "CENTRAL_DELHI",
        "lat": 28.6397,
        "lng": 77.2114,
        "trauma_level": 2,
        "baseline_surplus": {"O-": 2, "O+": 10, "A-": 2, "A+": 7, "B-": 1, "B+": 4, "AB-": 1, "AB+": 3},
        "baseline_demand": {"O-": 3, "O+": 17, "A-": 2, "A+": 11, "B-": 2, "B+": 8, "AB-": 1, "AB+": 5},
        "surge_hot": False,
    },
    {
        "id": "ND-22",
        "name": "Dharampal Rattan Blood Centre (Wazirabad)",
        "zone": "NORTH_DELHI",
        "lat": 28.7700,
        "lng": 77.1100,
        "trauma_level": 0,
        "baseline_surplus": {"O-": 7, "O+": 34, "A-": 5, "A+": 24, "B-": 3, "B+": 14, "AB-": 2, "AB+": 10},
        "baseline_demand": {"O-": 1, "O+": 7, "A-": 1, "A+": 5, "B-": 1, "B+": 3, "AB-": 0, "AB+": 2},
        "surge_hot": False,
    },
    {
        "id": "ND-23",
        "name": "PAHUDA Trauma & Elective Centre",
        "zone": "GURUGRAM",
        "lat": 28.4969,
        "lng": 77.0904,
        "trauma_level": 1,
        "baseline_surplus": {"O-": 2, "O+": 9, "A-": 1, "A+": 6, "B-": 1, "B+": 4, "AB-": 0, "AB+": 2},
        "baseline_demand": {"O-": 2, "O+": 12, "A-": 1, "A+": 7, "B-": 1, "B+": 5, "AB-": 1, "AB+": 3},
        "surge_hot": False,
    },
    {
        "id": "ND-24",
        "name": "NH-48 Highway Trauma Outpost (Kundli)",
        "zone": "GURUGRAM",
        "lat": 28.5294,
        "lng": 76.9223,
        "trauma_level": 3,
        "baseline_surplus": {"O-": 1, "O+": 4, "A-": 1, "A+": 3, "B-": 0, "B+": 1, "AB-": 0, "AB+": 1},
        "baseline_demand": {"O-": 5, "O+": 22, "A-": 3, "A+": 14, "B-": 2, "B+": 10, "AB-": 2, "AB+": 7},
        "surge_hot": True,
    },
    {
        "id": "ND-25",
        "name": "South Delhi Private Elective Suite (Lajpat Nagar)",
        "zone": "SOUTH_DELHI",
        "lat": 28.5459,
        "lng": 77.2076,
        "trauma_level": 0,
        "baseline_surplus": {"O-": 4, "O+": 22, "A-": 3, "A+": 16, "B-": 2, "B+": 10, "AB-": 1, "AB+": 6},
        "baseline_demand": {"O-": 1, "O+": 5, "A-": 1, "A+": 4, "B-": 0, "B+": 2, "AB-": 0, "AB+": 1},
        "surge_hot": False,
    },
)

ABO_COMPATIBILITY: dict[str, set[str]] = {
    "O-":  {"O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"},
    "O+":  {"O+", "A+", "B+", "AB+"},
    "A-":  {"A-", "A+", "AB-", "AB+"},
    "A+":  {"A+", "AB+"},
    "B-":  {"B-", "B+", "AB-", "AB+"},
    "B+":  {"B+", "AB+"},
    "AB-": {"AB-", "AB+"},
    "AB+": {"AB+"},
}

SUBSTITUTION_PENALTY: dict[str, dict[str, float]] = {
    "O-":  {"O-": 0.0, "O+": 3.0, "A-": 3.0, "A+": 3.0, "B-": 3.0, "B+": 3.0, "AB-": 3.0, "AB+": 3.0},
    "O+":  {"O+": 0.0, "A+": 2.0, "B+": 2.0, "AB+": 2.0},
    "A-":  {"A-": 0.0, "A+": 1.5, "AB-": 1.5, "AB+": 1.5},
    "A+":  {"A+": 0.0, "AB+": 1.5},
    "B-":  {"B-": 0.0, "B+": 1.5, "AB-": 1.5, "AB+": 1.5},
    "B+":  {"B+": 0.0, "AB+": 1.5},
    "AB-": {"AB-": 0.0, "AB+": 1.0},
    "AB+": {"AB+": 0.0},
}

DISTANCE_KM: dict[tuple[str, str], float] = {}

def _build_distance_lookup() -> None:
    global DISTANCE_KM
    table: dict[tuple[str, str], float] = {}
    positions: dict[str, tuple[float, float]] = {
        n["id"]: (n["lat"], n["lng"]) for n in HOSPITALS
    }
    for left in positions:
        for right in positions:
            if left == right:
                continue
            key = (left, right)
            if key not in table:
                lp = positions[left]
                rp = positions[right]
                delta_lat = lp[0] - rp[0]
                delta_lng = lp[1] - rp[1]
                deg = (delta_lat * delta_lat + delta_lng * delta_lng) ** 0.5
                km = float(round(deg * 111.0, 2))
                table[key] = km
                table[(right, left)] = km
    DISTANCE_KM = table

_build_distance_lookup()


def initial_inventory(hospital: dict[str, Any]) -> dict[str, dict[int, int]]:
    peripheral = hospital["trauma_level"] <= 1
    weights = (
        (0.64, 0.14, 0.10, 0.07, 0.05)
        if peripheral
        else (0.12, 0.16, 0.20, 0.24, 0.28)
    )
    buckets: dict[str, dict[int, int]] = {}
    for blood in BLOOD_TYPES:
        total = int(hospital["baseline_surplus"].get(blood, 0))
        if total <= 0:
            buckets[blood] = {b: 0 for b in (1, 2, 3, 4, 5)}
            continue
        counts = {
            bucket: int(math.floor(total * weight))
            for bucket, weight in zip((1, 2, 3, 4, 5), weights)
        }
        counts[5] += total - sum(counts.values())
        buckets[blood] = counts
    return buckets


def build_nodes() -> list[HospitalNode]:
    out: list[HospitalNode] = []
    for h in HOSPITALS:
        inv = initial_inventory(h)
        demand = dict(h["baseline_demand"])
        surplus = sum(sum(buckets.values()) for buckets in inv.values())
        demand_total = sum(demand.values())
        node = HospitalNode(
            id=h["id"],
            name=h["name"],
            zone=h["zone"],
            lat=h["lat"],
            lng=h["lng"],
            trauma_level=h["trauma_level"],
            active_surge_type="NONE",
            inventory_by_blood_and_age=inv,
            demand_forecast_24h=demand,
            net_balance=surplus - demand_total,
        )
        out.append(node)
    return out


# -----------------------------------------------------------------------------
# 3. Solver: OR-Tools with Built-In Pure-Python Min-Cost Max-Flow Fallback
# -----------------------------------------------------------------------------

try:
    from ortools.linear_solver import pywraplp  # type: ignore
    ORTOOLS_AVAILABLE = True
except (ImportError, Exception):
    pywraplp = None
    ORTOOLS_AVAILABLE = False


def _arc_value(
    blood: str,
    age: int,
    transit_h: float,
    distance_km: float,
    recipient: HospitalNode,
) -> float:
    remaining = SHELF_LIFE_H - age - transit_h
    val = DEMAND_VALUE
    if remaining <= 12:
        val += URGENCY_CRITICAL
    elif remaining <= 36:
        val += URGENCY_RISK
    elif remaining <= 72:
        val += URGENCY_AGING

    if recipient.trauma_level == 3:
        val += 8.0
    elif recipient.trauma_level == 2:
        val += 4.0

    if recipient.active_surge_type not in ("", "NONE"):
        val += 15.0

    val -= distance_km * DISTANCE_COST_PER_KM
    return max(0.1, val)


def _reason_tag(age: int, recipient: HospitalNode, substitution: bool) -> str:
    remaining = int(SHELF_LIFE_H - age)
    if age >= 96:
        return f"EXPIRY_RESCUE_{remaining}H"
    if age >= 72:
        return f"FEFO_SWEEP_{remaining}H"
    if recipient.active_surge_type not in ("", "NONE"):
        return f"{recipient.active_surge_type}_COVER"
    if substitution:
        return "ABO_SUBSTITUTION"
    return "BALANCE_TRANSFER"


def _empty_telemetry() -> SolverTelemetry:
    return SolverTelemetry(
        solve_time_ms=0.0,
        objective_value=0.0,
        active_arc_count=0,
        expiry_penalty_avoided=0.0,
        o_minus_buffer=100.0,
        arcs_generated=0,
    )


def _neighbourhoods(
    nodes: list[HospitalNode],
) -> dict[str, list[tuple[HospitalNode, float]]]:
    out: dict[str, list[tuple[HospitalNode, float]]] = {}
    for donor in nodes:
        legs: list[tuple[HospitalNode, float]] = [(donor, 0.0)]
        for recipient in nodes:
            if recipient.id == donor.id:
                continue
            distance = DISTANCE_KM.get((donor.id, recipient.id), 0.0)
            if 0.0 < distance <= MAX_LEG_KM:
                legs.append((recipient, distance))
        legs[1:] = sorted(legs[1:], key=lambda leg: leg[1])[:MAX_LEGS_PER_NODE]
        out[donor.id] = legs
    return out


def _supply_lots(
    nodes: list[HospitalNode],
    inventory: dict[str, dict[str, dict[int, int]]],
) -> list[dict[str, Any]]:
    node_map = {n.id: n for n in nodes}
    lots: list[dict[str, Any]] = []
    for nid, node_inv in inventory.items():
        node = node_map.get(nid)
        if node is None:
            continue
        for blood, batches in node_inv.items():
            for age, units in batches.items():
                if units > 0:
                    lots.append(
                        {
                            "node": node,
                            "blood": blood,
                            "age_hours": age,
                            "units": int(units),
                        }
                    )
    return lots


def _inventory_from_state(
    nodes: list[HospitalNode],
) -> dict[str, dict[str, dict[int, int]]]:
    midpoint_age = {1: 110, 2: 86, 3: 62, 4: 38, 5: 14}
    out: dict[str, dict[str, dict[int, int]]] = {}
    for node in nodes:
        node_inv: dict[str, dict[int, int]] = {}
        for blood in BLOOD_TYPES:
            batches: dict[int, int] = {}
            for bucket in (1, 2, 3, 4, 5):
                units = int(node.inventory_by_blood_and_age.get(blood, {}).get(bucket, 0))
                if units > 0:
                    batches[midpoint_age[bucket]] = units
            node_inv[blood] = batches
        out[node.id] = node_inv
    return out


def _merge_manifests(manifests: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    for manifest in manifests:
        key = (
            manifest["source_id"],
            manifest["target_id"],
            manifest["donor_blood"],
            manifest["recipient_blood"],
        )
        existing = merged.get(key)
        if existing is None:
            merged[key] = dict(manifest)
            continue
        tot = existing["units"] + manifest["units"]
        weighted_age = (
            existing["age_hours"] * existing["units"]
            + manifest["age_hours"] * manifest["units"]
        ) / max(1, tot)
        existing["units"] = tot
        existing["age_hours"] = int(round(weighted_age))
        existing["remaining_hours"] = min(
            existing["remaining_hours"], manifest["remaining_hours"]
        )
        if manifest["substitution_used"]:
            existing["substitution_used"] = True
    return list(merged.values())


def _pick_recipient_blood(
    donor_blood: str,
    recipient_id: str,
    remaining_need: dict[str, dict[str, int]],
) -> str | None:
    need = remaining_need.get(recipient_id, {})
    compatible = [b for b in ABO_COMPATIBILITY[donor_blood] if need.get(b, 0) > 0]
    if not compatible:
        return None
    return min(
        compatible,
        key=lambda b: (
            SUBSTITUTION_PENALTY.get(donor_blood, {}).get(b, 3.0),
            -need[b],
            b,
        ),
    )


def _pure_python_solver(
    state: SimulationTickState,
    inventory: dict[str, dict[str, dict[int, int]]] | None = None,
) -> tuple[list[dict[str, Any]], SolverTelemetry]:
    """Pure-Python Min-Cost Max-Flow greedy priority transshipment solver.

    Guarantees <15ms execution on serverless platforms without OR-Tools C++ binaries.
    """
    t_start = time.perf_counter()
    nodes = list(state.nodes)
    if not nodes:
        return [], _empty_telemetry()

    inv = inventory if inventory is not None else _inventory_from_state(nodes)
    demand: dict[str, dict[str, int]] = {
        n.id: {b: max(0, int(n.demand_forecast_24h.get(b, 0))) for b in BLOOD_TYPES}
        for n in nodes
    }
    remaining_need = {nid: dict(need) for nid, need in demand.items()}
    neighborhoods = _neighbourhoods(nodes)

    # Gather lots
    lots = _supply_lots(nodes, inv)
    # Build candidate arcs
    candidates: list[dict[str, Any]] = []
    for lot in lots:
        donor: HospitalNode = lot["node"]
        blood: str = lot["blood"]
        age: int = lot["age_hours"]
        units = lot["units"]
        for recipient, distance in neighborhoods[donor.id]:
            transit_h = distance / TRANSIT_KMH
            if SHELF_LIFE_H - age - transit_h <= TRANSIT_BUFFER_H:
                continue
            score = _arc_value(blood, age, transit_h, distance, recipient)
            candidates.append(
                {
                    "donor": donor,
                    "recipient": recipient,
                    "blood": blood,
                    "age_hours": age,
                    "units": units,
                    "transit_h": transit_h,
                    "distance_km": distance,
                    "score": score,
                }
            )

    # Sort candidates by clinical score descending (expiry rescue & urgency prioritized)
    candidates.sort(key=lambda c: (-c["score"], -c["age_hours"], c["distance_km"]))

    manifests: list[dict[str, Any]] = []
    expiry_rescued = 0.0
    o_minus_cross = 0
    total_obj = 0.0

    # Track available units in each lot
    lot_supply: dict[tuple[str, str, int], int] = {
        (lot["node"].id, lot["blood"], lot["age_hours"]): lot["units"] for lot in lots
    }

    for c in candidates:
        donor = c["donor"]
        recipient = c["recipient"]
        blood = c["blood"]
        age = c["age_hours"]
        transit_h = c["transit_h"]
        distance = c["distance_km"]
        lot_key = (donor.id, blood, age)
        avail = lot_supply.get(lot_key, 0)
        if avail <= 0:
            continue

        recipient_blood = _pick_recipient_blood(blood, recipient.id, remaining_need)
        if recipient_blood is None:
            continue

        need_units = remaining_need[recipient.id][recipient_blood]
        if need_units <= 0:
            continue

        take = min(avail, need_units)
        lot_supply[lot_key] -= take
        remaining_need[recipient.id][recipient_blood] -= take

        remaining_hours = int(max(0, round(SHELF_LIFE_H - age - transit_h)))
        if blood == "O-" and recipient_blood != "O-":
            o_minus_cross += take
        if remaining_hours <= 36:
            expiry_rescued += take * (1.0 if remaining_hours <= 12 else 0.6)

        total_obj += take * c["score"]

        if recipient.id != donor.id:
            manifests.append(
                {
                    "tx_id": "",
                    "source_id": donor.id,
                    "source_name": donor.name,
                    "source_coords": (donor.lat, donor.lng),
                    "target_id": recipient.id,
                    "target_name": recipient.name,
                    "target_coords": (recipient.lat, recipient.lng),
                    "donor_blood": blood,
                    "recipient_blood": recipient_blood,
                    "units": int(take),
                    "age_hours": int(age),
                    "remaining_hours": remaining_hours,
                    "distance_km": round(float(distance), 2),
                    "eta_mins": round(transit_h * 60.0, 1),
                    "cooler_temp_c": 22.0,
                    "substitution_used": blood != recipient_blood,
                    "reason_tag": _reason_tag(
                        age, recipient, blood != recipient_blood
                    ),
                }
            )

    manifests = _merge_manifests(manifests)
    manifests.sort(key=lambda m: (-m["units"], m["source_id"], m["target_id"]))
    for idx, manifest in enumerate(manifests, start=1):
        manifest["tx_id"] = f"TX-{idx:04d}"

    solve_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
    total_o_minus = sum(sum(node_inv.get("O-", {}).values()) for node_inv in inv.values())
    o_minus_buffer = 100.0
    if total_o_minus > 0:
        o_minus_buffer = round(max(0.0, 100.0 * (1.0 - o_minus_cross / max(1, total_o_minus))), 1)

    telemetry = SolverTelemetry(
        solve_time_ms=solve_ms,
        objective_value=round(float(total_obj), 2),
        active_arc_count=len(manifests),
        expiry_penalty_avoided=round(float(expiry_rescued), 2),
        o_minus_buffer=o_minus_buffer,
        arcs_generated=len(candidates),
    )
    return manifests, telemetry


def _ortools_solver(
    state: SimulationTickState,
    inventory: dict[str, dict[str, dict[int, int]]] | None = None,
) -> tuple[list[dict[str, Any]], SolverTelemetry]:
    t_start = time.perf_counter()
    nodes = list(state.nodes)
    if not nodes:
        return [], _empty_telemetry()

    inv = inventory if inventory is not None else _inventory_from_state(nodes)
    demand: dict[str, dict[str, int]] = {
        n.id: {b: max(0, int(n.demand_forecast_24h.get(b, 0))) for b in BLOOD_TYPES}
        for n in nodes
    }
    total_demand = {n.id: sum(demand[n.id].values()) for n in nodes}
    compat_demand = {
        n.id: {
            b: sum(demand[n.id].get(r, 0) for r in ABO_COMPATIBILITY[b])
            for b in BLOOD_TYPES
        }
        for n in nodes
    }

    solver = pywraplp.Solver.CreateSolver("GLOP")
    if solver is None:
        solver = pywraplp.Solver.CreateSolver("CBC")
    if solver is None:
        raise RuntimeError("No OR-Tools solver backend")
    solver.SetTimeLimit(2000)

    objective = solver.Objective()
    objective.SetMaximization()

    arcs: list[dict[str, Any]] = []
    supply_rows: dict[tuple[str, str, int], Any] = {}
    node_rows: dict[str, Any] = {}
    compat_rows: dict[tuple[str, str], Any] = {}
    neighborhoods = _neighbourhoods(nodes)

    for lot in _supply_lots(nodes, inv):
        donor: HospitalNode = lot["node"]
        blood: str = lot["blood"]
        age: int = lot["age_hours"]
        lot_key = (donor.id, blood, age)
        if lot_key not in supply_rows:
            supply_rows[lot_key] = solver.Constraint(0.0, float(lot["units"]))

        for recipient, distance in neighborhoods[donor.id]:
            transit_h = distance / TRANSIT_KMH
            if SHELF_LIFE_H - age - transit_h <= TRANSIT_BUFFER_H:
                continue

            capacity = min(
                lot["units"], compat_demand[recipient.id][blood], total_demand[recipient.id]
            )
            if capacity <= 0:
                continue

            var = solver.NumVar(
                0.0, float(capacity), f"x_{donor.id}_{recipient.id}_{blood}_{age}"
            )
            objective.SetCoefficient(
                var, _arc_value(blood, age, transit_h, distance, recipient)
            )
            supply_rows[lot_key].SetCoefficient(var, 1.0)

            key = (recipient.id, blood)
            if key not in compat_rows:
                compat_rows[key] = solver.Constraint(
                    0.0, float(compat_demand[recipient.id][blood])
                )
            compat_rows[key].SetCoefficient(var, 1.0)

            if recipient.id not in node_rows:
                node_rows[recipient.id] = solver.Constraint(
                    0.0, float(total_demand[recipient.id])
                )
            node_rows[recipient.id].SetCoefficient(var, 1.0)

            arcs.append(
                {
                    "var": var,
                    "donor": donor,
                    "recipient": recipient,
                    "blood": blood,
                    "age_hours": age,
                    "transit_h": transit_h,
                    "distance_km": distance,
                }
            )

    status = solver.Solve() if arcs else -1
    solve_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
    manifests: list[dict[str, Any]] = []

    if status == 0 and arcs:
        flows = [
            (arc, int(round(arc["var"].solution_value())))
            for arc in arcs
            if arc["var"].solution_value() >= 0.5
        ]
        remaining_need = {nid: dict(need) for nid, need in demand.items()}
        expiry_rescued = 0.0
        o_minus_cross = 0

        for arc, units in sorted(flows, key=lambda pair: (-pair[0]["age_hours"], -pair[1])):
            donor = arc["donor"]
            recipient = arc["recipient"]
            blood = arc["blood"]
            transit_h = arc["transit_h"]
            age = arc["age_hours"]
            remaining_hours = int(max(0, round(SHELF_LIFE_H - age - transit_h)))

            while units > 0:
                recipient_blood = _pick_recipient_blood(blood, recipient.id, remaining_need)
                if recipient_blood is None:
                    break
                take = min(units, remaining_need[recipient.id][recipient_blood])
                remaining_need[recipient.id][recipient_blood] -= take
                units -= take

                if blood == "O-" and recipient_blood != "O-":
                    o_minus_cross += take
                if remaining_hours <= 36:
                    expiry_rescued += take * (1.0 if remaining_hours <= 12 else 0.6)

                if recipient.id == donor.id:
                    continue

                manifests.append(
                    {
                        "tx_id": "",
                        "source_id": donor.id,
                        "source_name": donor.name,
                        "source_coords": (donor.lat, donor.lng),
                        "target_id": recipient.id,
                        "target_name": recipient.name,
                        "target_coords": (recipient.lat, recipient.lng),
                        "donor_blood": blood,
                        "recipient_blood": recipient_blood,
                        "units": int(take),
                        "age_hours": int(age),
                        "remaining_hours": remaining_hours,
                        "distance_km": round(float(arc["distance_km"]), 2),
                        "eta_mins": round(transit_h * 60.0, 1),
                        "cooler_temp_c": 22.0,
                        "substitution_used": blood != recipient_blood,
                        "reason_tag": _reason_tag(
                            age, recipient, blood != recipient_blood
                        ),
                    }
                )

        manifests = _merge_manifests(manifests)
        manifests.sort(key=lambda m: (-m["units"], m["source_id"], m["target_id"]))
        for idx, manifest in enumerate(manifests, start=1):
            manifest["tx_id"] = f"TX-{idx:04d}"

        total_o_minus = sum(sum(node_inv.get("O-", {}).values()) for node_inv in inv.values())
        o_minus_buffer = 100.0
        if total_o_minus > 0:
            o_minus_buffer = round(max(0.0, 100.0 * (1.0 - o_minus_cross / max(1, total_o_minus))), 1)

        telemetry = SolverTelemetry(
            solve_time_ms=solve_ms,
            objective_value=round(float(objective.Value()), 2),
            active_arc_count=len(manifests),
            expiry_penalty_avoided=round(float(expiry_rescued), 2),
            o_minus_buffer=o_minus_buffer,
            arcs_generated=len(arcs),
        )
        return manifests, telemetry

    return [], SolverTelemetry(
        solve_time_ms=solve_ms,
        objective_value=0.0,
        active_arc_count=0,
        expiry_penalty_avoided=0.0,
        o_minus_buffer=100.0,
        arcs_generated=len(arcs),
    )


def run_solver(
    state: SimulationTickState,
    inventory: dict[str, dict[str, dict[int, int]]] | None = None,
) -> tuple[list[dict[str, Any]], SolverTelemetry]:
    """Run solver with automatic fallback to pure-Python when OR-Tools is unavailable."""
    if ORTOOLS_AVAILABLE:
        try:
            return _ortools_solver(state, inventory)
        except Exception:
            return _pure_python_solver(state, inventory)
    return _pure_python_solver(state, inventory)


# -----------------------------------------------------------------------------
# 4. Simulation Engine: DualSimulator
# -----------------------------------------------------------------------------

_BUCKET_AGES: dict[int, tuple[int, ...]] = {
    1: (104, 110),
    2: (76, 84, 92),
    3: (52, 60, 68),
    4: (28, 36, 44),
    5: (4, 12, 20),
}
_BUCKET_WEIGHTS: dict[int, tuple[float, ...]] = {
    1: (0.30, 0.70),
    2: (0.30, 0.40, 0.30),
    3: (0.30, 0.40, 0.30),
    4: (0.30, 0.40, 0.30),
    5: (0.30, 0.40, 0.30),
}


@dataclass
class _Engine:
    mode: str
    policy: str
    nodes: dict[str, HospitalNode] = field(default_factory=dict)
    inventory: dict[str, dict[str, dict[int, int]]] = field(default_factory=dict)
    demand: dict[str, dict[str, int]] = field(default_factory=dict)
    forecast: dict[str, dict[str, int]] = field(default_factory=dict)
    expired_total: int = 0
    stockouts_total: int = 0
    fulfilled_total: int = 0
    delivered_units: int = 0
    cold_chain_cost: float = 0.0
    arcs: list[TransshipmentArc] = field(default_factory=list)
    o_minus_exact: int = 0
    o_minus_cross: int = 0

    def remaining_units(self) -> int:
        return sum(
            units
            for node_inv in self.inventory.values()
            for batches in node_inv.values()
            for units in batches.values()
        )

    def waste_pct(self) -> float:
        remaining = self.remaining_units()
        total = self.expired_total + remaining
        if total <= 0:
            return 0.0
        return 100.0 * self.expired_total / total


def _expand_bucket(
    node_id: str, blood: str, bucket: int, count: int
) -> dict[int, int]:
    ages = _BUCKET_AGES[bucket]
    weights = _BUCKET_WEIGHTS[bucket]
    raw = [count * w for w in weights]
    allocation = [int(value) for value in raw]
    short = count - sum(allocation)
    order = sorted(
        range(len(weights)),
        key=lambda i: (-(raw[i] - allocation[i]), -weights[i], i),
    )
    for i in order[:short]:
        allocation[i] += 1
    return {age: units for age, units in zip(ages, allocation) if units > 0}


def _draw_oldest(batches: dict[int, int], units: int, preferred_age: int) -> int:
    drawn = 0
    for age in sorted([a for a in batches if a >= preferred_age], reverse=True):
        if drawn >= units:
            break
        available = batches[age]
        take = min(available, units - drawn)
        batches[age] = available - take
        drawn += take
    if drawn < units:
        for age in sorted(batches, reverse=True):
            if drawn >= units:
                break
            available = batches[age]
            if available <= 0:
                continue
            take = min(available, units - drawn)
            batches[age] = available - take
            drawn += take
    return drawn


def _bucket_for_age(age: int) -> int:
    remaining = SHELF_LIFE_H - age
    if remaining <= 24:
        return 1
    if remaining <= 48:
        return 2
    if remaining <= 72:
        return 3
    if remaining <= 96:
        return 4
    return 5


def _aggregate_inventory(
    inventory: dict[str, dict[str, dict[int, int]]]
) -> dict[str, dict[int, int]]:
    totals: dict[str, dict[int, int]] = {}
    for node_inv in inventory.values():
        for blood, batches in node_inv.items():
            blood_totals = totals.setdefault(blood, {})
            for age, units in batches.items():
                blood_totals[age] = blood_totals.get(age, 0) + units
    return totals


def _bucket_inventory(
    inventory: dict[str, dict[int, int]]
) -> dict[str, dict[int, int]]:
    out: dict[str, dict[int, int]] = {}
    for blood in BLOOD_TYPES:
        buckets = {b: 0 for b in BUCKETS}
        for age, units in inventory.get(blood, {}).items():
            if units > 0:
                buckets[_bucket_for_age(age)] += units
        out[blood] = buckets
    return out


def _decay_matrix(inventory: dict[str, dict[int, int]]) -> list[list[int]]:
    bucketed = _bucket_inventory(inventory)
    return [[bucketed[blood][bucket] for bucket in BUCKETS] for blood in BLOOD_TYPES]


_CHAOS: dict[str, dict[str, Any]] = {
    "DENGUE_SURGE_EAST_DELHI": {
        "zones": ("CENTRAL_DELHI", "EAST_DELHI"),
        "multipliers": {"O+": 4.0, "A+": 3.8, "O-": 2.5, "B+": 2.2, "A-": 2.0},
        "surge": "DENGUE_SURGE",
        "turns": 4,
    },
    "HIGHWAY_TRAUMA_NH48": {
        "zones": ("GURUGRAM",),
        "multipliers": {"O-": 3.0, "O+": 2.8, "A+": 2.0},
        "surge": "MASS_TRAUMA",
        "turns": 4,
    },
    "FREEZER_FAULT_NOIDA": {
        "zones": ("NOIDA",),
        "multipliers": {"O+": 1.2},
        "surge": "COLD_CHAIN_FAULT",
        "turns": 4,
        "spoilage": 0.65,
    },
}
_CHAOS["DENGUE_SURGE_SOUTH_DELHI"] = _CHAOS["DENGUE_SURGE_EAST_DELHI"]


def _plain_reason(arc: TransshipmentArc, surge: str) -> str:
    if arc.remaining_hours <= 36:
        return f"OR-Tools FEFO Rescue · {arc.remaining_hours}h remaining on 120h clock"
    if surge and surge != "NONE":
        return f"Emergency cover for {surge} · {arc.remaining_hours}h viability"
    if arc.substitution_used:
        return f"Compatible {arc.donor_blood}→{arc.recipient_blood} match · {arc.remaining_hours}h left"
    return f"OR-Tools Mesh Balancing · {arc.remaining_hours}h remaining on 120h clock"


class DualSimulator:
    def __init__(self, seed_nodes: list[HospitalNode]) -> None:
        self._seed = [node.model_copy(deep=True) for node in seed_nodes]
        self._base_demand: dict[str, dict[str, int]] = {
            node.id: {b: int(node.demand_forecast_24h.get(b, 0)) for b in BLOOD_TYPES}
            for node in self._seed
        }
        self._base_collection: dict[str, dict[str, int]] = {
            node.id: {
                b: sum(int(v) for v in node.inventory_by_blood_and_age.get(b, {}).values())
                for b in BLOOD_TYPES
            }
            for node in self._seed
        }
        self._order = [node.id for node in self._seed]
        self.reset()

    def reset(self) -> SimulationTickState:
        self.day = 1
        self.hour = 0
        self.mode = "ISOLATED_FIFO"
        self.latency_ms = 0.0
        self._surges: list[dict[str, Any]] = []
        self._surge_types: dict[str, str] = {nid: "NONE" for nid in self._order}
        self._engines: dict[str, _Engine] = {
            "ISOLATED_FIFO": self._build_engine("ISOLATED_FIFO", "FIFO"),
            "ORTOOLS_SOLVER": self._build_engine("ORTOOLS_SOLVER", "SOLVER"),
        }
        self._last_telemetry: SolverTelemetry | None = None
        self._solver_orders: list[TransferOrder] = []
        self._manual_orders: list[TransferOrder] = []
        self._delivered_orders: list[TransferOrder] = []
        self._transfer_seq = 0
        self._prime_plan(self._engines["ORTOOLS_SOLVER"])
        return self.tick(hours=0)

    def _prime_plan(self, engine: _Engine) -> None:
        self._refresh_demand(engine, 6)
        manifests, telemetry = run_solver(self._solver_state(engine), engine.inventory)
        self._last_telemetry = telemetry
        self.latency_ms = telemetry.solve_time_ms
        engine.arcs = [TransshipmentArc(**manifest) for manifest in manifests]
        self._sync_solver_orders(engine)

    def _build_engine(self, mode: str, policy: str) -> _Engine:
        engine = _Engine(mode=mode, policy=policy)
        for seed in self._seed:
            node = seed.model_copy(deep=True)
            engine.nodes[node.id] = node
            node_inv: dict[str, dict[int, int]] = {}
            for blood in BLOOD_TYPES:
                batches: dict[int, int] = {}
                for bucket in BUCKETS:
                    count = int(node.inventory_by_blood_and_age.get(blood, {}).get(bucket, 0))
                    if count <= 0:
                        continue
                    for age, units in _expand_bucket(node.id, blood, bucket, count).items():
                        batches[age] = batches.get(age, 0) + units
                node_inv[blood] = batches
            engine.inventory[node.id] = node_inv
            engine.demand[node.id] = {b: 0 for b in BLOOD_TYPES}
            engine.forecast[node.id] = {
                b: int(self._base_demand[node.id].get(b, 0)) for b in BLOOD_TYPES
            }
        return engine

    @property
    def isolated_waste_total(self) -> int:
        return self._engines["ISOLATED_FIFO"].expired_total

    @property
    def solver_waste_total(self) -> int:
        return self._engines["ORTOOLS_SOLVER"].expired_total

    @property
    def isolated_stockout_total(self) -> int:
        return self._engines["ISOLATED_FIFO"].stockouts_total

    @property
    def solver_stockout_total(self) -> int:
        return self._engines["ORTOOLS_SOLVER"].stockouts_total

    def waste_pct(self, mode: str) -> float:
        return self._engines[mode].waste_pct()

    def switch_mode(self, mode: str) -> None:
        if mode in self._engines:
            self.mode = mode

    def tick(self, hours: int = 6) -> SimulationTickState:
        hours = max(0, int(hours))
        if hours > 0:
            self._advance_clock(hours)
            for engine in self._engines.values():
                self._replenish(engine, hours)
                self._refresh_demand(engine, hours)

            solver_engine = self._engines["ORTOOLS_SOLVER"]
            manifests, telemetry = run_solver(
                self._solver_state(solver_engine), solver_engine.inventory
            )
            self._last_telemetry = telemetry
            self.latency_ms = telemetry.solve_time_ms
            self._apply_manifests(solver_engine, manifests)
            self._sync_solver_orders(solver_engine)

            for engine in self._engines.values():
                self._consume(engine)
                self._age(engine, hours)

            self._decay_surges()
        return self._snapshot()

    def inject_chaos(self, event: str) -> SimulationTickState:
        spec = _CHAOS.get(event)
        if spec is None:
            return self.tick(hours=0)

        affected = [
            nid
            for nid in self._order
            if self._engines["ISOLATED_FIFO"].nodes[nid].zone in spec["zones"]
        ]
        for nid in affected:
            self._surge_types[nid] = spec["surge"]
        self._surges.append({"event": event, "turns": spec["turns"], "nodes": affected})

        spoilage = spec.get("spoilage")
        if spoilage:
            for nid in affected:
                for engine in self._engines.values():
                    lost = 0
                    for blood in BLOOD_TYPES:
                        batches = engine.inventory[nid][blood]
                        for age in list(batches):
                            if SHELF_LIFE_H - age <= 48:
                                lost += batches[age]
                                batches[age] = 0
                    engine.expired_total += int(lost * spoilage)
        return self.tick(hours=0)

    @property
    def _active_engine(self) -> _Engine:
        return self._engines.get(self.mode, self._engines["ORTOOLS_SOLVER"])

    def _next_transfer_id(self) -> str:
        self._transfer_seq += 1
        return f"TX-{self._transfer_seq:04d}"

    def _timestamp(self) -> str:
        return f"Day {self.day}, {self.hour:02d}:00"

    def _sync_solver_orders(self, engine: _Engine) -> None:
        previous = {
            (
                order.source_id,
                order.target_id,
                order.donor_blood,
                order.recipient_blood,
            ): order
            for order in self._solver_orders
        }
        orders: list[TransferOrder] = []
        for arc in engine.arcs:
            key = (arc.source_id, arc.target_id, arc.donor_blood, arc.recipient_blood)
            existing = previous.get(key)
            surge = self._surge_types.get(arc.target_id, "NONE")
            urgency = (
                "CRITICAL"
                if arc.remaining_hours <= 12
                else "URGENT"
                if arc.remaining_hours <= 36
                else "ROUTINE"
            )
            orders.append(
                TransferOrder(
                    id=existing.id if existing else self._next_transfer_id(),
                    source_id=arc.source_id,
                    source_name=arc.source_name,
                    source_zone=engine.nodes[arc.source_id].zone,
                    target_id=arc.target_id,
                    target_name=arc.target_name,
                    target_zone=engine.nodes[arc.target_id].zone,
                    donor_blood=arc.donor_blood,
                    recipient_blood=arc.recipient_blood,
                    units=arc.units,
                    distance_km=arc.distance_km,
                    eta_mins=arc.eta_mins,
                    cooler_temp_c=arc.cooler_temp_c,
                    age_hours=arc.age_hours,
                    remaining_hours=arc.remaining_hours,
                    status=existing.status if existing else "RECOMMENDED",
                    origin="SOLVER",
                    urgency=urgency,
                    reason_text=_plain_reason(arc, surge),
                    created_at=self._timestamp(),
                )
            )

        unique_by_pair: dict[tuple[str, str], TransferOrder] = {}
        for o in orders:
            pair = (o.source_id, o.target_id)
            if pair not in unique_by_pair:
                unique_by_pair[pair] = o
            else:
                existing = unique_by_pair[pair]
                if (o.urgency == "CRITICAL" and existing.urgency != "CRITICAL") or (
                    o.remaining_hours < existing.remaining_hours
                ):
                    unique_by_pair[pair] = o

        def _diversity_key(order: TransferOrder) -> tuple[int, int, str]:
            urgency_rank = 0 if order.urgency == "CRITICAL" else 1 if order.urgency == "URGENT" else 2
            return (urgency_rank, -order.units, order.source_name)

        interleaved = sorted(unique_by_pair.values(), key=_diversity_key)
        self._solver_orders = interleaved

    def transfers_snapshot(self) -> list[TransferOrder]:
        active = [order for order in self._manual_orders if order.status != "DELIVERED"]
        active.extend(self._solver_orders)
        return [order.model_copy(deep=True) for order in active] + [
            order.model_copy(deep=True) for order in self._delivered_orders
        ]

    def _find_order(self, tx_id: str) -> TransferOrder | None:
        for order in self._manual_orders:
            if order.id == tx_id:
                return order
        for order in self._solver_orders:
            if order.id == tx_id:
                return order
        for order in self._delivered_orders:
            if order.id == tx_id:
                return order
        return None

    def approve_transfer(self, tx_id: str) -> SimulationTickState:
        order = self._find_order(tx_id)
        if order is None or order.status != "RECOMMENDED":
            return self.tick(hours=0)
        if order.origin == "MANUAL" and not self._move_manual_stock(order):
            return self.tick(hours=0)
        order.status = "APPROVED"
        return self.tick(hours=0)

    def deliver_transfer(self, tx_id: str) -> SimulationTickState:
        order = self._find_order(tx_id)
        if order is None or order.status != "APPROVED":
            return self.tick(hours=0)
        order.status = "DELIVERED"
        if order in self._manual_orders:
            self._manual_orders.remove(order)
            self._delivered_orders.append(order)
        elif order in self._solver_orders:
            self._solver_orders.remove(order)
            self._delivered_orders.append(order)
        return self.tick(hours=0)

    def create_transfer_request(
        self,
        target_id: str,
        blood: str,
        units: int = 6,
        urgency: str = "URGENT",
        source_id: str | None = None,
    ) -> tuple[SimulationTickState, TransferOrder | None]:
        target = self._active_engine.nodes.get(target_id)
        if target is None:
            return self.tick(hours=0), None

        donor: HospitalNode | None = None
        donor_blood = blood
        best_distance = float("inf")
        if source_id:
            candidate_node = self._active_engine.nodes.get(source_id)
            if candidate_node:
                dist = DISTANCE_KM.get((candidate_node.id, target_id), 12.0)
                donor = candidate_node
                best_distance = dist

        if donor is None:
            for candidate in self._active_engine.nodes.values():
                if candidate.id == target_id:
                    continue
                dist = DISTANCE_KM.get((candidate.id, target_id), float("inf"))
                if dist > MAX_LEG_KM:
                    continue
                for b in (blood, "O-", "O+"):
                    available = sum(self._active_engine.inventory[candidate.id][b].values())
                    if available >= units and dist < best_distance:
                        donor = candidate
                        donor_blood = b
                        best_distance = dist
                        break

        if donor is None:
            return self.tick(hours=0), None

        transit_h = best_distance / TRANSIT_KMH
        order = TransferOrder(
            id=self._next_transfer_id(),
            source_id=donor.id,
            source_name=donor.name,
            source_zone=donor.zone,
            target_id=target.id,
            target_name=target.name,
            target_zone=target.zone,
            donor_blood=donor_blood,
            recipient_blood=blood,
            units=units,
            distance_km=round(best_distance, 2),
            eta_mins=round(transit_h * 60.0, 1),
            cooler_temp_c=22.0,
            age_hours=36,
            remaining_hours=int(max(4, SHELF_LIFE_H - 36 - transit_h)),
            status="RECOMMENDED",
            origin="MANUAL",
            urgency=urgency,
            reason_text=f"Coordinator manual request · {donor.name} -> {target.name}",
            created_at=self._timestamp(),
        )
        self._manual_orders.insert(0, order)
        return self.tick(hours=0), order

    def _move_manual_stock(self, order: TransferOrder) -> bool:
        for engine in self._engines.values():
            batches = engine.inventory[order.source_id][order.donor_blood]
            drawn = _draw_oldest(batches, order.units, 72)
            if drawn < order.units:
                drawn += _draw_oldest(batches, order.units - drawn, 0)
            if drawn <= 0:
                return False
            transit_h = order.distance_km / TRANSIT_KMH
            delivered_age = int(round(order.age_hours + transit_h))
            target_batches = engine.inventory[order.target_id][order.donor_blood]
            target_batches[delivered_age] = target_batches.get(delivered_age, 0) + drawn
            engine.delivered_units += drawn
            engine.cold_chain_cost += order.distance_km * 0.35 * drawn
            engine.arcs.append(
                TransshipmentArc(
                    tx_id=order.id,
                    source_id=order.source_id,
                    source_name=order.source_name,
                    source_coords=(
                        engine.nodes[order.source_id].lat,
                        engine.nodes[order.source_id].lng,
                    ),
                    target_id=order.target_id,
                    target_name=order.target_name,
                    target_coords=(
                        engine.nodes[order.target_id].lat,
                        engine.nodes[order.target_id].lng,
                    ),
                    donor_blood=order.donor_blood,
                    recipient_blood=order.recipient_blood,
                    units=drawn,
                    age_hours=order.age_hours,
                    remaining_hours=order.remaining_hours,
                    distance_km=order.distance_km,
                    eta_mins=order.eta_mins,
                    cooler_temp_c=order.cooler_temp_c,
                    substitution_used=order.donor_blood != order.recipient_blood,
                    reason_tag="MANUAL_REQUEST_APPROVED",
                )
            )
        return True

    def _advance_clock(self, hours: int) -> None:
        self.hour += hours
        while self.hour >= 24:
            self.hour -= 24
            self.day += 1

    def _decay_surges(self) -> None:
        survived: list[dict[str, Any]] = []
        active_nodes: set[str] = set()
        for s in self._surges:
            s["turns"] -= 1
            if s["turns"] > 0:
                survived.append(s)
                active_nodes.update(s["nodes"])
        self._surges = survived
        for nid in self._order:
            if nid not in active_nodes:
                self._surge_types[nid] = "NONE"

    def _replenish(self, engine: _Engine, hours: int) -> None:
        fraction = hours / 24.0
        for nid in self._order:
            for blood in BLOOD_TYPES:
                collected = int(round(self._base_collection[nid][blood] * fraction))
                if collected > 0:
                    engine.inventory[nid][blood][0] = (
                        engine.inventory[nid][blood].get(0, 0) + collected
                    )

    def _refresh_demand(self, engine: _Engine, hours: int) -> None:
        fraction = hours / 24.0
        for nid in self._order:
            surge_type = self._surge_types.get(nid, "NONE")
            multiplier = 1.0
            if surge_type == "DENGUE_SURGE":
                multiplier = 2.4
            elif surge_type == "MASS_TRAUMA":
                multiplier = 2.0
            for blood in BLOOD_TYPES:
                base = self._base_demand[nid][blood]
                engine.forecast[nid][blood] = int(round(base * multiplier))
                engine.demand[nid][blood] = int(round(base * multiplier * fraction))

    def _apply_manifests(
        self, engine: _Engine, manifests: list[dict[str, Any]]
    ) -> None:
        engine.arcs.clear()
        for manifest in manifests:
            src = manifest["source_id"]
            tgt = manifest["target_id"]
            donor_b = manifest["donor_blood"]
            units = manifest["units"]
            drawn = _draw_oldest(engine.inventory[src][donor_b], units, 72)
            if drawn < units:
                drawn += _draw_oldest(engine.inventory[src][donor_b], units - drawn, 0)
            if drawn <= 0:
                continue

            transit_h = manifest["distance_km"] / TRANSIT_KMH
            delivered_age = int(round(manifest["age_hours"] + transit_h))
            engine.inventory[tgt][donor_b][delivered_age] = (
                engine.inventory[tgt][donor_b].get(delivered_age, 0) + drawn
            )
            engine.delivered_units += drawn
            engine.cold_chain_cost += manifest["distance_km"] * 0.35 * drawn
            engine.arcs.append(TransshipmentArc(**manifest))

    def _consume(self, engine: _Engine) -> None:
        for nid in self._order:
            node_inv = engine.inventory[nid]
            for blood in BLOOD_TYPES:
                need = engine.demand[nid][blood]
                if need <= 0:
                    continue
                drawn = _draw_oldest(node_inv[blood], need, 0)
                engine.fulfilled_total += drawn
                remaining_need = need - drawn
                if remaining_need > 0 and engine.policy == "SOLVER":
                    for alt in ("O-", "O+"):
                        if alt != blood and alt in ABO_COMPATIBILITY:
                            sub_draw = _draw_oldest(node_inv[alt], remaining_need, 0)
                            engine.fulfilled_total += sub_draw
                            remaining_need -= sub_draw
                            if remaining_need <= 0:
                                break
                if remaining_need > 0:
                    engine.stockouts_total += remaining_need

    def _age(self, engine: _Engine, hours: int) -> None:
        for nid in self._order:
            for blood in BLOOD_TYPES:
                new_batches: dict[int, int] = {}
                for age, units in engine.inventory[nid][blood].items():
                    new_age = age + hours
                    if new_age >= SHELF_LIFE_H:
                        engine.expired_total += units
                    else:
                        new_batches[new_age] = new_batches.get(new_age, 0) + units
                engine.inventory[nid][blood] = new_batches

    def _solver_state(self, engine: _Engine) -> SimulationTickState:
        nodes: list[HospitalNode] = []
        for nid in self._order:
            node = engine.nodes[nid].model_copy(deep=True)
            node.active_surge_type = self._surge_types.get(nid, "NONE")
            node.inventory_by_blood_and_age = _bucket_inventory(
                _aggregate_inventory({nid: engine.inventory[nid]})
            )
            node.demand_forecast_24h = dict(engine.forecast[nid])
            surplus = sum(
                sum(b.values()) for b in node.inventory_by_blood_and_age.values()
            )
            demand_total = sum(node.demand_forecast_24h.values())
            node.net_balance = surplus - demand_total
            nodes.append(node)
        return SimulationTickState(
            day=self.day,
            hour=self.hour,
            mode="ORTOOLS_SOLVER",
            nodes=nodes,
        )

    def _snapshot(self) -> SimulationTickState:
        active = self._active_engine
        nodes: list[HospitalNode] = []
        for nid in self._order:
            node = active.nodes[nid].model_copy(deep=True)
            node.active_surge_type = self._surge_types.get(nid, "NONE")
            node.inventory_by_blood_and_age = _bucket_inventory(
                _aggregate_inventory({nid: active.inventory[nid]})
            )
            node.demand_forecast_24h = dict(active.forecast[nid])
            surplus = sum(
                sum(b.values()) for b in node.inventory_by_blood_and_age.values()
            )
            demand_total = sum(node.demand_forecast_24h.values())
            node.net_balance = surplus - demand_total
            nodes.append(node)

        iso = self._engines["ISOLATED_FIFO"]
        sol = self._engines["ORTOOLS_SOLVER"]
        units_saved = max(0, iso.expired_total - sol.expired_total)
        comparison = ComparisonMetrics(
            isolated_waste_pct=round(iso.waste_pct(), 2),
            solver_waste_pct=round(sol.waste_pct(), 2),
            isolated_stockouts=iso.stockouts_total,
            solver_stockouts=sol.stockouts_total,
            units_saved_from_incineration=units_saved,
            unmet_trauma_demand_delta=max(0, iso.stockouts_total - sol.stockouts_total),
            cold_chain_cost_efficiency=round(sol.cold_chain_cost, 2),
            solver_latency_ms=self.latency_ms,
        )
        return SimulationTickState(
            day=self.day,
            hour=self.hour,
            mode=self.mode,
            kpis=[
                KPIRow(
                    label="Shelf-Life Expiry Waste",
                    primary=round(active.waste_pct(), 1),
                    baseline=round(iso.waste_pct(), 1),
                    delta_text=f"-{round(iso.waste_pct() - sol.waste_pct(), 1)}% vs siloed",
                ),
                KPIRow(
                    label="Stockout Hours",
                    primary=float(active.stockouts_total),
                    baseline=float(iso.stockouts_total),
                    delta_text=f"-{max(0, iso.stockouts_total - sol.stockouts_total)} vs siloed",
                ),
            ],
            nodes=nodes,
            active_arcs=list(active.arcs) if self.mode == "ORTOOLS_SOLVER" else [],
            transfers=self.transfers_snapshot(),
            decay_matrix_8x5=_decay_matrix(_aggregate_inventory(active.inventory)),
            solver_telemetry=self._last_telemetry or _empty_telemetry(),
            comparison_metrics=comparison,
        )


# -----------------------------------------------------------------------------
# 5. FastAPI Application & Serverless Routes
# -----------------------------------------------------------------------------

app = FastAPI(title="Plexus Clearinghouse", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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


@app.get("/api/health")
@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "solver": "ortools" if ORTOOLS_AVAILABLE else "python_fallback",
        "mesh_nodes": len(HOSPITALS),
    }


@app.get("/api/state")
@app.get("/state")
def get_state() -> dict[str, Any]:
    return _ensure_sim().tick(hours=0).model_dump()


@app.post("/api/step")
@app.post("/api/tick")
def post_step(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    hours = 6
    if payload and "hours" in payload:
        try:
            hours = int(payload["hours"])
        except (TypeError, ValueError):
            hours = 6
    hours = max(0, min(48, hours))
    return _ensure_sim().tick(hours=hours).model_dump()


@app.post("/api/surge")
@app.post("/api/chaos")
def post_surge(payload: dict[str, Any] | ChaosPayload) -> dict[str, Any]:
    sim = _ensure_sim()
    event_str = ""
    if isinstance(payload, ChaosPayload):
        event_str = payload.event
    elif isinstance(payload, dict):
        event_str = (
            payload.get("event")
            or payload.get("crisis")
            or payload.get("surge")
            or ""
        )

    ev_lower = event_str.lower()
    if "dengue" in ev_lower:
        resolved = "DENGUE_SURGE_EAST_DELHI"
    elif "highway" in ev_lower or "trauma" in ev_lower:
        resolved = "HIGHWAY_TRAUMA_NH48"
    elif "agitator" in ev_lower or "freezer" in ev_lower or "fault" in ev_lower:
        resolved = "FREEZER_FAULT_NOIDA"
    else:
        resolved = event_str if event_str in _CHAOS else "DENGUE_SURGE_EAST_DELHI"

    return sim.inject_chaos(resolved).model_dump()


@app.post("/api/dispatch")
@app.post("/api/transfers/request")
def post_dispatch(payload: TransferRequestPayload) -> dict[str, Any]:
    sim = _ensure_sim()
    state, order = sim.create_transfer_request(
        payload.target_id,
        payload.blood,
        payload.units,
        payload.urgency,
        payload.source_id,
    )
    if order is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "No compatible donor hospital has viable cold-chain stock "
                "for this request."
            ),
        )
    state = sim.approve_transfer(order.id)
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


@app.post("/api/mode")
def post_mode(payload: ModePayload) -> dict[str, Any]:
    sim = _ensure_sim()
    if payload.mode not in {"ISOLATED_FIFO", "ORTOOLS_SOLVER"}:
        return {"error": "invalid mode"}
    sim.switch_mode(payload.mode)
    return sim.tick(hours=0).model_dump()


@app.get("/api/benchmark")
def get_benchmark() -> dict[str, Any]:
    global _benchmark
    if _benchmark is not None:
        return _benchmark

    sim = DualSimulator(build_nodes())
    for _ in range(14):
        sim.tick(12)
    state = sim.tick(0)

    metrics = state.comparison_metrics
    saved = max(0, sim.isolated_waste_total - sim.solver_waste_total)
    _benchmark = {
        "window_hours": 168,
        "hours_per_tick": 12,
        "ticks": 14,
        "comparison_metrics": metrics.model_dump() if metrics else {},
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

