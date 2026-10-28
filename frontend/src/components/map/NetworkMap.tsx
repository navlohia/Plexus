import { useMemo } from "react";
import DeckGL from "@deck.gl/react";
import { ArcLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import Map from "react-map-gl/maplibre";
import type { HospitalNode, TransshipmentArc } from "../../types";
import {
  demandUnits,
  expiringUnits,
  formatNumber,
  nodeStatus,
  totalUnits,
  zoneLabel,
} from "../../lib/blood";

const DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const INITIAL_VIEW = {
  longitude: 77.21,
  latitude: 28.58,
  zoom: 9.2,
  pitch: 28,
  bearing: -8,
};

type RGBA = [number, number, number, number];

const TONE_COLORS: Record<string, RGBA> = {
  healthy: [16, 185, 129, 215],
  expiring: [245, 158, 11, 225],
  critical: [239, 68, 68, 235],
};

interface NetworkMapProps {
  nodes: HospitalNode[];
  arcs: TransshipmentArc[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function tooltipHtml(node: HospitalNode): string {
  const status = nodeStatus(node);
  const dot =
    status.tone === "critical"
      ? "#EF4444"
      : status.tone === "expiring"
        ? "#F59E0B"
        : "#10B981";
  return `
    <div style="min-width:220px;font-family:Inter,system-ui,sans-serif">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="width:6px;height:6px;border-radius:999px;background:${dot}"></span>
        <span style="font-size:13px;font-weight:600;color:#F8FAFC">${node.name}</span>
      </div>
      <div style="margin-top:2px;font-size:11px;color:#94A3B8">
        ${zoneLabel(node.zone)} · ${status.label}
      </div>
      <div style="display:flex;justify-content:space-between;gap:18px;margin-top:8px;padding-top:8px;border-top:1px solid #1F2937;font-size:11px;color:#CBD5E1">
        <span>On hand <b style="color:#F8FAFC">${formatNumber(totalUnits(node))}u</b></span>
        <span>Expiring <b style="color:#F59E0B">${formatNumber(expiringUnits(node))}u</b></span>
        <span>Demand <b style="color:#CBD5E1">${formatNumber(demandUnits(node))}u</b></span>
      </div>
    </div>`;
}

export default function NetworkMap({
  nodes,
  arcs,
  selectedId,
  onSelect,
}: NetworkMapProps) {
  const layers = useMemo(() => {
    const selected = nodes.filter((node) => node.id === selectedId);
    const labelled = nodes.filter((node) => node.id === selectedId);

    const halo = new ScatterplotLayer<HospitalNode>({
      id: "hospital-halo",
      data: nodes,
      getPosition: (node) => [node.lng, node.lat],
      getRadius: (node) => 12 + Math.min(22, Math.sqrt(totalUnits(node)) * 2.6),
      radiusUnits: "pixels",
      getFillColor: (node) => {
        const color = TONE_COLORS[nodeStatus(node).tone];
        return [color[0], color[1], color[2], 34] as RGBA;
      },
      pickable: false,
    });

    const routes = new ArcLayer<TransshipmentArc>({
      id: "cold-chain-arcs",
      data: arcs,
      getSourcePosition: (arc) =>
        [arc.source_coords[1], arc.source_coords[0]] as [number, number],
      getTargetPosition: (arc) =>
        [arc.target_coords[1], arc.target_coords[0]] as [number, number],
      getSourceColor: [225, 29, 72, 195],
      getTargetColor: [16, 185, 129, 215],
      getWidth: (arc) => Math.max(1.4, Math.min(6, arc.units * 0.4)),
      getHeight: 0.35,
      widthMinPixels: 1,
      greatCircle: false,
      pickable: true,
    });

    const markers = new ScatterplotLayer<HospitalNode>({
      id: "hospital-nodes",
      data: nodes,
      getPosition: (node) => [node.lng, node.lat],
      getRadius: (node) => 5 + Math.min(6, Math.sqrt(totalUnits(node)) / 2.4),
      radiusUnits: "pixels",
      getFillColor: (node) => TONE_COLORS[nodeStatus(node).tone],
      getLineColor: [11, 15, 23, 235],
      lineWidthMinPixels: 1.2,
      stroked: true,
      pickable: true,
      onClick: (info: PickingInfo) => {
        const node = info.object as HospitalNode | undefined;
        if (node) onSelect(node.id);
      },
    });

    const selection = new ScatterplotLayer<HospitalNode>({
      id: "hospital-selected",
      data: selected,
      getPosition: (node) => [node.lng, node.lat],
      getRadius: 14,
      radiusUnits: "pixels",
      getLineColor: [248, 250, 252, 235] as RGBA,
      lineWidthMinPixels: 2,
      stroked: true,
      filled: false,
      pickable: false,
    });

    const labels = new TextLayer<HospitalNode>({
      id: "hospital-labels",
      data: labelled,
      getPosition: (node) => [node.lng, node.lat],
      getText: (node) => node.name,
      getSize: 11,
      getColor: [248, 250, 252, 255],
      fontFamily: "Inter, system-ui, sans-serif",
      fontWeight: 600,
      getPixelOffset: [0, -20],
      background: true,
      getBackgroundColor: [11, 15, 23, 235],
      backgroundPadding: [3, 2],
      billboard: true,
      pickable: false,
    });

    return [halo, routes, markers, selection, labels];
  }, [nodes, arcs, selectedId, onSelect]);

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW}
      controller
      layers={layers}
      getTooltip={(info: PickingInfo) => {
        const object = info.object as HospitalNode | TransshipmentArc | undefined;
        if (!object) return null;
        if ("tx_id" in object) {
          return {
            html: `<div style="font-family:Inter,system-ui,sans-serif">
              <div style="font-size:12px;font-weight:600;color:#F8FAFC">
                ${object.units} units of ${object.donor_blood} platelets
              </div>
              <div style="margin-top:2px;font-size:11px;color:#94A3B8">
                ${object.source_name} → ${object.target_name}
              </div>
              <div style="margin-top:4px;font-size:11px;color:#CBD5E1">
                ${object.distance_km.toFixed(1)} km · ETA ${Math.round(object.eta_mins)} min · 22.0°C
              </div>
            </div>`,
            style: {
              backgroundColor: "rgba(13,18,28,0.97)",
              border: "1px solid #1F2937",
              borderRadius: "8px",
              padding: "8px 10px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.65)",
            },
          };
        }
        return {
          html: tooltipHtml(object),
          style: {
            backgroundColor: "rgba(13,18,28,0.97)",
            border: "1px solid #1F2937",
            borderRadius: "8px",
            padding: "10px 12px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.65)",
          },
        };
      }}
    >
      <Map mapStyle={DARK_STYLE} reuseMaps />
    </DeckGL>
  );
}
