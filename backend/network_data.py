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
        "name": "AIIMS Trauma & Dengue Center",
        "zone": "CENTRAL_DELHI",
        "lat": 28.567,
        "lng": 77.209,
        "trauma_level": 3,
        "baseline_surplus": {'O+': 25, 'A+': 16, 'B+': 14, 'AB+': 6, 'O-': 4, 'A-': 3, 'B-': 2, 'AB-': 2},
        "baseline_demand": {'O+': 30, 'A+': 19, 'B+': 17, 'AB+': 8, 'O-': 4, 'A-': 3, 'B-': 3, 'AB-': 1},
        "surge_hot": True,
    },
    {
        "id": "ND-02",
        "name": "Safdarjung Super Specialty",
        "zone": "SOUTH_DELHI",
        "lat": 28.552,
        "lng": 77.195,
        "trauma_level": 2,
        "baseline_surplus": {'O+': 17, 'A+': 11, 'B+': 10, 'AB+': 4, 'O-': 2, 'A-': 2, 'B-': 1, 'AB-': 2},
        "baseline_demand": {'O+': 30, 'A+': 19, 'B+': 17, 'AB+': 8, 'O-': 4, 'A-': 3, 'B-': 3, 'AB-': 1},
        "surge_hot": True,
    },
    {
        "id": "ND-03",
        "name": "Max Super Specialty Saket",
        "zone": "SOUTH_DELHI",
        "lat": 28.53,
        "lng": 77.214,
        "trauma_level": 2,
        "baseline_surplus": {'O+': 39, 'A+': 25, 'B+': 22, 'AB+': 10, 'O-': 6, 'A-': 4, 'B-': 3, 'AB-': 3},
        "baseline_demand": {'O+': 30, 'A+': 19, 'B+': 17, 'AB+': 8, 'O-': 4, 'A-': 3, 'B-': 3, 'AB-': 1},
        "surge_hot": False,
    },
    {
        "id": "ND-04",
        "name": "Fortis Hospital Sec-62 Noida",
        "zone": "NOIDA",
        "lat": 28.62,
        "lng": 77.33,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 33, 'A+': 20, 'B+': 19, 'AB+': 8, 'O-': 5, 'A-': 4, 'B-': 3, 'AB-': 1},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-05",
        "name": "Medanta The Medicity Hub",
        "zone": "GURUGRAM",
        "lat": 28.535,
        "lng": 77.118,
        "trauma_level": 2,
        "baseline_surplus": {'O+': 47, 'A+': 30, 'B+': 27, 'AB+': 12, 'O-': 7, 'A-': 5, 'B-': 4, 'AB-': 3},
        "baseline_demand": {'O+': 30, 'A+': 19, 'B+': 17, 'AB+': 8, 'O-': 4, 'A-': 3, 'B-': 3, 'AB-': 1},
        "surge_hot": False,
    },
    {
        "id": "ND-06",
        "name": "Fortis Escorts Heart Okhla",
        "zone": "SOUTH_DELHI",
        "lat": 28.56,
        "lng": 77.278,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 24, 'A+': 15, 'B+': 14, 'AB+': 6, 'O-': 3, 'A-': 3, 'B-': 2, 'AB-': 1},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-07",
        "name": "GTB Hospital Dilshad Garden",
        "zone": "EAST_DELHI",
        "lat": 28.645,
        "lng": 77.309,
        "trauma_level": 2,
        "baseline_surplus": {'O+': 24, 'A+': 15, 'B+': 14, 'AB+': 6, 'O-': 3, 'A-': 3, 'B-': 2, 'AB-': 1},
        "baseline_demand": {'O+': 30, 'A+': 19, 'B+': 17, 'AB+': 8, 'O-': 4, 'A-': 3, 'B-': 3, 'AB-': 1},
        "surge_hot": True,
    },
    {
        "id": "ND-08",
        "name": "Dr. RML Hospital Connaught",
        "zone": "CENTRAL_DELHI",
        "lat": 28.625,
        "lng": 77.202,
        "trauma_level": 2,
        "baseline_surplus": {'O+': 31, 'A+': 19, 'B+': 18, 'AB+': 8, 'O-': 4, 'A-': 4, 'B-': 3, 'AB-': 1},
        "baseline_demand": {'O+': 30, 'A+': 19, 'B+': 17, 'AB+': 8, 'O-': 4, 'A-': 3, 'B-': 3, 'AB-': 1},
        "surge_hot": False,
    },
    {
        "id": "ND-09",
        "name": "Lok Nayak Jai Prakash (LNJP)",
        "zone": "CENTRAL_DELHI",
        "lat": 28.636,
        "lng": 77.239,
        "trauma_level": 2,
        "baseline_surplus": {'O+': 24, 'A+': 15, 'B+': 14, 'AB+': 6, 'O-': 4, 'A-': 3, 'B-': 2, 'AB-': 2},
        "baseline_demand": {'O+': 30, 'A+': 19, 'B+': 17, 'AB+': 8, 'O-': 4, 'A-': 3, 'B-': 3, 'AB-': 1},
        "surge_hot": True,
    },
    {
        "id": "ND-10",
        "name": "Sir Ganga Ram Hospital",
        "zone": "CENTRAL_DELHI",
        "lat": 28.618,
        "lng": 77.189,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 22, 'A+': 14, 'B+': 13, 'AB+': 6, 'O-': 3, 'A-': 3, 'B-': 2, 'AB-': 1},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-11",
        "name": "Indraprastha Apollo Hospital",
        "zone": "SOUTH_DELHI",
        "lat": 28.54,
        "lng": 77.284,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 29, 'A+': 18, 'B+': 16, 'AB+': 7, 'O-': 4, 'A-': 3, 'B-': 2, 'AB-': 3},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-12",
        "name": "Rajiv Gandhi Super Specialty",
        "zone": "EAST_DELHI",
        "lat": 28.642,
        "lng": 77.318,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 18, 'A+': 11, 'B+': 10, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 1},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": True,
    },
    {
        "id": "ND-13",
        "name": "Fortis Flt Lt Rajan Dhall",
        "zone": "SOUTH_DELHI",
        "lat": 28.532,
        "lng": 77.156,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 23, 'A+': 14, 'B+': 13, 'AB+': 6, 'O-': 3, 'A-': 3, 'B-': 2, 'AB-': 1},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-14",
        "name": "BLK-Max Super Specialty",
        "zone": "CENTRAL_DELHI",
        "lat": 28.622,
        "lng": 77.181,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 22, 'A+': 14, 'B+': 12, 'AB+': 6, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 1},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-15",
        "name": "Manipal Hospital Dwarka",
        "zone": "WEST_DELHI",
        "lat": 28.58,
        "lng": 77.11,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 23, 'A+': 14, 'B+': 13, 'AB+': 6, 'O-': 3, 'A-': 3, 'B-': 2, 'AB-': 1},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-16",
        "name": "St. Stephens Hospital",
        "zone": "NORTH_DELHI",
        "lat": 28.64,
        "lng": 77.217,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 22, 'A+': 14, 'B+': 13, 'AB+': 6, 'O-': 3, 'A-': 3, 'B-': 2, 'AB-': 0},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-17",
        "name": "Saroj Super Specialty Rohini",
        "zone": "NORTH_DELHI",
        "lat": 28.64,
        "lng": 77.135,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 20, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 1},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-18",
        "name": "Venkateshwar Hospital Dwarka",
        "zone": "WEST_DELHI",
        "lat": 28.565,
        "lng": 77.112,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 23, 'A+': 15, 'B+': 13, 'AB+': 6, 'O-': 3, 'A-': 3, 'B-': 2, 'AB-': 1},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-19",
        "name": "Paras Health Sector 43",
        "zone": "GURUGRAM",
        "lat": 28.53,
        "lng": 77.14,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 24, 'A+': 15, 'B+': 14, 'AB+': 6, 'O-': 3, 'A-': 3, 'B-': 2, 'AB-': 1},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-20",
        "name": "Jaypee Hospital Sec-128",
        "zone": "NOIDA",
        "lat": 28.545,
        "lng": 77.33,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 33, 'A+': 21, 'B+': 19, 'AB+': 9, 'O-': 5, 'A-': 4, 'B-': 3, 'AB-': 1},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-21",
        "name": "Deen Dayal Upadhyay Hospital",
        "zone": "WEST_DELHI",
        "lat": 28.615,
        "lng": 77.125,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 22, 'A+': 14, 'B+': 12, 'AB+': 6, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 1},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-22",
        "name": "Sanjay Gandhi Memorial",
        "zone": "NORTH_DELHI",
        "lat": 28.64,
        "lng": 77.12,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 20, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 1},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-23",
        "name": "Artemis Hospital Sector 51",
        "zone": "GURUGRAM",
        "lat": 28.538,
        "lng": 77.13,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 36, 'A+': 23, 'B+': 21, 'AB+': 9, 'O-': 5, 'A-': 4, 'B-': 3, 'AB-': 3},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-24",
        "name": "Max Super Specialty Patparganj",
        "zone": "EAST_DELHI",
        "lat": 28.63,
        "lng": 77.304,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 23, 'A+': 15, 'B+': 13, 'AB+': 6, 'O-': 3, 'A-': 3, 'B-': 2, 'AB-': 2},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
        "surge_hot": False,
    },
    {
        "id": "ND-25",
        "name": "Holy Family Hospital Okhla",
        "zone": "SOUTH_DELHI",
        "lat": 28.548,
        "lng": 77.273,
        "trauma_level": 1,
        "baseline_surplus": {'O+': 22, 'A+': 14, 'B+': 13, 'AB+': 6, 'O-': 3, 'A-': 3, 'B-': 2, 'AB-': 1},
        "baseline_demand": {'O+': 21, 'A+': 13, 'B+': 12, 'AB+': 5, 'O-': 3, 'A-': 2, 'B-': 2, 'AB-': 2},
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
