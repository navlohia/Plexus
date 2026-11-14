---
name: blood-or-solver
description: Formulates, implements, and verifies the Google OR-Tools Linear Programming / Minimum-Cost Network Flow solver for 5-day perishable blood platelets and asymmetric ABO/Rh substitution. Load this skill whenever writing or debugging backend optimization, simulation ticks, or inventory clearing logic.
---

# Blood & Platelets Lateral Transshipment Solver Skill

## 1. Mathematical Formulation

Let $N = \{1, 2, \dots, 25\}$ be the set of hospital nodes in the regional clearinghouse, $B = \{\text{O-}, \text{O+}, \text{A-}, \text{A+}, \text{B-}, \text{B+}, \text{AB-}, \text{AB+}\}$ be the 8 blood types, and $A = \{1, 2, \dots, 5\}$ be the discrete age buckets in days (where $a=5$ implies $<24\text{ hours}$ remaining before the $120\text{-hour}$ expiration limit).

### Decision Variables
Let $x_{i, j, b_1, b_2, a} \ge 0$ represent the number of units of blood type $b_1$ of age bucket $a$ shipped from supplier hospital $i \in N$ to receiver hospital $j \in N$ to satisfy demand for blood type $b_2 \in B$.

### ABO/Rh Compatibility & Substitution Penalty Matrix $C(b_1, b_2)$
A donor unit $b_1$ can satisfy recipient demand $b_2$ only if compatible:
- Exact match ($b_1 = b_2$): substitution penalty $\phi(b_1, b_2) = 0$.
- Compatible cross-type match (e.g., $\text{O-} \rightarrow \text{any}$, $\text{O+} \rightarrow \{\text{O+}, \text{A+}, \text{B+}, \text{AB+}\}$, $\text{A+} \rightarrow \text{AB+}$): allowed, but incurs a **Rarity Shadow Price** $\phi(b_1, b_2) > 0$ proportional to the scarcity of $b_1$ (highest for universal $\text{O-}$ so $\text{O-}$ is conserved for trauma unless $b_1$ is expiring within $<24\text{ hours}$).
- Incompatible match: $x_{i, j, b_1, b_2, a} = 0$ (hard constraint).

### Shelf-Life Decay & Expiry Rescue Reward $R(a)$
To force the solver to prioritize clearing older platelets before they expire at $120\text{ hours}$, define an age-weighted rescue reward:
$$R(a) = \alpha \cdot \exp(\beta \cdot a)$$
where units in Day 4 ($72\text{--}96\text{h}$) and Day 5 ($96\text{--}120\text{h}$) carry a high urgency reward when routed to a node $j$ with immediate deterministic surgical or dengue surge demand $D_{j, b_2}$.

### Objective Function
Minimize total regional cost across each simulation tick:
$$\min \sum_{i \in N} \sum_{j \in N} \sum_{b_1 \in B} \sum_{b_2 \in B} \sum_{a \in A} \left( c_{\text{transit}} \cdot d_{i,j} + \phi(b_1, b_2) - R(a) \right) x_{i, j, b_1, b_2, a} + \sum_{j \in N} \sum_{b_2 \in B} P_{\text{stockout}} \cdot U_{j, b_2} + \sum_{i \in N} \sum_{b_1 \in B} P_{\text{waste}} \cdot W_{i, b_1}$$
where:
- $d_{i,j}$ is the road distance in $\text{km}$ between hospitals $i$ and $j$.
- $U_{j, b_2} \ge 0$ is the unmet critical demand slack variable at hospital $j$ (heavily penalized by $P_{\text{stockout}} = 10000$).
- $W_{i, b_1} \ge 0$ is the expiring Day-5 inventory left unutilized at hospital $i$ (penalized by $P_{\text{waste}} = 2500$).

### Hard Constraints
1. **Supply Conservation:** Outgoing transshipments plus local consumption at hospital $i$ cannot exceed current inventory $I_{i, b_1, a}$.
2. **Cold-Chain Transit Viability:** If remaining shelf-life $(120 - \text{age\_hours}) \le \text{transit\_hours}(i,j) + 4\text{h buffer}$, force $x_{i,j,b_1,b_2,a} = 0$.
3. **FIFO vs. FEFO Comparison:** In `backend/simulator.py`, execute both:
   - **Baseline Mode (`ISOLATED_FIFO`):** $x_{i,j} = 0$ for all $i \neq j$. Hospitals only use their own stock.
   - **Clearinghouse Mode (`ORTOOLS_SOLVER`):** Full lateral transshipment active using `ortools.linear_solver.pywraplp` (`GLOP` or `SCIP`/`CBC`).

## 2. Implementation Checklist
- Always use `pywraplp.Solver.CreateSolver('GLOP')` or `'CBC'` from `ortools.linear_solver` for sub-$50\text{ms}$ solve times.
- Return structured transshipment manifests including `source_id`, `target_id`, `donor_blood_type`, `recipient_blood_type`, `units`, `batch_age_hours`, `distance_km`, `eta_minutes`, and `reason_code` (e.g., `"EXPIRY_RESCUE_32H"` or `"DENGUE_SURGE_COVER"`).