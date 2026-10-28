"""OR-Tools minimum-cost lateral transshipment solver for 5-day platelets.

The model is a capacitated transportation LP over *supply lots* (hospital,
blood group, exact shelf-life age) and *recipient hospitals*. Every candidate
arc is filtered through the medical hard constraints before it enters the model:

* ABO/Rh compatibility (donor group -> recipient group).
* Cold-chain viability: ``120 - age - transit_hours > 4h`` buffer.
* Tactical leg limit (38 km) so the clearinghouse stays an NCR road mesh.

The objective maximises demand covered while preferring the oldest viable
units (expiry rescue) and penalising rare-group substitution, so O- is
conserved for trauma unless it is about to expire.

The constraint matrix is a capacitated bipartite flow (totally unimodular),
so the LP optimum is integral and can be dispatched unit-for-unit.
"""

from __future__ import annotations

import time
from typing import Any

from .models import HospitalNode, SimulationTickState, SolverTelemetry
from .network_data import ABO_COMPATIBILITY, DISTANCE_KM, SUBSTITUTION_PENALTY

BLOOD_TYPES: tuple[str, ...] = ("O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+")

SHELF_LIFE_H = 120.0
TRANSIT_KMH = 45.0
TRANSIT_BUFFER_H = 4.0
MAX_LEG_KM = 38.0
MAX_LEGS_PER_NODE = 10

# Objective coefficients (unitless "clinical utility" scale).
DEMAND_VALUE = 100.0
URGENCY_CRITICAL = 30.0  # <= 12h remaining
URGENCY_RISK = 18.0      # <= 36h remaining
URGENCY_AGING = 6.0      # <= 72h remaining
DISTANCE_COST_PER_KM = 0.35
SUBSTITUTION_MULTIPLIER = 2.0


def run_solver(
    state: SimulationTickState,
    inventory: dict[str, dict[str, dict[int, int]]] | None = None,
) -> tuple[list[dict[str, Any]], SolverTelemetry]:
    """Solve one tick.

    ``inventory`` maps ``node_id -> blood -> {age_hours: units}``. When it is
    omitted the solver reconstructs an approximate age profile from the
    remaining-shelf-life buckets carried by ``state``.
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
    total_demand = {n.id: sum(demand[n.id].values()) for n in nodes}
    compat_demand = {
        n.id: {
            b: sum(demand[n.id].get(r, 0) for r in ABO_COMPATIBILITY[b])
            for b in BLOOD_TYPES
        }
        for n in nodes
    }

    solver = _make_solver()
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
                # Would breach the cold-chain viability buffer: hard constraint.
                continue

            capacity = min(
                lot["units"], compat_demand[recipient.id][blood], total_demand[recipient.id]
            )
            if capacity <= 0:
                continue

            var = solver.NumVar(
                0.0,
                float(capacity),
                f"x_{donor.id}_{recipient.id}_{blood}_{age}",
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
            donor: HospitalNode = arc["donor"]
            recipient: HospitalNode = arc["recipient"]
            blood: str = arc["blood"]
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
                    # Local allocation: consumed in place, not a cold-chain dispatch.
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

        total_o_minus = sum(
            sum(node_inv.get("O-", {}).values()) for node_inv in inv.values()
        )
        o_minus_buffer = 100.0
        if total_o_minus > 0:
            o_minus_buffer = round(
                max(0.0, 100.0 * (1.0 - o_minus_cross / max(1, total_o_minus))), 1
            )

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


# Backwards-compatible alias.
solve = run_solver


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
    """Tactical road mesh: self plus the nearest viable hospital legs."""
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


def _merge_manifests(manifests: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Fold per-lot arcs into one dispatch order per donor/target/group pair."""
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
        existing["units"] += manifest["units"]
        if manifest["age_hours"] > existing["age_hours"]:
            existing["age_hours"] = manifest["age_hours"]
            existing["remaining_hours"] = manifest["remaining_hours"]
        existing["substitution_used"] = (
            existing["donor_blood"] != existing["recipient_blood"]
        )
    return list(merged.values())


def _supply_lots(
    nodes: list[HospitalNode],
    inv: dict[str, dict[str, dict[int, int]]],
) -> list[dict[str, Any]]:
    lots: list[dict[str, Any]] = []
    for node in nodes:
        node_inv = inv.get(node.id, {})
        for blood in BLOOD_TYPES:
            for age, units in node_inv.get(blood, {}).items():
                if units > 0:
                    lots.append(
                        {
                            "node": node,
                            "blood": blood,
                            "age_hours": int(age),
                            "units": int(units),
                        }
                    )
    return lots


def _arc_value(
    blood: str,
    age: int,
    transit_h: float,
    distance_km: float,
    recipient: HospitalNode,
) -> float:
    remaining = SHELF_LIFE_H - age - transit_h
    if remaining <= 12:
        urgency = URGENCY_CRITICAL
    elif remaining <= 36:
        urgency = URGENCY_RISK
    elif remaining <= 72:
        urgency = URGENCY_AGING
    else:
        urgency = 0.0

    penalty = min(
        (
            SUBSTITUTION_PENALTY.get(blood, {}).get(r, 3.0)
            for r in ABO_COMPATIBILITY[blood]
        ),
        default=0.0,
    )
    if recipient.active_surge_type not in ("", "NONE"):
        urgency += 4.0
    return (
        DEMAND_VALUE
        + urgency
        - DISTANCE_COST_PER_KM * distance_km
        - SUBSTITUTION_MULTIPLIER * penalty
    )


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


def _make_solver() -> Any:
    from ortools.linear_solver import pywraplp

    solver = pywraplp.Solver.CreateSolver("GLOP")
    if solver is None:
        solver = pywraplp.Solver.CreateSolver("CBC")
    if solver is None:
        raise RuntimeError("No OR-Tools linear solver backend available")
    solver.SetTimeLimit(2000)
    return solver


def _inventory_from_state(
    nodes: list[HospitalNode],
) -> dict[str, dict[str, dict[int, int]]]:
    """Approximate exact ages from remaining-shelf-life buckets."""
    midpoint_age = {1: 110, 2: 86, 3: 62, 4: 38, 5: 14}
    out: dict[str, dict[str, dict[int, int]]] = {}
    for node in nodes:
        node_inv: dict[str, dict[int, int]] = {}
        for blood in BLOOD_TYPES:
            batches: dict[int, int] = {}
            for bucket in (1, 2, 3, 4, 5):
                units = int(
                    node.inventory_by_blood_and_age.get(blood, {}).get(bucket, 0)
                )
                if units > 0:
                    batches[midpoint_age[bucket]] = units
            node_inv[blood] = batches
        out[node.id] = node_inv
    return out
