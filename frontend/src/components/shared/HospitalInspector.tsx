import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  MapPin,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import type { HospitalNode, TransferOrder } from "../../types";
import {
  BLOOD_TYPES,
  bucketCount,
  demandUnits,
  expiringUnits,
  formatNumber,
  nodeStatus,
  totalUnits,
  unmetDemand,
  zoneLabel,
} from "../../lib/blood";
import BloodBadge from "./BloodBadge";
import StatusBadge from "./StatusBadge";

interface HospitalInspectorProps {
  node: HospitalNode | null;
  nodes: HospitalNode[];
  transfers: TransferOrder[];
  onSelect: (id: string) => void;
  onRequest: (node: HospitalNode) => void;
  onRebalance: (node: HospitalNode) => void;
  onClose?: () => void;
  busy?: boolean;
}

export default function HospitalInspector({
  node,
  nodes,
  transfers,
  onSelect,
  onRequest,
  onRebalance,
  onClose,
  busy = false,
}: HospitalInspectorProps) {
  const status = node ? nodeStatus(node) : null;
  const stock = node ? totalUnits(node) : 0;
  const expiring = node ? expiringUnits(node) : 0;
  const demand = node ? demandUnits(node) : 0;
  const shortfall = node ? unmetDemand(node) : 0;

  const outgoing = node
    ? transfers.filter(
        (transfer) =>
          transfer.source_id === node.id && transfer.status !== "DELIVERED",
      ).length
    : 0;
  const incoming = node
    ? transfers.filter(
        (transfer) =>
          transfer.target_id === node.id && transfer.status !== "DELIVERED",
      ).length
    : 0;

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-slate-800 bg-[#0D121C]">
      <div className="border-b border-slate-800 px-5 pb-4 pt-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Hospital inspector
          </p>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
              aria-label="Close inspector"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          )}
        </div>

        <div className="relative mt-3">
          <select
            value={node?.id ?? ""}
            onChange={(event) => onSelect(event.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-800 bg-[#111827] py-2 pl-3 pr-9 text-[13px] text-slate-200 outline-none transition-colors hover:border-slate-700 focus:border-rose-500/60"
            aria-label="Select a hospital"
          >
            {nodes.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-500"
            strokeWidth={1.8}
          />
        </div>
      </div>

      {!node || !status ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-[12px] leading-relaxed text-slate-500">
            Select a hospital on the map, or use the dropdown above, to view its
            live blood bank profile.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-white">
            {node.name}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <MapPin className="h-3 w-3" strokeWidth={1.8} />
            {zoneLabel(node.zone)}
            <span className="text-slate-700">·</span>
            Trauma level {node.trauma_level}
          </p>
          <div className="mt-3">
            <StatusBadge tone={status.tone} label={status.label} />
            <p className="mt-2 text-[11px] text-slate-500">{status.detail}</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {[
              { label: "Units on hand", value: formatNumber(stock), tone: "text-white" },
              {
                label: "Expiring <36h",
                value: formatNumber(expiring),
                tone: expiring > 0 ? "text-amber-400" : "text-slate-300",
              },
              { label: "24h demand", value: formatNumber(demand), tone: "text-slate-300" },
              {
                label: "Unmet demand",
                value: formatNumber(shortfall),
                tone: shortfall > 0 ? "text-red-400" : "text-emerald-400",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-slate-800 bg-[#111827] px-3 py-2.5"
              >
                <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
                  {stat.label}
                </p>
                <p className={`mt-1 font-mono text-lg font-semibold tabular ${stat.tone}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
              Inventory by group
            </p>
            <span className="text-[10px] text-slate-600">units · expiring</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {BLOOD_TYPES.map((blood) => {
              const units = Object.values(
                node.inventory_by_blood_and_age[blood] ?? {},
              ).reduce((sum, value) => sum + Number(value), 0);
              const soon = bucketCount(node, blood, 1) +
                Math.round(bucketCount(node, blood, 2) / 2);
              const isShort = shortfall > 0;
              return (
                <div
                  key={blood}
                  className={`flex items-center justify-between rounded-lg border px-2.5 py-2 transition-colors ${
                    isShort
                      ? blood === "O-"
                        ? "border-rose-500/40 bg-rose-500/10"
                        : "border-amber-500/30 bg-amber-500/8"
                      : "border-slate-800 bg-[#111827] hover:border-slate-700"
                  }`}
                >
                  <BloodBadge blood={blood} size="md" />
                  <div className="text-right">
                    <p className="font-mono text-[12px] tabular text-slate-200">
                      {formatNumber(units)}
                    </p>
                    <p
                      className={`text-[9px] ${
                        soon > 0 ? "text-amber-400" : "text-slate-600"
                      }`}
                    >
                      {soon > 0 ? `${soon} soon` : "—"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#111827] px-3 py-2">
              <ArrowUpFromLine className="h-3.5 w-3.5 text-rose-400" strokeWidth={1.8} />
              <div>
                <p className="font-mono text-[13px] tabular text-slate-200">{outgoing}</p>
                <p className="text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  outgoing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#111827] px-3 py-2">
              <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.8} />
              <div>
                <p className="font-mono text-[13px] tabular text-slate-200">{incoming}</p>
                <p className="text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  incoming
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {shortfall > 0 ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onRequest(node)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Request Urgent Blood Transfer
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => onRebalance(node)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
                Rebalance Surplus Now
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => onRebalance(node)}
              className="w-full rounded-lg border border-slate-800 px-4 py-2 text-[12px] font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800/50 disabled:opacity-60"
            >
              Rebalance with solver
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
