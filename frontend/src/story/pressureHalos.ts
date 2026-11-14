import { ScatterplotLayer } from '@deck.gl/layers';
import { NCR_HOSPITAL_METAS, recalculateHospitalTelemetry } from '../lib/hospitalTelemetry';

export const SHOW_HALOS_IN_WORKSPACE = true;

export interface HospitalPressureHalo {
  id: string;
  coords: [number, number];
  status: 'Shortage' | '<36h Surplus' | 'Optimal';
  color: [number, number, number];
  severity: number;
}

/**
 * Reads telemetry directly from the same source as the workspace (Spec §3).
 */
export function getHospitalHaloData(): HospitalPressureHalo[] {
  return Object.keys(NCR_HOSPITAL_METAS).map((id) => {
    const meta = NCR_HOSPITAL_METAS[id];
    const tel = recalculateHospitalTelemetry(id);

    let color: [number, number, number] = [21, 153, 122]; // Emerald optimal
    let severity = 0.4;

    if (tel.status === 'Shortage') {
      color = [225, 29, 72]; // Workspace shortage crimson #E11D48
      const shortageAmount = Math.abs(tel.netBalance);
      severity = Math.min(1.0, Math.max(0.35, shortageAmount / Math.max(1, tel.targetBaseline * 0.4)));
    } else if (tel.status === '<36h Surplus') {
      color = [245, 158, 11]; // Workspace <36h surplus amber #F59E0B
      severity = Math.min(1.0, Math.max(0.35, tel.expiringUnder36h / 15));
    } else {
      color = [21, 153, 122]; // #15997A
      severity = Math.min(0.6, Math.max(0.2, tel.netBalance / Math.max(1, tel.targetBaseline * 0.5)));
    }

    return {
      id,
      coords: meta.coords,
      status: tel.status,
      color,
      severity,
    };
  });
}

/**
 * Builds soft deck.gl pressure halo layers beneath hospital markers (Spec §3 & §20).
 * Red weighted by shortage severity; amber for surplus.
 * Soft radial falloff via concentric rings with max alpha ~0.22 at ~2.5 km radius.
 * Spec §20: Unrelated halos dim to 30% when a hospital is selected.
 */
export function createPressureHaloLayers(
  opacity = 1.0,
  selectedHospitalId?: string | null,
  partnerIds: string[] = []
): any[] {
  if (opacity <= 0.001) return [];

  const data = getHospitalHaloData();
  const clampedOpacity = Math.max(0, Math.min(1, opacity));
  const relatedSet = selectedHospitalId ? new Set([selectedHospitalId, ...partnerIds]) : null;

  const getHaloAlpha = (d: HospitalPressureHalo, baseFraction: number) => {
    let alpha = baseFraction * d.severity * clampedOpacity;
    if (relatedSet) {
      if (!relatedSet.has(d.id)) {
        alpha *= 0.30; // Unrelated halos dim to 30% (Spec §20)
      }
    }
    return Math.round(255 * alpha);
  };

  // 3 Concentric rings create a soft, feather-edged radial field without sharp cutoffs
  const outerLayer = new ScatterplotLayer({
    id: 'deck-pressure-halos-outer',
    data,
    getPosition: (d: HospitalPressureHalo) => d.coords,
    getRadius: 2600, // 2.6 km radius
    radiusUnits: 'meters',
    getFillColor: (d: HospitalPressureHalo) => [
      d.color[0],
      d.color[1],
      d.color[2],
      getHaloAlpha(d, 0.06),
    ],
    stroked: false,
    pickable: false,
    antialiasing: true,
  });

  const midLayer = new ScatterplotLayer({
    id: 'deck-pressure-halos-mid',
    data,
    getPosition: (d: HospitalPressureHalo) => d.coords,
    getRadius: 1700, // 1.7 km radius
    radiusUnits: 'meters',
    getFillColor: (d: HospitalPressureHalo) => [
      d.color[0],
      d.color[1],
      d.color[2],
      getHaloAlpha(d, 0.09),
    ],
    stroked: false,
    pickable: false,
    antialiasing: true,
  });

  const innerLayer = new ScatterplotLayer({
    id: 'deck-pressure-halos-inner',
    data,
    getPosition: (d: HospitalPressureHalo) => d.coords,
    getRadius: 900, // 0.9 km core
    radiusUnits: 'meters',
    getFillColor: (d: HospitalPressureHalo) => [
      d.color[0],
      d.color[1],
      d.color[2],
      getHaloAlpha(d, 0.12),
    ],
    stroked: false,
    pickable: false,
    antialiasing: true,
  });

  return [outerLayer, midLayer, innerLayer];
}

