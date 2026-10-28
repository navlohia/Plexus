"""25 realistic Delhi-NCR hospital coordinates, zones, trauma levels,
asymmetric platelet surplus/deficit baselines for the HEMO-GRID clearinghouse."""

from __future__ import annotations

import math
from typing import Any

from .models import HospitalNode

# Clean-room derived Delhi-NCR hospital approximations for simulation use.
# These are not purporting to be authoritative facility registries; they are
# representative coordinates for a 25-node tactical simulation mesh.
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

# Asymmetric substitution rule table: donor -> set of eligible recipients.
# Derived from standard platelet/RBC compatibility guidance for the simulation.
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

# Rarity shadow penalties applied when a scarce donor type is consumed as a
# cross-type substitute instead of being conserved for an exact-match trauma surge.
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

# Approximate inter-node distances (km) on a Delhi-NCR road grid for the LP.
# Symmetric approximation is acceptable for the flow model.
DISTANCE_KM: dict[tuple[str, str], float] = {}

_BLOOD_ORDER = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]

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
                # Rough degree-distance heater; good enough for a tactical LP price.
                delta_lat = lp[0] - rp[0]
                delta_lng = lp[1] - rp[1]
                deg = (delta_lat * delta_lat + delta_lng * delta_lng) ** 0.5
                km = float(round(deg * 111.0, 2))
                table[key] = km
                table[(right, left)] = km
    DISTANCE_KM = table


_build_distance_lookup()


# Inventory buckets are expressed as REMAINING shelf life, matching the UI
# decay heatmap: 1 = 0-24h (critical) ... 5 = 96-120h (fresh).
_SHELF_LIFE_H = 120


def initial_inventory(hospital: dict[str, Any]) -> dict[str, dict[int, int]]:
    """Remaining-shelf-life bucketed platelet inventory.

    Peripheral elective/maternity nodes over-collect on weekends and carry a
    large backlog of near-expiry stock (bucket 1-2). Trauma centres hold
    fresher stock but carry the bulk of the regional demand. Without a
    clearinghouse that mismatch is exactly what incinerates platelets.
    """
    peripheral = hospital["trauma_level"] <= 1
    weights = (
        (0.64, 0.14, 0.10, 0.07, 0.05)
        if peripheral
        else (0.12, 0.16, 0.20, 0.24, 0.28)
    )
    buckets: dict[str, dict[int, int]] = {}
    for blood in _BLOOD_ORDER:
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


def blood_types() -> list[str]:
    return list(_BLOOD_ORDER)


def age_buckets() -> list[int]:
    return [1, 2, 3, 4, 5]
