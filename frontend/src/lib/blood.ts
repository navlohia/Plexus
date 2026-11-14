import type { BloodType, HospitalNode, TransferOrder } from "../types";

export const BLOOD_TYPES: BloodType[] = [
  "O-",
  "O+",
  "A-",
  "A+",
  "B-",
  "B+",
  "AB-",
  "AB+",
];

export const BUCKETS = [1, 2, 3, 4, 5] as const;

/** Donor group -> recipient groups that can safely receive it. */
export const ABO_COMPATIBILITY: Record<string, string[]> = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

/** 1 = 0-24h remaining ... 5 = 96-120h remaining. */
export const BUCKET_LABELS = ["0–24h", "24–48h", "48–72h", "72–96h", "96–120h"];

export const BLOOD_BADGE =
  "inline-flex items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-rose-400";

const ZONE_LABELS: Record<string, string> = {
  CENTRAL_DELHI: "Central Delhi",
  SOUTH_DELHI: "South Delhi",
  NORTH_DELHI: "North Delhi",
  EAST_DELHI: "East Delhi",
  SOUTHWEST_DELHI: "South West Delhi",
  NOIDA: "Noida",
  GURUGRAM: "Gurugram",
  FARIDABAD: "Faridabad",
  GHAZIABAD: "Ghaziabad",
};

export function zoneLabel(zone: string): string {
  return (
    ZONE_LABELS[zone] ??
    zone
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function bucketCount(node: HospitalNode, blood: string, bucket: number): number {
  return Number(node.inventory_by_blood_and_age[blood]?.[String(bucket)] ?? 0);
}

export function totalUnits(node: HospitalNode): number {
  let total = 0;
  Object.values(node.inventory_by_blood_and_age).forEach((buckets) => {
    Object.values(buckets).forEach((count) => {
      total += Number(count);
    });
  });
  return total;
}

/** Units reaching the end of their 120-hour window within `hours`. */
export function expiringUnits(node: HospitalNode, hours = 36): number {
  let total = 0;
  BLOOD_TYPES.forEach((blood) => {
    total += bucketCount(node, blood, 1);
    if (hours > 24) {
      total += Math.round(bucketCount(node, blood, 2) * ((hours - 24) / 24));
    }
  });
  return total;
}

export function expiringByBlood(node: HospitalNode): Record<string, number> {
  return Object.fromEntries(
    BLOOD_TYPES.map((blood) => [
      blood,
      bucketCount(node, blood, 1) +
        Math.round(bucketCount(node, blood, 2) / 2),
    ]),
  );
}

export function demandUnits(node: HospitalNode): number {
  return Object.values(node.demand_forecast_24h).reduce(
    (sum, value) => sum + Number(value),
    0,
  );
}

export function unmetDemand(node: HospitalNode): number {
  return Math.max(0, demandUnits(node) - totalUnits(node));
}

export type StatusTone = "critical" | "expiring" | "healthy";

export interface NodeStatus {
  label: string;
  tone: StatusTone;
  detail: string;
}

const SURGE_LABELS: Record<string, string> = {
  DENGUE_SURGE: "Dengue surge",
  MASS_TRAUMA: "Mass-casualty trauma",
  COLD_CHAIN_FAULT: "Cold-storage fault",
};

export function surgeLabel(surge: string): string {
  return SURGE_LABELS[surge] ?? surge.replace(/_/g, " ").toLowerCase();
}

export function nodeStatus(node: HospitalNode): NodeStatus {
  const stock = totalUnits(node);
  const demand = demandUnits(node);
  const expiring = expiringUnits(node);
  const shortfall = Math.max(0, demand - stock);

  if (node.active_surge_type !== "NONE") {
    return {
      label: "Urgent shortage",
      tone: "critical",
      detail: surgeLabel(node.active_surge_type),
    };
  }
  if (shortfall > 0) {
    return {
      label: "Critical shortage",
      tone: "critical",
      detail: `${shortfall} units short of demand`,
    };
  }
  if (expiring >= 6) {
    return {
      label: "Expiring soon",
      tone: "expiring",
      detail: `${expiring} units inside 36h`,
    };
  }
  return {
    label: "Healthy stock",
    tone: "healthy",
    detail: `${stock - demand} unit buffer`,
  };
}

export const STATUS_STYLES: Record<StatusTone, string> = {
  critical: "border-red-500/30 bg-red-500/10 text-red-400",
  expiring: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  healthy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

export const STATUS_DOTS: Record<StatusTone, string> = {
  critical: "bg-red-500",
  expiring: "bg-amber-500",
  healthy: "bg-emerald-500",
};

export function clockLabel(day: number, hour: number): string {
  return `Day ${day} · ${String(hour).padStart(2, "0")}:00`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-IN");
}

export function formatDecimal(value: number, digits = 1): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Indian-market replacement cost of one apheresed platelet unit. */
export const UNIT_VALUE_INR = 12000;

export function valueSavedLakhs(units: number): number {
  return (units * UNIT_VALUE_INR) / 100_000;
}

export interface ShelfLifeTotals {
  fresh: number;
  reroute: number;
  urgent: number;
}

export function shelfLifeTotals(nodes: HospitalNode[]): ShelfLifeTotals {
  let fresh = 0;
  let reroute = 0;
  let urgent = 0;
  nodes.forEach((node) => {
    BLOOD_TYPES.forEach((blood) => {
      fresh +=
        bucketCount(node, blood, 3) +
        bucketCount(node, blood, 4) +
        bucketCount(node, blood, 5);
      reroute += bucketCount(node, blood, 2);
      urgent += bucketCount(node, blood, 1);
    });
  });
  return { fresh, reroute, urgent };
}

export function activeTransfers(transfers: TransferOrder[]): TransferOrder[] {
  return transfers.filter((transfer) => transfer.status !== "DELIVERED");
}

export const URGENCY_STYLES: Record<string, string> = {
  CRITICAL: "border-red-500/30 bg-red-500/10 text-red-400",
  URGENT: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  ROUTINE: "border-slate-700 bg-slate-800/60 text-slate-300",
};

export const TRANSFER_STATUS_STYLES: Record<string, string> = {
  RECOMMENDED: "border-slate-700 bg-slate-800/60 text-slate-300",
  APPROVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  DELIVERED: "border-sky-500/30 bg-sky-500/10 text-sky-400",
};
