export type Mode = "ISOLATED_FIFO" | "ORTOOLS_SOLVER";

export type BloodType =
  | "O-"
  | "O+"
  | "A-"
  | "A+"
  | "B-"
  | "B+"
  | "AB-"
  | "AB+";

export interface HospitalNode {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  trauma_level: number;
  active_surge_type: string;
  inventory_by_blood_and_age: Record<string, Record<string, number>>;
  demand_forecast_24h: Record<string, number>;
  net_balance: number;
}

export interface TransshipmentArc {
  tx_id: string;
  source_id: string;
  source_name: string;
  source_coords: [number, number];
  target_id: string;
  target_name: string;
  target_coords: [number, number];
  donor_blood: string;
  recipient_blood: string;
  units: number;
  age_hours: number;
  remaining_hours: number;
  distance_km: number;
  eta_mins: number;
  cooler_temp_c: number;
  substitution_used: boolean;
  reason_tag: string;
}

export type TransferStatus = "RECOMMENDED" | "APPROVED" | "DELIVERED";
export type TransferUrgency = "ROUTINE" | "URGENT" | "CRITICAL";

export interface TransferOrder {
  id: string;
  source_id: string;
  source_name: string;
  source_zone: string;
  target_id: string;
  target_name: string;
  target_zone: string;
  donor_blood: string;
  recipient_blood: string;
  units: number;
  distance_km: number;
  eta_mins: number;
  cooler_temp_c: number;
  age_hours: number;
  remaining_hours: number;
  status: TransferStatus;
  origin: "SOLVER" | "MANUAL";
  urgency: TransferUrgency;
  reason_text: string;
  created_at: string;
}

export interface KpiRow {
  label: string;
  primary: number;
  baseline: number | null;
  delta_text: string;
}

export interface SolverTelemetry {
  solve_time_ms: number;
  objective_value: number;
  active_arc_count: number;
  expiry_penalty_avoided: number;
  o_minus_buffer: number;
  arcs_generated: number;
}

export interface ComparisonMetrics {
  isolated_waste_pct: number;
  solver_waste_pct: number;
  isolated_stockouts: number;
  solver_stockouts: number;
  units_saved_from_incineration: number;
  unmet_trauma_demand_delta: number;
  cold_chain_cost_efficiency: number;
  solver_latency_ms: number;
}

export interface BenchmarkResult {
  window_hours: number;
  hours_per_tick: number;
  ticks: number;
  comparison_metrics: ComparisonMetrics;
  solver_telemetry: SolverTelemetry;
  isolated_waste_units: number;
  solver_waste_units: number;
  units_saved_from_incineration: number;
  value_saved_inr_lakhs: number;
}

export interface TickState {
  day: number;
  hour: number;
  mode: Mode;
  kpis: KpiRow[];
  nodes: HospitalNode[];
  active_arcs: TransshipmentArc[];
  transfers: TransferOrder[];
  decay_matrix_8x5: number[][];
  solver_telemetry: SolverTelemetry | null;
  comparison_metrics: ComparisonMetrics | null;
}

export interface TransferRequestInput {
  target_id: string;
  source_id?: string;
  blood: BloodType;
  units: number;
  urgency: TransferUrgency;
}

export type ScenarioKey = "dengue" | "trauma" | "coldchain";
