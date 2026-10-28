import type {
  BenchmarkResult,
  Mode,
  TickState,
  TransferRequestInput,
  TransferStatus,
} from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? "";

async function request(path: string, init?: RequestInit): Promise<TickState> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      /* keep the status message */
    }
    throw new Error(message);
  }
  return (await response.json()) as TickState;
}

export const fetchState = () => request("/api/state");

export const tick = (hours = 6) =>
  request("/api/tick", {
    method: "POST",
    body: JSON.stringify({ hours }),
  });

export const setMode = (mode: Mode) =>
  request("/api/mode", {
    method: "POST",
    body: JSON.stringify({ mode }),
  });

export const injectChaos = (event: string) =>
  request("/api/chaos", {
    method: "POST",
    body: JSON.stringify({ event }),
  });

export const createTransferRequest = (payload: TransferRequestInput) =>
  request("/api/transfers/request", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const setTransferStatus = (txId: string, status: TransferStatus) =>
  request(`/api/transfers/${txId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });

export const resetSim = () => request("/api/reset", { method: "POST", body: "{}" });

export async function fetchBenchmark(): Promise<BenchmarkResult> {
  const response = await fetch(`${BASE}/api/benchmark`);
  if (!response.ok) {
    throw new Error(`Benchmark failed with status ${response.status}`);
  }
  return (await response.json()) as BenchmarkResult;
}
