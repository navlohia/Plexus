import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, Minus, Plus, X } from "lucide-react";
import type {
  BloodType,
  HospitalNode,
  TransferRequestInput,
  TransferUrgency,
} from "../../types";
import { BLOOD_TYPES, zoneLabel } from "../../lib/blood";

interface TransferModalProps {
  open: boolean;
  nodes: HospitalNode[];
  presetTarget: string | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: TransferRequestInput) => void;
}

const URGENCY_OPTIONS: Array<{ key: TransferUrgency; label: string; hint: string }> = [
  { key: "ROUTINE", label: "Routine", hint: "Next planned dispatch" },
  { key: "URGENT", label: "Urgent", hint: "Within 12 hours" },
  { key: "CRITICAL", label: "Critical", hint: "Immediate courier" },
];

export default function TransferModal({
  open,
  nodes,
  presetTarget,
  busy,
  onClose,
  onSubmit,
}: TransferModalProps) {
  const [target, setTarget] = useState("");
  const [blood, setBlood] = useState<BloodType>("A+");
  const [units, setUnits] = useState(6);
  const [urgency, setUrgency] = useState<TransferUrgency>("URGENT");

  useEffect(() => {
    if (!open) return;
    setTarget(presetTarget ?? nodes[0]?.id ?? "");
    setBlood("A+");
    setUnits(6);
    setUrgency("URGENT");
  }, [open, presetTarget, nodes]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const selected = nodes.find((node) => node.id === target);

  function adjust(delta: number) {
    setUnits((value) => Math.max(1, Math.min(30, value + delta)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close transfer request"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-modal-title"
        className="relative z-10 w-full max-w-lg rounded-xl border border-slate-800 bg-[#0D121C] shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <h2
              id="transfer-modal-title"
              className="text-[16px] font-semibold tracking-tight text-white"
            >
              Create transfer request
            </h2>
            <p className="mt-1 text-[12px] text-slate-500">
              The solver will recommend the nearest compatible donor with
              viable stock.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label
              htmlFor="requesting-hospital"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500"
            >
              Requesting hospital
            </label>
            <div className="relative">
              <select
                id="requesting-hospital"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-800 bg-[#111827] py-2.5 pl-3 pr-9 text-[13px] text-slate-200 outline-none transition-colors hover:border-slate-700 focus:border-rose-500/60"
              >
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name} — {zoneLabel(node.zone)}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500"
                strokeWidth={1.8}
              />
            </div>
            {selected && (
              <p className="mt-1.5 text-[11px] text-slate-500">
                {zoneLabel(selected.zone)} · trauma level {selected.trauma_level}
              </p>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
              Blood group required
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {BLOOD_TYPES.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setBlood(group)}
                  className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors ${
                    blood === group
                      ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
                      : "border-slate-800 bg-[#111827] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
                Units needed
              </span>
              <div className="flex items-center rounded-lg border border-slate-800 bg-[#111827]">
                <button
                  type="button"
                  onClick={() => adjust(-1)}
                  className="px-3 py-2.5 text-slate-400 transition-colors hover:text-white"
                  aria-label="Decrease units"
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={units}
                  onChange={(event) =>
                    setUnits(
                      Math.max(1, Math.min(30, Number(event.target.value) || 1)),
                    )
                  }
                  className="w-full border-x border-slate-800 bg-transparent py-2 text-center font-mono text-[14px] tabular text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="Units needed"
                />
                <button
                  type="button"
                  onClick={() => adjust(1)}
                  className="px-3 py-2.5 text-slate-400 transition-colors hover:text-white"
                  aria-label="Increase units"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
                Urgency
              </span>
              <div className="grid grid-cols-3 gap-1">
                {URGENCY_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setUrgency(option.key)}
                    title={option.hint}
                    className={`rounded-lg border px-2 py-2.5 text-[11px] font-medium transition-colors ${
                      urgency === option.key
                        ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
                        : "border-slate-800 bg-[#111827] text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#111827] px-4 py-3">
            <p className="text-[11px] leading-relaxed text-slate-400">
              On approval, the recommended donor releases the oldest viable
              units first and the courier is dispatched with a 22.0°C platelet
              manifest. Receiving blood bank signs off on arrival.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-800 px-4 py-2 text-[12px] font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800/50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!target || busy}
            onClick={() => onSubmit({ target_id: target, blood, units, urgency })}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Finding donor…" : "Find donor"}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
