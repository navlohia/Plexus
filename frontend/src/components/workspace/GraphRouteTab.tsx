/**
 * GraphRouteTab.tsx — Plexus Interactive Route Graph (Obsidian-style Light Mode)
 *
 * Designed with the exact aesthetics of the Dispatch UI:
 * - Light-mode lavender/paper canvas (#E4E5EC / #F2F3F7) with dot grid
 * - Interactive 2D force-directed physics (drag nodes, spring elasticity, center gravity)
 * - Pan & Zoom with smooth wheel and mouse controls
 * - Obsidian-style focus mode (hovering a node spotlights connected neighbors, dims the rest)
 * - Dispatch card inspector matching the Dispatch dashboard
 * - Live telemetry from useDispatchStore + hospitalTelemetry
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Shuffle,
  X,
  Truck,
  Zap,
  Thermometer,
  ShieldAlert,
  ArrowRight,
  Activity,
  Info,
} from "lucide-react";
import { PlexusLogo } from "../../ui/PlexusLogo";
import { NCR_HOSPITAL_METAS, findOptimalDonorHub } from "../../lib/hospitalTelemetry";
import { useDispatchStore } from "../../data/dispatch";
import type { DispatchOrder } from "../../data/dispatch/types";
import type { TickState } from "../../types";

// ─── Design Tokens (matches Moveon / Map Paper UI) ───────────────────────────
const TOKENS = {
  canvas: "#F3EEE4",      // Map paper cream background
  board: "#FAF7F0",       // Light cream board container
  paper: "#FAF8F3",       // Very slightly creamish map paper tone for graph canvas
  card: "#FFFFFF",
  cardMuted: "rgba(255, 255, 255, 0.7)",
  border: "#E8E3D8",      // Warm cream border
  borderDark: "#D8D1C2",  // Warm darker cream border
  textPrimary: "#141B2D", // Deep clinical ink
  textSecondary: "#646F82",
  textMuted: "#9CA3AF",
  purple: "#9333EA",
  purpleSoft: "#F3E8FF",
  purpleText: "#7E22CE",
  emerald: "#15997A",     // Workspace Solver emerald
  emeraldSoft: "#D1FAE5",
  emeraldText: "#065F46",
  amber: "#F59E0B",
  amberSoft: "#FEF3C7",
  amberText: "#92400E",
  rose: "#E11D48",
  roseSoft: "#FFE4E6",
  roseText: "#9F1239",
  sky: "#0284C7",
  skySoft: "#E0F2FE",
  skyText: "#0369A1",
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SimNode {
  id: string;
  code: string;
  name: string;
  short: string;
  zone: string;
  city: string;
  coords: [number, number];
  isTrauma: boolean;
  totalStock: number;
  targetBaseline: number;
  netBalance: number;
  status: "Shortage" | "Surplus" | "Optimal";
  priorityScore: number;
  activeCourierText: string;

  // Physics simulation coordinates
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  isPinned?: boolean;
}

export interface SimEdge {
  id: string;
  sourceId: string;
  targetId: string;
  distanceKm: number;
  etaMins: number;
  score: number;
  isActive: boolean;
  activeOrder?: DispatchOrder;
  length: number;
}

interface GraphRouteTabProps {
  state: TickState;
}

// ─── Seed initial coordinates based roughly on NCR Geography ─────────────────
function getInitialCoordinates(coords: [number, number], width: number, height: number): [number, number] {
  // NCR bbox: lng 76.9..77.5, lat 28.35..28.80
  const minLng = 76.95, maxLng = 77.45;
  const minLat = 28.38, maxLat = 28.78;

  const nx = (coords[0] - minLng) / (maxLng - minLng);
  const ny = 1 - (coords[1] - minLat) / (maxLat - minLat);

  // Generous distribution across the full canvas
  const padX = width * 0.10;
  const padY = height * 0.10;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  // Natural scattering
  const jx = (Math.random() - 0.5) * 40;
  const jy = (Math.random() - 0.5) * 40;

  return [
    padX + nx * usableW + jx,
    padY + ny * usableH + jy,
  ];
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GraphRouteTab({ state }: GraphRouteTabProps) {
  const dispatchStore = useDispatchStore();
  const dispatchOrders = dispatchStore.orders;

  // Filter & Search states
  const [filterMode, setFilterMode] = useState<"ALL" | "SHORTAGE" | "SURPLUS" | "OPTIMAL" | "ACTIVE">("ALL");
  const [traumaOnly, setTraumaOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Interaction states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isPhysicsActive, setIsPhysicsActive] = useState(true);
  const [showFormulaBanner, setShowFormulaBanner] = useState(false);
  const [showOrdersDrawer, setShowOrdersDrawer] = useState(false);

  // Canvas pan & zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panMovedRef = useRef(false);

  // Node dragging
  const draggedNodeRef = useRef<SimNode | null>(null);
  const dragNodeMovedRef = useRef(false);

  // SVG and container ref
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });

  // ── Measure Container Dimensions ───────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 200 && height > 200) {
          setDimensions({ width, height });
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Construct Nodes from NCR_HOSPITAL_METAS & Live Simulation ──────────────
  const initialNodes = useMemo(() => {
    const list: SimNode[] = [];
    const width = dimensions.width;
    const height = dimensions.height;

    for (const [id, meta] of Object.entries(NCR_HOSPITAL_METAS)) {
      const liveNode = state.nodes.find((n) => n.id === id);
      const isTrauma = meta.isTrauma || (liveNode && liveNode.trauma_level >= 2);
      const targetBaseline = meta.targetBaseline;

      let stock = meta.baselineStock;
      if (liveNode && liveNode.inventory_by_blood_and_age) {
        let sum = 0;
        for (const grp of Object.values(liveNode.inventory_by_blood_and_age)) {
          for (const q of Object.values(grp || {})) {
            sum += Number(q) || 0;
          }
        }
        if (sum > 0) stock = sum;
      } else if (liveNode && typeof liveNode.net_balance === "number") {
        stock = targetBaseline + liveNode.net_balance;
      }

      const netBalance = stock - targetBaseline;
      let status: "Shortage" | "Surplus" | "Optimal" = "Optimal";
      if (netBalance < -5) status = "Shortage";
      else if (netBalance > 18) status = "Surplus";

      // Priority score: higher means more urgent need of inward supply
      const supplyRatio = stock / Math.max(targetBaseline, 1);
      const priorityScore = Math.round((1 - supplyRatio) * 100);

      const [initX, initY] = getInitialCoordinates(meta.coords, width, height);
      const radius = isTrauma ? 20 : 16;

      list.push({
        id,
        code: meta.code,
        name: meta.fullName,
        short: meta.short,
        zone: meta.zone,
        city: meta.city,
        coords: meta.coords,
        isTrauma: !!isTrauma,
        totalStock: stock,
        targetBaseline,
        netBalance,
        status,
        priorityScore,
        activeCourierText: meta.activeCourierText,
        x: initX,
        y: initY,
        vx: 0,
        vy: 0,
        radius,
        mass: isTrauma ? 1.6 : 1.0,
      });
    }

    return list;
  }, [state.nodes, dimensions.width, dimensions.height]);

  // Keep a mutable ref of nodes for high-performance physics animation
  const nodesRef = useRef<SimNode[]>(initialNodes);
  useEffect(() => {
    // Merge new data while preserving existing positions
    const currMap = new Map(nodesRef.current.map((n) => [n.id, n]));
    nodesRef.current = initialNodes.map((n) => {
      const existing = currMap.get(n.id);
      if (existing) {
        return {
          ...n,
          x: existing.x,
          y: existing.y,
          vx: existing.vx,
          vy: existing.vy,
        };
      }
      return n;
    });
  }, [initialNodes]);

  // ── Construct Graph Edges ──────────────────────────────────────────────────
  const edges = useMemo(() => {
    const list: SimEdge[] = [];
    const nodeMap = new Map(initialNodes.map((n) => [n.id, n]));
    const edgeSet = new Set<string>();

    // 1. Add active transfer orders from useDispatchStore
    for (const order of dispatchOrders) {
      if (order.status === "in_transit" || order.status === "approved" || order.status === "proposed") {
        const srcNode = initialNodes.find((n) => n.id === order.fromId || n.code === order.from);
        const tgtNode = initialNodes.find((n) => n.id === order.toId || n.code === order.to);
        if (srcNode && tgtNode) {
          const key = `${srcNode.id}->${tgtNode.id}`;
          edgeSet.add(key);
          list.push({
            id: order.id,
            sourceId: srcNode.id,
            targetId: tgtNode.id,
            distanceKm: order.distanceKm || 12.4,
            etaMins: order.etaMin || 18,
            score: 95,
            isActive: true,
            activeOrder: order,
            length: 190,
          });
        }
      }
    }

    // 2. Add realistic transit corridors for shortage nodes (matched to nearest donor)
    for (const node of initialNodes) {
      if (node.status === "Shortage") {
        const donorResult = findOptimalDonorHub(node.id, "O+", state.nodes);
        if (donorResult && donorResult.id !== node.id) {
          const key1 = `${donorResult.id}->${node.id}`;
          const key2 = `${node.id}->${donorResult.id}`;
          if (!edgeSet.has(key1) && !edgeSet.has(key2)) {
            edgeSet.add(key1);
            list.push({
              id: `COR-${donorResult.code}-${node.code}`,
              sourceId: donorResult.id,
              targetId: node.id,
              distanceKm: donorResult.distanceKm,
              etaMins: donorResult.etaMins,
              score: Math.max(40, 100 - donorResult.etaMins * 2),
              isActive: false,
              length: 230,
            });
          }
        }
      }
    }

    // 3. Connect key regional apex hub interconnects for Obsidian mesh feel
    const hubPairs: [string, string][] = [
      ["ND-01", "ND-02"], // AIIMS <-> Safdarjung
      ["ND-01", "ND-03"], // AIIMS <-> Max Saket
      ["ND-03", "ND-11"], // Max Saket <-> Apollo
      ["ND-01", "ND-08"], // AIIMS <-> RML
      ["ND-08", "ND-14"], // RML <-> BLK-Max
      ["ND-04", "ND-07"], // Fortis Noida <-> GTB
      ["ND-05", "ND-23"], // Medanta <-> Artemis
      ["ND-05", "ND-02"], // Medanta <-> Safdarjung
    ];

    for (const [sId, tId] of hubPairs) {
      const key1 = `${sId}->${tId}`;
      const key2 = `${tId}->${sId}`;
      if (!edgeSet.has(key1) && !edgeSet.has(key2) && nodeMap.has(sId) && nodeMap.has(tId)) {
        edgeSet.add(key1);
        list.push({
          id: `HUB-${sId}-${tId}`,
          sourceId: sId,
          targetId: tId,
          distanceKm: 9.8,
          etaMins: 14,
          score: 75,
          isActive: false,
          length: 210,
        });
      }
    }

    return list;
  }, [initialNodes, dispatchOrders, state.nodes]);

  // Re-render tick state for React SVG rendering driven by requestAnimationFrame
  const [, setFrameTick] = useState(0);

  // ── Force-Directed Physics Engine ──────────────────────────────────────────
  useEffect(() => {
    let animId: number;

    const stepPhysics = () => {
      if (!isPhysicsActive && !draggedNodeRef.current) {
        animId = requestAnimationFrame(stepPhysics);
        return;
      }

      const nodes = nodesRef.current;
      const nLen = nodes.length;
      const width = dimensions.width;
      const height = dimensions.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // 1. Center gravity & boundary spring
      for (let i = 0; i < nLen; i++) {
        const n = nodes[i];
        if (n === draggedNodeRef.current) continue;

        // Gentle pull toward center so nodes spread out into available space
        const cdx = centerX - n.x;
        const cdy = centerY - n.y;
        n.vx += cdx * 0.00045;
        n.vy += cdy * 0.00045;

        // Soft viewport padding boundary
        const pad = 48;
        if (n.x < pad) n.vx += (pad - n.x) * 0.05;
        if (n.x > width - pad) n.vx += (width - pad - n.x) * 0.05;
        if (n.y < pad) n.vy += (pad - n.y) * 0.05;
        if (n.y > height - pad) n.vy += (height - pad - n.y) * 0.05;
      }

      // 2. Node-Node Coulomb Repulsion (generous spacing, zero overlaps)
      for (let i = 0; i < nLen; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nLen; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);

          // Generous breathing distance between node bubbles
          const minDist = n1.radius + n2.radius + 68;
          let force = 0;

          if (dist < minDist) {
            // Strong elastic separation push
            force = (minDist - dist) * 0.18;
          } else if (dist < 520) {
            // Smooth inverse-distance repulsion for natural Obsidian layout
            force = -1400 / (dist * dist + 20);
          }

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (n1 !== draggedNodeRef.current) {
            n1.vx -= fx / n1.mass;
            n1.vy -= fy / n1.mass;
          }
          if (n2 !== draggedNodeRef.current) {
            n2.vx += fx / n2.mass;
            n2.vy += fy / n2.mass;
          }
        }
      }

      // 3. Edge Hooke's Spring Attraction
      const nodeIndex = new Map(nodes.map((n) => [n.id, n]));
      for (let e = 0; e < edges.length; e++) {
        const edge = edges[e];
        const s = nodeIndex.get(edge.sourceId);
        const t = nodeIndex.get(edge.targetId);
        if (!s || !t) continue;

        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.hypot(dx, dy) || 1;
        const targetLen = edge.length;
        const springForce = (dist - targetLen) * 0.0035;

        const fx = (dx / dist) * springForce;
        const fy = (dy / dist) * springForce;

        if (s !== draggedNodeRef.current) {
          s.vx += fx;
          s.vy += fy;
        }
        if (t !== draggedNodeRef.current) {
          t.vx -= fx;
          t.vy -= fy;
        }
      }

      // 4. Velocity integration & damping
      for (let i = 0; i < nLen; i++) {
        const n = nodes[i];
        if (n === draggedNodeRef.current) continue;

        n.vx *= 0.86; // friction damping
        n.vy *= 0.86;

        // Cap speed
        const speed = Math.hypot(n.vx, n.vy);
        if (speed > 16) {
          n.vx = (n.vx / speed) * 16;
          n.vy = (n.vy / speed) * 16;
        }

        n.x += n.vx;
        n.y += n.vy;
      }

      setFrameTick((t) => (t + 1) % 1000);
      animId = requestAnimationFrame(stepPhysics);
    };

    animId = requestAnimationFrame(stepPhysics);
    return () => cancelAnimationFrame(animId);
  }, [dimensions, edges, isPhysicsActive]);

  // ── Mouse & Drag Interactions ──────────────────────────────────────────────
  const handleMouseDownNode = (e: React.MouseEvent, node: SimNode) => {
    e.stopPropagation();
    draggedNodeRef.current = node;
    dragNodeMovedRef.current = false;
  };

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    isPanningRef.current = true;
    panMovedRef.current = false;
    panStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeRef.current && containerRef.current) {
      dragNodeMovedRef.current = true;
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      // Convert to canvas space considering pan and zoom
      const canvasX = (rawX - pan.x) / zoom;
      const canvasY = (rawY - pan.y) / zoom;

      draggedNodeRef.current.x = canvasX;
      draggedNodeRef.current.y = canvasY;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      return;
    }

    if (isPanningRef.current) {
      panMovedRef.current = true;
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeRef.current && !dragNodeMovedRef.current) {
      // User tapped or clicked a node without dragging it -> toggle selection!
      const clickedId = draggedNodeRef.current.id;
      setSelectedNodeId((prev) => (prev === clickedId ? null : clickedId));
    } else if (isPanningRef.current && !panMovedRef.current) {
      // User clicked on empty canvas background -> deselect everything!
      setSelectedNodeId(null);
    }
    draggedNodeRef.current = null;
    isPanningRef.current = false;
  };

  // Zooming via Wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(2.8, Math.max(0.45, zoom * zoomFactor));

    setPan({
      x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  };

  // Reset Camera View
  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setSelectedNodeId("ND-01");
  };

  // Scatter/Shake nodes
  const handleScatterNodes = () => {
    for (const n of nodesRef.current) {
      n.vx += (Math.random() - 0.5) * 18;
      n.vy += (Math.random() - 0.5) * 18;
    }
  };

  // ── Filtered & Highlighted Node Computations ────────────────────────────────
  const activeFocusId = hoveredNodeId || selectedNodeId;

  const connectedIds = useMemo(() => {
    if (!activeFocusId) return new Set<string>();
    const set = new Set<string>();
    set.add(activeFocusId);
    for (const e of edges) {
      if (e.sourceId === activeFocusId) set.add(e.targetId);
      if (e.targetId === activeFocusId) set.add(e.sourceId);
    }
    return set;
  }, [activeFocusId, edges]);

  const visibleNodes = useMemo(() => {
    return nodesRef.current.filter((n) => {
      if (traumaOnly && !n.isTrauma) return false;
      if (filterMode === "SHORTAGE" && n.status !== "Shortage") return false;
      if (filterMode === "SURPLUS" && n.status !== "Surplus") return false;
      if (filterMode === "OPTIMAL" && n.status !== "Optimal") return false;
      if (filterMode === "ACTIVE") {
        const hasActiveEdge = edges.some(
          (e) => e.isActive && (e.sourceId === n.id || e.targetId === n.id)
        );
        if (!hasActiveEdge) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          n.code.toLowerCase().includes(q) ||
          n.name.toLowerCase().includes(q) ||
          n.short.toLowerCase().includes(q) ||
          n.zone.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [filterMode, traumaOnly, searchQuery, edges]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    return edges.filter(
      (e) => visibleNodeIds.has(e.sourceId) && visibleNodeIds.has(e.targetId)
    );
  }, [edges, visibleNodeIds]);

  // Selected Node Details
  const selectedNode = useMemo(() => {
    return nodesRef.current.find((n) => n.id === selectedNodeId) || nodesRef.current[0];
  }, [selectedNodeId]);

  // Optimal donor hub match for selected node
  const optimalDonor = useMemo(() => {
    if (!selectedNode) return null;
    return findOptimalDonorHub(selectedNode.id, "O+", state.nodes);
  }, [selectedNode, state.nodes]);

  // KPI calculations
  const shortageCount = useMemo(
    () => nodesRef.current.filter((n) => n.status === "Shortage").length,
    []
  );
  const surplusCount = useMemo(
    () => nodesRef.current.filter((n) => n.status === "Surplus").length,
    []
  );
  const optimalCount = useMemo(
    () => nodesRef.current.filter((n) => n.status === "Optimal").length,
    []
  );
  const activeOrdersCount = useMemo(
    () => dispatchOrders.filter((o) => o.status === "in_transit").length,
    [dispatchOrders]
  );
  const totalStock = useMemo(
    () => nodesRef.current.reduce((acc, n) => acc + n.totalStock, 0),
    []
  );

  return (
    <div
      style={{
        background: TOKENS.canvas,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 20px 20px",
        boxSizing: "border-box",
        fontFamily: "'Instrument Sans', -apple-system, system-ui, sans-serif",
        color: TOKENS.textPrimary,
        overflow: "hidden",
      }}
    >
      {/* ── MAIN DISPATCH BOARD (matches Moveon Board container) ── */}
      <div
        style={{
          background: TOKENS.board,
          borderRadius: 28,
          padding: "18px 22px",
          width: "100%",
          maxWidth: 1440,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxSizing: "border-box",
          position: "relative",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* ════════════════════════════════════════════
            ROW 1: HEADER & TELEMETRY CONTROLS
        ════════════════════════════════════════════ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            minHeight: 44,
          }}
        >
          {/* LEFT: Logo & Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PlexusLogo size={28} />
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: TOKENS.textPrimary,
                  letterSpacing: "-0.02em",
                }}
              >
                Route Graph.
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: TOKENS.purple,
                  background: TOKENS.purpleSoft,
                  padding: "1px 7px",
                  borderRadius: 999,
                }}
              >
                Obsidian Engine
              </span>
            </div>
          </div>

          {/* CENTER: Filter Buttons (Dispatch Style) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: TOKENS.card,
              padding: "4px 6px",
              borderRadius: 999,
              boxShadow: "0 1px 6px rgba(0, 0, 0, 0.04)",
              border: `1px solid ${TOKENS.border}`,
            }}
          >
            {[
              { id: "ALL", label: `All (${nodesRef.current.length})` },
              { id: "SHORTAGE", label: `Shortage (${shortageCount})`, dot: TOKENS.rose },
              { id: "SURPLUS", label: `Surplus (${surplusCount})`, dot: TOKENS.amber },
              { id: "OPTIMAL", label: `Optimal (${optimalCount})`, dot: TOKENS.emerald },
              { id: "ACTIVE", label: `In-Transit (${activeOrdersCount})`, dot: TOKENS.purple },
            ].map((btn) => {
              const isSelected = filterMode === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setFilterMode(btn.id as any)}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    padding: "5px 12px",
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 600,
                    transition: "all 0.15s ease",
                    background: isSelected ? TOKENS.textPrimary : "transparent",
                    color: isSelected ? "#FFFFFF" : TOKENS.textSecondary,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {btn.dot && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: btn.dot,
                        display: "inline-block",
                      }}
                    />
                  )}
                  {btn.label}
                </button>
              );
            })}

            {/* Trauma filter toggle */}
            <button
              type="button"
              onClick={() => setTraumaOnly((v) => !v)}
              style={{
                border: "none",
                cursor: "pointer",
                padding: "5px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                transition: "all 0.15s ease",
                background: traumaOnly ? TOKENS.emeraldSoft : "transparent",
                color: traumaOnly ? TOKENS.emeraldText : TOKENS.textMuted,
              }}
            >
              Trauma Only
            </button>
          </div>

          {/* RIGHT: Search input & Formula trigger */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Search
                size={13}
                color={TOKENS.textMuted}
                style={{ position: "absolute", left: 10, pointerEvents: "none" }}
              />
              <input
                type="text"
                placeholder="Search hospital (e.g. AIIMS)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  height: 32,
                  width: 190,
                  paddingLeft: 28,
                  paddingRight: 24,
                  fontSize: 11.5,
                  borderRadius: 999,
                  border: `1px solid ${TOKENS.border}`,
                  background: TOKENS.card,
                  outline: "none",
                  color: TOKENS.textPrimary,
                  transition: "all 0.15s ease",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: TOKENS.textMuted,
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowFormulaBanner((v) => !v)}
              title="GraphDB Route Scoring Formula"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                height: 32,
                padding: "0 10px",
                borderRadius: 999,
                border: `1px solid ${showFormulaBanner ? TOKENS.purple : TOKENS.border}`,
                background: showFormulaBanner ? TOKENS.purpleSoft : TOKENS.card,
                color: showFormulaBanner ? TOKENS.purpleText : TOKENS.textSecondary,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Info size={13} />
              <span>Formula</span>
            </button>
          </div>
        </div>

        {/* ── FORMULA BANNER (Collapsible) ── */}
        {showFormulaBanner && (
          <div
            style={{
              background: TOKENS.card,
              borderRadius: 16,
              padding: "12px 18px",
              border: `1px solid ${TOKENS.purpleSoft}`,
              boxShadow: "0 2px 12px rgba(147, 51, 234, 0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: TOKENS.purpleSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: TOKENS.purple,
                  flexShrink: 0,
                }}
              >
                <Zap size={16} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: TOKENS.textPrimary }}>
                  GraphDB Transit Scoring Engine
                </div>
                <div style={{ fontSize: 11, color: TOKENS.textSecondary, marginTop: 2 }}>
                  <code style={{ color: TOKENS.rose, fontWeight: 700 }}>Priority = (1 - Stock/Target) × 100</code> ·{" "}
                  <code style={{ color: TOKENS.purple, fontWeight: 700 }}>
                    Viability = SurplusRatio × DeficitRatio × (1 - ETA/90m) × 100
                  </code>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: TOKENS.textSecondary }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: TOKENS.emerald, display: "inline-block" }} />
                Optimal Baseline: &gt; 85u (Trauma) / &gt; 60u
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: TOKENS.rose, display: "inline-block" }} />
                Critical Threshold: &lt; -5u Net Deficit
              </span>
              <button
                type="button"
                onClick={() => setShowFormulaBanner(false)}
                style={{ border: "none", background: "none", cursor: "pointer", color: TOKENS.textMuted }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            ROW 2: INTERACTIVE GRAPH CANVAS + HUD
        ════════════════════════════════════════════ */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{
            flex: 1,
            width: "100%",
            borderRadius: 22,
            background: TOKENS.paper,
            border: `1.5px solid ${TOKENS.border}`,
            position: "relative",
            overflow: "hidden",
            cursor: isPanningRef.current ? "grabbing" : "grab",
            userSelect: "none",
            backgroundImage: `radial-gradient(rgba(180, 168, 150, 0.45) 1px, transparent 1px)`,
            backgroundSize: "36px 36px",
          }}
        >
          {/* ── FLOATING GRAPH CONTROLS (Top-Right Obsidian HUD) ── */}
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(10px)",
              padding: "4px 6px",
              borderRadius: 12,
              border: `1px solid ${TOKENS.border}`,
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
            }}
          >
            <button
              type="button"
              title="Zoom In"
              onClick={() => setZoom((z) => Math.min(2.8, z * 1.2))}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: TOKENS.textPrimary,
              }}
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              title="Zoom Out"
              onClick={() => setZoom((z) => Math.max(0.45, z * 0.83))}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: TOKENS.textPrimary,
              }}
            >
              <ZoomOut size={14} />
            </button>
            <div style={{ width: 1, height: 16, background: TOKENS.border, margin: "0 2px" }} />
            <button
              type="button"
              title="Reset View"
              onClick={handleResetView}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: TOKENS.textPrimary,
              }}
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              title={isPhysicsActive ? "Pause Physics Simulation" : "Resume Physics Simulation"}
              onClick={() => setIsPhysicsActive((p) => !p)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "none",
                background: isPhysicsActive ? "transparent" : TOKENS.purpleSoft,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isPhysicsActive ? TOKENS.textPrimary : TOKENS.purpleText,
              }}
            >
              {isPhysicsActive ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              type="button"
              title="Jiggle / Scatter Nodes"
              onClick={handleScatterNodes}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: TOKENS.textPrimary,
              }}
            >
              <Shuffle size={13} />
            </button>
          </div>

          {/* ── TOP-LEFT METRICS CHIP STRIP (Dispatch Style) ── */}
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${TOKENS.border}`,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                fontSize: 11.5,
                fontWeight: 600,
              }}
            >
              <Truck size={13} color={TOKENS.purple} />
              <span style={{ color: TOKENS.textSecondary }}>Live Routes:</span>
              <span style={{ color: TOKENS.textPrimary, fontWeight: 700 }}>
                {edges.filter((e) => e.isActive).length} in transit
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${TOKENS.border}`,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                fontSize: 11.5,
                fontWeight: 600,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: TOKENS.emerald }} />
              <span style={{ color: TOKENS.textSecondary }}>Network Stock:</span>
              <span style={{ color: TOKENS.textPrimary, fontWeight: 700 }}>
                {totalStock} units
              </span>
            </div>
          </div>

          {/* ── SVG FORCE GRAPH CANVAS ── */}
          <svg
            width="100%"
            height="100%"
            onClick={(e) => {
              if (e.target === e.currentTarget || (e.target as Element).id === "graph-backdrop-rect") {
                setSelectedNodeId(null);
              }
            }}
            style={{ display: "block", overflow: "visible" }}
          >
            <defs>
              {/* Radial gradient glow for shortage nodes */}
              <radialGradient id="shortageGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#F43F5E" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#F43F5E" stopOpacity="0" />
              </radialGradient>

              {/* Radial gradient glow for surplus donor nodes */}
              <radialGradient id="surplusGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>

              {/* Radial gradient glow for active selection */}
              <radialGradient id="selectionGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#9333EA" stopOpacity="0.4" />
                <stop offset="65%" stopColor="#9333EA" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#9333EA" stopOpacity="0" />
              </radialGradient>

              {/* Arrowhead marker for edges */}
              <marker
                id="graph-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,1 L7,4 L0,7 Z" fill="#94A3B8" />
              </marker>

              <marker
                id="graph-arrow-active"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,1 L7,4 L0,7 Z" fill="#9333EA" />
              </marker>
            </defs>

            {/* Transform Group (Pan & Zoom) */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Invisible infinite backdrop to catch clicks for deselecting */}
              <rect
                id="graph-backdrop-rect"
                x={-dimensions.width * 4}
                y={-dimensions.height * 4}
                width={dimensions.width * 9}
                height={dimensions.height * 9}
                fill="transparent"
                style={{ cursor: isPanningRef.current ? "grabbing" : "grab" }}
              />

              {/* 1. EDGES */}
              {visibleEdges.map((edge) => {
                const sNode = nodesRef.current.find((n) => n.id === edge.sourceId);
                const tNode = nodesRef.current.find((n) => n.id === edge.targetId);
                if (!sNode || !tNode) return null;

                // Obsidian focus logic: highlight connected, dim others
                const isEdgeFocused =
                  !activeFocusId ||
                  edge.sourceId === activeFocusId ||
                  edge.targetId === activeFocusId;
                const edgeOpacity = isEdgeFocused ? (edge.isActive ? 1 : 0.8) : 0.12;

                const dx = tNode.x - sNode.x;
                const dy = tNode.y - sNode.y;
                const dist = Math.hypot(dx, dy) || 1;
                const ux = dx / dist;
                const uy = dy / dist;

                // Calculate edge start and end at node boundaries
                const x1 = sNode.x + ux * sNode.radius;
                const y1 = sNode.y + uy * sNode.radius;
                const x2 = tNode.x - ux * (tNode.radius + 6);
                const y2 = tNode.y - uy * (tNode.radius + 6);

                // Slight natural curve for Obsidian graph organic beauty
                const mx = (x1 + x2) / 2 - uy * 16;
                const my = (y1 + y2) / 2 + ux * 16;

                const strokeColor = edge.isActive
                  ? TOKENS.purple
                  : isEdgeFocused && activeFocusId
                  ? TOKENS.sky
                  : "#CBD5E1";
                const strokeWidth = edge.isActive ? 2.8 : isEdgeFocused && activeFocusId ? 2.0 : 1.4;

                return (
                  <g key={edge.id} opacity={edgeOpacity}>
                    {/* Shadow / Glow for active transit edges */}
                    {edge.isActive && (
                      <path
                        d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                        fill="none"
                        stroke="#E9D5FF"
                        strokeWidth={6}
                        strokeLinecap="round"
                      />
                    )}

                    {/* Main Edge Path */}
                    <path
                      d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={edge.isActive ? "8, 6" : undefined}
                      strokeLinecap="round"
                      markerEnd={edge.isActive ? "url(#graph-arrow-active)" : "url(#graph-arrow)"}
                    />

                    {/* Active Transit Indicator Pill at edge midpoint */}
                    {edge.isActive && (
                      <g transform={`translate(${mx}, ${my})`}>
                        <rect
                          x={-28}
                          y={-10}
                          width={56}
                          height={20}
                          rx={10}
                          fill="#FFFFFF"
                          stroke={TOKENS.purple}
                          strokeWidth={1.5}
                          style={{ filter: "drop-shadow(0 2px 5px rgba(147, 51, 234, 0.2))" }}
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={TOKENS.purpleText}
                          fontSize={9.5}
                          fontWeight={700}
                          fontFamily="'JetBrains Mono', monospace"
                        >
                          {edge.etaMins}m ETA
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* 2. NODES */}
              {visibleNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isHovered = hoveredNodeId === node.id;
                const isConnected = connectedIds.has(node.id);
                const isFocused = !activeFocusId || isConnected;

                const nodeOpacity = isFocused ? 1 : 0.2;

                // Color mapping based on hospital status
                let ringColor = TOKENS.emerald;
                let fillColor = "#F0FDF4";
                let badgeText = TOKENS.emeraldText;

                if (node.status === "Shortage") {
                  ringColor = TOKENS.rose;
                  fillColor = "#FFF1F2";
                  badgeText = TOKENS.roseText;
                } else if (node.status === "Surplus") {
                  ringColor = TOKENS.amber;
                  fillColor = "#FFFBEB";
                  badgeText = TOKENS.amberText;
                }

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    opacity={nodeOpacity}
                    onMouseDown={(e) => handleMouseDownNode(e, node)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
                  >
                    {/* Subtle Aura for Shortage or Selection */}
                    {node.status === "Shortage" && (
                      <circle
                        r={node.radius + 10}
                        fill="url(#shortageGlow)"
                        style={{ pointerEvents: "none" }}
                      />
                    )}
                    {isSelected && (
                      <circle
                        r={node.radius + 6}
                        fill="none"
                        stroke={TOKENS.purple}
                        strokeWidth={2}
                        strokeDasharray="4, 3"
                        style={{ pointerEvents: "none" }}
                      />
                    )}

                    {/* Subtle outer indicator ring for Trauma-1 centers */}
                    {node.isTrauma && (
                      <circle
                        r={node.radius + 4}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth={1.2}
                        opacity={0.5}
                      />
                    )}

                    {/* Clean Node Bubble */}
                    <circle
                      r={isHovered ? node.radius + 2 : node.radius}
                      fill={fillColor}
                      stroke={isSelected ? TOKENS.purple : isHovered ? TOKENS.sky : ringColor}
                      strokeWidth={isSelected ? 2.5 : isHovered ? 2.2 : 1.8}
                      style={{
                        filter: isSelected
                          ? "drop-shadow(0 4px 10px rgba(147, 51, 234, 0.25))"
                          : isHovered
                          ? "drop-shadow(0 3px 8px rgba(2, 132, 199, 0.2))"
                          : "drop-shadow(0 2px 5px rgba(0, 0, 0, 0.05))",
                        transition: "all 0.15s ease",
                      }}
                    />

                    {/* Hospital Code (Row 1 inside bubble) */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      y={-3}
                      fill={TOKENS.textPrimary}
                      fontSize={node.isTrauma ? 10 : 9}
                      fontWeight={800}
                      fontFamily="'JetBrains Mono', monospace"
                      style={{ pointerEvents: "none" }}
                    >
                      {node.code}
                    </text>

                    {/* Stock Units (Row 2 inside bubble - clean & compact) */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      y={7}
                      fill={badgeText}
                      fontSize={7.5}
                      fontWeight={700}
                      fontFamily="'JetBrains Mono', monospace"
                      style={{ pointerEvents: "none" }}
                    >
                      {node.totalStock}u
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* ── SELECTED HOSPITAL DISPATCH CARD (Bottom-Left HUD) ── */}
          {selectedNode && (
            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: 16,
                zIndex: 20,
                width: 320,
                background: "rgba(255, 255, 255, 0.96)",
                backdropFilter: "blur(14px)",
                borderRadius: 20,
                padding: "16px 18px",
                border: `1.5px solid ${TOKENS.border}`,
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {/* Card Top: Code badge, Name, Trauma & Close */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      background: TOKENS.purpleSoft,
                      color: TOKENS.purpleText,
                      fontWeight: 800,
                      fontSize: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: "3px 8px",
                      borderRadius: 8,
                      border: `1px solid ${TOKENS.purple}30`,
                    }}
                  >
                    {selectedNode.code}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TOKENS.textPrimary, lineHeight: 1.2 }}>
                      {selectedNode.short}
                    </div>
                    <div style={{ fontSize: 10.5, color: TOKENS.textSecondary }}>
                      {selectedNode.zone}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {selectedNode.isTrauma && (
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: TOKENS.emeraldText,
                        background: TOKENS.emeraldSoft,
                        padding: "2px 6px",
                        borderRadius: 6,
                      }}
                    >
                      TRAUMA-1
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedNodeId(null)}
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      padding: 2,
                      color: TOKENS.textMuted,
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* 3-Metric Gauges (Stock, Target, Net Deficit/Surplus) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                  background: TOKENS.board,
                  padding: "10px 12px",
                  borderRadius: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 9.5, color: TOKENS.textSecondary, fontWeight: 600 }}>Stock</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: TOKENS.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>
                    {selectedNode.totalStock}u
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, color: TOKENS.textSecondary, fontWeight: 600 }}>Target</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: TOKENS.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>
                    {selectedNode.targetBaseline}u
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, color: TOKENS.textSecondary, fontWeight: 600 }}>Balance</div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      fontFamily: "'JetBrains Mono', monospace",
                      color:
                        selectedNode.netBalance < 0
                          ? TOKENS.rose
                          : selectedNode.netBalance > 15
                          ? TOKENS.amber
                          : TOKENS.emerald,
                    }}
                  >
                    {selectedNode.netBalance > 0 ? `+${selectedNode.netBalance}` : selectedNode.netBalance}u
                  </div>
                </div>
              </div>

              {/* Telemetry / Cold-Chain info */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: TOKENS.textSecondary }}>
                  <Thermometer size={13} color={TOKENS.emerald} />
                  <span>22.1°C safe transit band</span>
                </div>
                <div style={{ fontWeight: 600, color: TOKENS.emeraldText }}>
                  Agitation OK
                </div>
              </div>

              {/* Optimal Donor Match Card (If in Shortage) */}
              {selectedNode.status === "Shortage" && optimalDonor && (
                <div
                  style={{
                    background: TOKENS.roseSoft,
                    borderRadius: 12,
                    padding: "10px 12px",
                    border: `1px solid ${TOKENS.rose}25`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <ShieldAlert size={12} color={TOKENS.rose} />
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: TOKENS.roseText }}>
                        Optimal Donor Hub Match:
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: TOKENS.purpleText,
                        background: "#FFFFFF",
                        padding: "1px 6px",
                        borderRadius: 999,
                      }}
                    >
                      {optimalDonor.etaMins}m ETA
                    </span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TOKENS.textPrimary }}>
                    {optimalDonor.name} ({optimalDonor.zone})
                  </div>
                  <div style={{ fontSize: 10.5, color: TOKENS.textSecondary }}>
                    Distance: {optimalDonor.distanceKm} km · Reserves: {optimalDonor.availableStock}u
                  </div>
                </div>
              )}

              {/* Action Button: Jump to Dispatch / Trigger Transit */}
              <button
                type="button"
                onClick={() => {
                  window.location.hash = "#/workspace/dispatch";
                }}
                style={{
                  width: "100%",
                  height: 38,
                  borderRadius: 12,
                  background: TOKENS.textPrimary,
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                  transition: "all 0.15s ease",
                }}
              >
                <span>Open in Dispatch Console</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* ── EXPANDABLE TRANSIT CORRIDORS DRAWER (Bottom-Right HUD) ── */}
          <div
            style={{
              position: "absolute",
              bottom: 16,
              right: 16,
              zIndex: 20,
              width: showOrdersDrawer ? 320 : "auto",
              background: "rgba(255, 255, 255, 0.96)",
              backdropFilter: "blur(14px)",
              borderRadius: showOrdersDrawer ? 18 : 999,
              border: `1.5px solid ${TOKENS.border}`,
              boxShadow: "0 6px 20px rgba(0, 0, 0, 0.06)",
              overflow: "hidden",
              transition: "all 0.2s ease",
            }}
          >
            {/* Drawer Header */}
            <div
              onClick={() => setShowOrdersDrawer((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: showOrdersDrawer ? "10px 14px" : "7px 14px",
                cursor: "pointer",
                background: TOKENS.card,
                borderBottom: showOrdersDrawer ? `1px solid ${TOKENS.border}` : "none",
                fontSize: 11.5,
                fontWeight: 600,
              }}
            >
              <Activity size={13} color={TOKENS.purple} />
              <span style={{ color: TOKENS.textPrimary, fontWeight: 700 }}>
                Corridors ({edges.filter((e) => e.isActive).length})
              </span>
              <span style={{ fontSize: 9.5, color: TOKENS.textMuted, marginLeft: 4 }}>
                {showOrdersDrawer ? "Close" : "View"}
              </span>
            </div>

            {/* Orders List */}
            {showOrdersDrawer && (
              <div
                style={{
                  maxHeight: 220,
                  overflowY: "auto",
                  padding: "8px 12px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {edges.filter((e) => e.isActive).map((edge) => {
                  const sNode = nodesRef.current.find((n) => n.id === edge.sourceId);
                  const tNode = nodesRef.current.find((n) => n.id === edge.targetId);
                  const order = edge.activeOrder;
                  const isSelected = selectedNodeId === edge.targetId || selectedNodeId === edge.sourceId;

                  return (
                    <div
                      key={edge.id}
                      onClick={() => setSelectedNodeId(edge.targetId)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        background: isSelected ? TOKENS.purpleSoft : TOKENS.board,
                        border: isSelected ? `1.5px solid ${TOKENS.purple}` : `1px solid ${TOKENS.border}`,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: "'JetBrains Mono', monospace",
                              color: TOKENS.textPrimary,
                            }}
                          >
                            {sNode?.code || "SRC"} → {tNode?.code || "TGT"}
                          </span>
                          <span
                            style={{
                              fontSize: 9.5,
                              color: TOKENS.purpleText,
                              background: "#FFFFFF",
                              padding: "1px 5px",
                              borderRadius: 4,
                              fontWeight: 600,
                            }}
                          >
                            {order?.units || 8}u
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: TOKENS.textSecondary, marginTop: 2 }}>
                          {order?.courier?.name || "Rajesh Kumar"} · {order?.vehicleId || "VAN-01"}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: TOKENS.emeraldText,
                          }}
                        >
                          {edge.etaMins}m ETA
                        </div>
                        <div style={{ fontSize: 9.5, color: TOKENS.textMuted }}>
                          {edge.distanceKm} km
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
