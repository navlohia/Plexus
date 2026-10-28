"""Deterministic CLI verification suite for the HEMO-GRID OR-Tools solver.

Simulates seven days (14 x 12h ticks) of the exact same demand stream through
both engines and asserts the architecture-locked guardrails:

1. Zero incompatible ABO/Rh transfusions on any dispatched arc.
2. Zero transshipments that would expire en route (age + transit >= 120h).
3. Solver latency < 150 ms per tick across the 25-node mesh.
4. Isolated FIFO waste >= 20% while the solver waste stays <= 4%.
5. Solver stockouts never exceed the siloed baseline.
"""

from __future__ import annotations

import os
import sys
import time

sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)

from backend.models import TransshipmentArc  # noqa: E402
from backend.network_data import ABO_COMPATIBILITY, build_nodes  # noqa: E402
from backend.simulator import DualSimulator  # noqa: E402

TICKS = 14
HOURS_PER_TICK = 12


def run() -> int:
    seed_nodes = build_nodes()
    fifo = DualSimulator(seed_nodes)
    fifo.switch_mode("ISOLATED_FIFO")
    solver = DualSimulator(seed_nodes)
    solver.switch_mode("ORTOOLS_SOLVER")

    latencies: list[float] = []
    arcs: list[TransshipmentArc] = []
    delivered = 0
    last_solver_state = None

    for _ in range(TICKS):
        fifo.tick(HOURS_PER_TICK)
        started = time.perf_counter()
        last_solver_state = solver.tick(HOURS_PER_TICK)
        latencies.append((time.perf_counter() - started) * 1000.0)
        arcs.extend(last_solver_state.active_arcs)
        delivered += sum(arc.units for arc in last_solver_state.active_arcs)

    fifo_waste = fifo.waste_pct("ISOLATED_FIFO")
    solver_waste = solver.waste_pct("ORTOOLS_SOLVER")
    max_latency = max(latencies)
    mean_latency = sum(latencies) / len(latencies)

    incompatible = [
        arc
        for arc in arcs
        if arc.recipient_blood not in ABO_COMPATIBILITY[arc.donor_blood]
    ]
    expiry_en_route = [
        arc
        for arc in arcs
        if arc.age_hours + arc.eta_mins / 60.0 >= 120.0 or arc.remaining_hours <= 0
    ]

    checks: list[tuple[str, bool, str]] = [
        (
            "Zero ABO/Rh incompatible transfusions",
            not incompatible,
            f"{len(incompatible)} incompatible arcs across {len(arcs)} dispatches",
        ),
        (
            "Zero expiry-in-transit cold-chain legs",
            not expiry_en_route,
            f"{len(expiry_en_route)} arcs would land at/after 120h",
        ),
        (
            "Solver latency < 150ms per tick",
            max_latency < 150.0,
            f"max {max_latency:.1f}ms / mean {mean_latency:.1f}ms over {len(latencies)} ticks",
        ),
        (
            "Isolated FIFO waste >= 20%",
            fifo_waste >= 20.0,
            f"FIFO waste {fifo_waste:.2f}% "
            f"({fifo.isolated_waste_total} units incinerated in 7 days)",
        ),
        (
            "OR-Tools solver waste <= 4%",
            solver_waste <= 4.0,
            f"solver waste {solver_waste:.2f}% "
            f"({solver.solver_waste_total} units lost)",
        ),
        (
            "Solver stockouts <= FIFO stockouts",
            solver.solver_stockout_total <= solver.isolated_stockout_total,
            f"solver={solver.solver_stockout_total} vs fifo={solver.isolated_stockout_total}",
        ),
        (
            "Solver dispatched transshipments",
            delivered > 0,
            f"{delivered} units moved across {len(arcs)} cold-chain legs",
        ),
    ]

    print("=" * 74)
    print("HEMO-GRID // SOLVER VERIFICATION SUITE")
    print(f"25-node mesh | {TICKS} ticks x {HOURS_PER_TICK}h | identical demand stream")
    print("=" * 74)
    passed = 0
    for name, ok, detail in checks:
        if ok:
            passed += 1
        print(f"[{'PASS' if ok else 'FAIL'}] {name}")
        if detail:
            print(f"       {detail}")
    print("-" * 74)
    print(f"waste delta: {fifo_waste - solver_waste:+.2f} pts  |  "
          f"units rescued from incineration: "
          f"{max(0, fifo.isolated_waste_total - solver.solver_waste_total)}")
    print(f"RESULTS: {passed}/{len(checks)} checks passed")
    print("=" * 74)

    return 0 if passed == len(checks) else 1


if __name__ == "__main__":
    sys.exit(run())
