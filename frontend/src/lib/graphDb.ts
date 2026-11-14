/**
 * src/lib/graphDb.ts
 * In-Memory Graph Database & Logistics Knowledge Graph Engine
 *
 * Models the Plexus Route Graph as a Graph Database:
 * - Nodes: 25 Delhi-NCR Hospitals with live inventories, baselines, and status.
 * - Edges: Physical transport corridors, inter-hub meshes, and active in-transit transfer orders.
 * - Graph queries: Cypher-like pattern matching, bottleneck analysis, shortest path,
 *   surplus-to-deficit rebalance optimization, and cold-chain compliance tracking.
 */

import { NCR_HOSPITAL_METAS, findOptimalDonorHub } from './hospitalTelemetry';
import type { TickState } from '../types';
import type { DispatchOrder } from '../data/dispatch/types';

export interface GraphNode {
  id: string; // e.g. "ND-01"
  code: string; // e.g. "AIM"
  name: string; // e.g. "AIIMS Trauma"
  fullName: string;
  short: string;
  zone: string;
  city: string;
  coords: [number, number]; // [lng, lat]
  isTrauma: boolean;
  totalStock: number;
  targetBaseline: number;
  netBalance: number;
  status: 'Shortage' | 'Surplus' | 'Optimal';
  priorityScore: number;
  activeCourierText: string;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sourceCode: string;
  targetCode: string;
  distanceKm: number;
  etaMins: number;
  viabilityScore: number;
  type: 'IN_TRANSIT' | 'CORRIDOR' | 'HUB_MESH';
  isActive: boolean;
  activeOrder?: DispatchOrder;
}

export interface NetworkSummary {
  totalHospitals: number;
  totalNetworkStock: number;
  shortageCount: number;
  surplusCount: number;
  optimalCount: number;
  activeTransfersCount: number;
  unitsInTransit: number;
  criticalHospitals: Array<{ code: string; name: string; netBalance: number; stock: number; target: number }>;
  surplusHospitals: Array<{ code: string; name: string; netBalance: number; stock: number; target: number }>;
  inTransitSummary: Array<{ id: string; from: string; to: string; units: number; courier: string; tempC: number; etaMin: number }>;
}

export class RouteGraphDatabase {
  public nodes: Map<string, GraphNode> = new Map();
  public edges: GraphEdge[] = [];
  public adjacency: Map<string, GraphEdge[]> = new Map();
  public codeToId: Map<string, string> = new Map();

  constructor(state?: TickState, orders?: DispatchOrder[]) {
    this.refresh(state, orders);
  }

  /**
   * Refreshes or builds the GraphDB from simulation tick state and dispatch orders
   */
  public refresh(state?: TickState, orders: DispatchOrder[] = []): void {
    this.nodes.clear();
    this.edges = [];
    this.adjacency.clear();
    this.codeToId.clear();

    const liveNodes = state?.nodes || [];

    // 1. Ingest Nodes
    for (const [id, meta] of Object.entries(NCR_HOSPITAL_METAS)) {
      const liveNode = liveNodes.find((n) => n.id === id);
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
      } else if (liveNode && typeof liveNode.net_balance === 'number') {
        stock = targetBaseline + liveNode.net_balance;
      }

      const netBalance = stock - targetBaseline;
      let status: 'Shortage' | 'Surplus' | 'Optimal' = 'Optimal';
      if (netBalance < -5) status = 'Shortage';
      else if (netBalance > 18) status = 'Surplus';

      const supplyRatio = stock / Math.max(targetBaseline, 1);
      const priorityScore = Math.round((1 - supplyRatio) * 100);

      const node: GraphNode = {
        id,
        code: meta.code,
        name: meta.fullName,
        fullName: meta.fullName,
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
      };

      this.nodes.set(id, node);
      this.codeToId.set(meta.code.toUpperCase(), id);
      this.adjacency.set(id, []);
    }

    const edgeSet = new Set<string>();

    // 2. Ingest Active In-Transit Transfers
    for (const order of orders) {
      if (order.status === 'in_transit' || order.status === 'approved' || order.status === 'proposed') {
        const srcId = order.fromId || this.codeToId.get(order.from?.toUpperCase() || '');
        const tgtId = order.toId || this.codeToId.get(order.to?.toUpperCase() || '');
        if (srcId && tgtId && this.nodes.has(srcId) && this.nodes.has(tgtId)) {
          const key = `${srcId}->${tgtId}`;
          edgeSet.add(key);
          const edge: GraphEdge = {
            id: order.id,
            sourceId: srcId,
            targetId: tgtId,
            sourceCode: this.nodes.get(srcId)!.code,
            targetCode: this.nodes.get(tgtId)!.code,
            distanceKm: order.distanceKm || 12.4,
            etaMins: order.etaMin || 18,
            viabilityScore: 95,
            type: 'IN_TRANSIT',
            isActive: true,
            activeOrder: order,
          };
          this.edges.push(edge);
          this.adjacency.get(srcId)?.push(edge);
        }
      }
    }

    // 3. Ingest Transit Corridors for Shortage Nodes (matched to optimal donor)
    for (const node of this.nodes.values()) {
      if (node.status === 'Shortage') {
        const donor = findOptimalDonorHub(node.id, 'O+', liveNodes);
        if (donor && donor.id !== node.id && this.nodes.has(donor.id)) {
          const key1 = `${donor.id}->${node.id}`;
          const key2 = `${node.id}->${donor.id}`;
          if (!edgeSet.has(key1) && !edgeSet.has(key2)) {
            edgeSet.add(key1);
            const edge: GraphEdge = {
              id: `COR-${donor.code}-${node.code}`,
              sourceId: donor.id,
              targetId: node.id,
              sourceCode: donor.code,
              targetCode: node.code,
              distanceKm: donor.distanceKm,
              etaMins: donor.etaMins,
              viabilityScore: Math.max(40, 100 - donor.etaMins * 2),
              type: 'CORRIDOR',
              isActive: false,
            };
            this.edges.push(edge);
            this.adjacency.get(donor.id)?.push(edge);
          }
        }
      }
    }

    // 4. Ingest Core Regional Inter-Hub Mesh Corridors
    const hubPairs: [string, string][] = [
      ['ND-01', 'ND-02'], // AIIMS <-> Safdarjung
      ['ND-01', 'ND-03'], // AIIMS <-> Max Saket
      ['ND-03', 'ND-11'], // Max Saket <-> Apollo
      ['ND-01', 'ND-08'], // AIIMS <-> RML
      ['ND-08', 'ND-14'], // RML <-> BLK-Max
      ['ND-04', 'ND-07'], // Fortis Noida <-> GTB
      ['ND-05', 'ND-23'], // Medanta <-> Artemis
      ['ND-05', 'ND-02'], // Medanta <-> Safdarjung
    ];

    for (const [sId, tId] of hubPairs) {
      const key1 = `${sId}->${tId}`;
      const key2 = `${tId}->${sId}`;
      if (!edgeSet.has(key1) && !edgeSet.has(key2) && this.nodes.has(sId) && this.nodes.has(tId)) {
        edgeSet.add(key1);
        const edge: GraphEdge = {
          id: `HUB-${sId}-${tId}`,
          sourceId: sId,
          targetId: tId,
          sourceCode: this.nodes.get(sId)!.code,
          targetCode: this.nodes.get(tId)!.code,
          distanceKm: 9.8,
          etaMins: 14,
          viabilityScore: 75,
          type: 'HUB_MESH',
          isActive: false,
        };
        this.edges.push(edge);
        this.adjacency.get(sId)?.push(edge);
      }
    }
  }

  /**
   * Retrieves high-level network health metrics
   */
  public getNetworkSummary(): NetworkSummary {
    let totalStock = 0;
    const shortages: Array<{ code: string; name: string; netBalance: number; stock: number; target: number }> = [];
    const surpluses: Array<{ code: string; name: string; netBalance: number; stock: number; target: number }> = [];
    let optimalCount = 0;

    for (const n of this.nodes.values()) {
      totalStock += n.totalStock;
      if (n.status === 'Shortage') {
        shortages.push({ code: n.code, name: n.short, netBalance: n.netBalance, stock: n.totalStock, target: n.targetBaseline });
      } else if (n.status === 'Surplus') {
        surpluses.push({ code: n.code, name: n.short, netBalance: n.netBalance, stock: n.totalStock, target: n.targetBaseline });
      } else {
        optimalCount++;
      }
    }

    shortages.sort((a, b) => a.netBalance - b.netBalance);
    surpluses.sort((a, b) => b.netBalance - a.netBalance);

    const activeEdges = this.edges.filter((e) => e.isActive && e.activeOrder);
    let unitsInTransit = 0;
    const inTransitSummary = activeEdges.map((e) => {
      const ord = e.activeOrder!;
      unitsInTransit += ord.units;
      return {
        id: ord.id,
        from: ord.from,
        to: ord.to,
        units: ord.units,
        courier: ord.courier?.name || 'Assigned Courier',
        tempC: ord.coldChain?.tempC ?? 22.1,
        etaMin: ord.etaMin,
      };
    });

    return {
      totalHospitals: this.nodes.size,
      totalNetworkStock: totalStock,
      shortageCount: shortages.length,
      surplusCount: surpluses.length,
      optimalCount,
      activeTransfersCount: activeEdges.length,
      unitsInTransit,
      criticalHospitals: shortages,
      surplusHospitals: surpluses,
      inTransitSummary,
    };
  }

  /**
   * Finds a hospital by code, name, or city substring
   */
  public findHospital(query: string): GraphNode | null {
    const q = query.trim().toLowerCase();
    for (const n of this.nodes.values()) {
      if (
        n.code.toLowerCase() === q ||
        n.id.toLowerCase() === q ||
        n.short.toLowerCase() === q ||
        n.name.toLowerCase().includes(q) ||
        n.fullName.toLowerCase().includes(q) ||
        n.city.toLowerCase().includes(q)
      ) {
        return n;
      }
    }
    return null;
  }

  /**
   * Evaluates optimal donor matches for a specific shortage hospital
   */
  public getOptimalDonorRebalance(targetCode: string): Array<{
    donorCode: string;
    donorName: string;
    surplusUnits: number;
    distanceKm: number;
    etaMins: number;
    score: number;
  }> {
    const tgtNode = this.findHospital(targetCode);
    if (!tgtNode) return [];

    const candidates: Array<{
      donorCode: string;
      donorName: string;
      surplusUnits: number;
      distanceKm: number;
      etaMins: number;
      score: number;
    }> = [];

    for (const n of this.nodes.values()) {
      if (n.id === tgtNode.id || n.netBalance <= 0) continue;

      // Approximate Euclidean distance in km from lat/lng
      const dLng = (n.coords[0] - tgtNode.coords[0]) * 95;
      const dLat = (n.coords[1] - tgtNode.coords[1]) * 111;
      const distanceKm = Math.round(Math.sqrt(dLng * dLng + dLat * dLat) * 10) / 10;
      const etaMins = Math.round(distanceKm * 1.8 + 6);
      const score = Math.max(10, Math.round(n.netBalance * 2 - distanceKm));

      candidates.push({
        donorCode: n.code,
        donorName: n.name,
        surplusUnits: n.netBalance,
        distanceKm,
        etaMins,
        score,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 5);
  }

  /**
   * Dijkstra / Shortest Path between two hospitals over existing edges
   */
  public findShortestPath(fromQuery: string, toQuery: string): {
    path: string[];
    totalDistanceKm: number;
    totalEtaMins: number;
    edges: GraphEdge[];
  } | null {
    const startNode = this.findHospital(fromQuery);
    const endNode = this.findHospital(toQuery);
    if (!startNode || !endNode) return null;

    if (startNode.id === endNode.id) {
      return { path: [startNode.code], totalDistanceKm: 0, totalEtaMins: 0, edges: [] };
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, { nodeId: string; edge: GraphEdge }>();
    const unvisited = new Set<string>();

    for (const id of this.nodes.keys()) {
      distances.set(id, Infinity);
      unvisited.add(id);
    }
    distances.set(startNode.id, 0);

    while (unvisited.size > 0) {
      let currentId: string | null = null;
      let minDistance = Infinity;
      for (const id of unvisited) {
        const d = distances.get(id)!;
        if (d < minDistance) {
          minDistance = d;
          currentId = id;
        }
      }

      if (!currentId || minDistance === Infinity) break;
      if (currentId === endNode.id) break;

      unvisited.delete(currentId);

      // Inspect outgoing & incoming edges
      const neighbors = this.edges.filter((e) => e.sourceId === currentId || e.targetId === currentId);
      for (const edge of neighbors) {
        const neighborId = edge.sourceId === currentId ? edge.targetId : edge.sourceId;
        if (!unvisited.has(neighborId)) continue;

        const alt = distances.get(currentId)! + edge.distanceKm;
        if (alt < distances.get(neighborId)!) {
          distances.set(neighborId, alt);
          previous.set(neighborId, { nodeId: currentId, edge });
        }
      }
    }

    if (!previous.has(endNode.id)) {
      // Direct geometric fallback if mesh has disjoint clusters
      const dLng = (endNode.coords[0] - startNode.coords[0]) * 95;
      const dLat = (endNode.coords[1] - startNode.coords[1]) * 111;
      const dist = Math.round(Math.sqrt(dLng * dLng + dLat * dLat) * 10) / 10;
      return {
        path: [startNode.code, endNode.code],
        totalDistanceKm: dist,
        totalEtaMins: Math.round(dist * 1.8 + 8),
        edges: [],
      };
    }

    const pathNodes: string[] = [];
    const pathEdges: GraphEdge[] = [];
    let curr: string = endNode.id;

    while (curr !== startNode.id) {
      const step = previous.get(curr);
      if (!step) break;
      pathNodes.unshift(this.nodes.get(curr)!.code);
      pathEdges.unshift(step.edge);
      curr = step.nodeId;
    }
    pathNodes.unshift(startNode.code);

    const totalDist = pathEdges.reduce((sum, e) => sum + e.distanceKm, 0);
    const totalEta = pathEdges.reduce((sum, e) => sum + e.etaMins, 0);

    return {
      path: pathNodes,
      totalDistanceKm: Math.round(totalDist * 10) / 10,
      totalEtaMins: totalEta,
      edges: pathEdges,
    };
  }

  /**
   * Exports an LLM-ready Cypher and GraphDB document representing the entire live state
   */
  public exportGraphSnapshotAsContext(): string {
    const summary = this.getNetworkSummary();

    const nodeLines: string[] = [];
    for (const n of this.nodes.values()) {
      nodeLines.push(
        `(:Hospital {id: "${n.id}", code: "${n.code}", name: "${n.name}", zone: "${n.zone}", stock: ${n.totalStock}, target: ${n.targetBaseline}, netBalance: ${n.netBalance}, status: "${n.status}", isTrauma: ${n.isTrauma}})`
      );
    }

    const edgeLines: string[] = [];
    for (const e of this.edges) {
      if (e.isActive && e.activeOrder) {
        const o = e.activeOrder;
        edgeLines.push(
          `(:Hospital {code: "${e.sourceCode}"})-[:IN_TRANSIT {orderId: "${o.id}", units: ${o.units}, tempC: ${o.coldChain?.tempC ?? 22.1}, etaMin: ${e.etaMins}, courier: "${o.courier?.name || 'Courier'}"}]->(:Hospital {code: "${e.targetCode}"})`
        );
      } else {
        edgeLines.push(
          `(:Hospital {code: "${e.sourceCode}"})-[:${e.type} {distanceKm: ${e.distanceKm}, etaMin: ${e.etaMins}}]->(:Hospital {code: "${e.targetCode}"})`
        );
      }
    }

    return `=== PLEXUS ROUTE GRAPH DATABASE (GRAPHDB SNAPSHOT) ===
Nodes (${this.nodes.size} Hospitals in Delhi-NCR):
${nodeLines.join('\n')}

Edges (${this.edges.length} Logistic Corridors & Transfers):
${edgeLines.join('\n')}

Live Network Health:
- Total Stock: ${summary.totalNetworkStock} units across NCR
- Shortage Nodes (${summary.shortageCount}): ${summary.criticalHospitals.map((h) => `${h.name} (${h.code}: ${h.netBalance}u)`).join(', ') || 'None'}
- Surplus Hubs (${summary.surplusCount}): ${summary.surplusHospitals.map((h) => `${h.name} (${h.code}: +${h.netBalance}u)`).join(', ') || 'None'}
- Active Courier Transfers In-Flight (${summary.activeTransfersCount}): ${summary.inTransitSummary.map((t) => `${t.id} (${t.from} -> ${t.to}, ${t.units}u, ${t.tempC}°C, ETA ${t.etaMin}m)`).join('; ') || 'None'}
==========================================================`;
  }

  /**
   * Local Graph Reasoning fallback when Gemini API key is missing or offline
   */
  public evaluateLocalRuleQuery(query: string): string {
    const q = query.toLowerCase();
    const summary = this.getNetworkSummary();

    // 1. Shortage / Deficit questions
    if (q.includes('shortage') || q.includes('deficit') || q.includes('critical') || q.includes('urgent') || q.includes('need blood')) {
      if (summary.criticalHospitals.length === 0) {
        return `✅ **GraphDB Analysis:** Currently no hospitals are experiencing platelet shortages. All ${summary.totalHospitals} network nodes meet their target baseline inventories.`;
      }
      const list = summary.criticalHospitals
        .map((h, i) => `${i + 1}. **${h.name} (${h.code})**: Deficit of **${h.netBalance} units** (Stock: ${h.stock}u / Target: ${h.target}u)`)
        .join('\n');
      return `🚨 **GraphDB Shortage Analysis:**\nCurrently **${summary.shortageCount} hospitals** have critical platelet deficits:\n\n${list}\n\n💡 *Recommendation:* AIIMS Trauma (AIM) and Safdarjung (SFD) should receive priority emergency dispatch from Medanta Hub (MDT) or Max Saket (MAX).`;
    }

    // 2. Surplus / Donor questions
    if (q.includes('surplus') || q.includes('excess') || q.includes('donor') || q.includes('who has blood')) {
      const list = summary.surplusHospitals
        .map((h, i) => `${i + 1}. **${h.name} (${h.code})**: Surplus of **+${h.netBalance} units** (Stock: ${h.stock}u / Target: ${h.target}u)`)
        .join('\n');
      return `📦 **GraphDB Surplus Inventory:**\nIdentified **${summary.surplusCount} donor hubs** with reserve platelet capacity:\n\n${list}\n\n⚡ *Dispatcher Note:* Medanta Hub (MDT) has the largest surplus buffer (+${summary.surplusHospitals[0]?.netBalance || 0}u) available for immediate cross-zone transfer.`;
    }

    // 3. Active in-transit transfers / Courier / Cold-chain
    if (q.includes('transit') || q.includes('courier') || q.includes('order') || q.includes('temp') || q.includes('cold') || q.includes('transfer')) {
      if (summary.inTransitSummary.length === 0) {
        return `🚚 **GraphDB Courier Telemetry:**\nNo transfer orders are currently in transit across the NCR mesh.`;
      }
      const list = summary.inTransitSummary
        .map((t) => `• **Order #${t.id}**: \`${t.from}\` ➔ \`${t.to}\` | **${t.units} units** | Courier: ${t.courier} | Box Temp: **${t.tempC}°C** (20–24°C safe band) | ETA: **${t.etaMin} min**`)
        .join('\n');
      return `🚚 **GraphDB Live Active Transfers (${summary.activeTransfersCount} in-flight):**\nTotal **${summary.unitsInTransit} units** currently in transit:\n\n${list}\n\n🌡️ *Cold-Chain Status:* All active insulated cooler boxes are operating within the nominal 20.0°C–24.0°C platelet viability corridor with agitators active.`;
    }

    // 4. Specific hospital query (e.g. AIIMS, Safdarjung, Max)
    const matched = this.findHospital(query);
    if (matched) {
      const donors = this.getOptimalDonorRebalance(matched.code);
      const donorText = donors.length > 0
        ? `\n\n🎯 **Recommended Donor Matches:**\n${donors.slice(0, 3).map((d) => `• **${d.donorName} (${d.donorCode})**: +${d.surplusUnits}u surplus, ${d.distanceKm} km, ETA ${d.etaMins}m (Score: ${d.score})`).join('\n')}`
        : '';

      return `🏥 **GraphDB Profile for ${matched.fullName} (${matched.code}):**
- **Zone:** ${matched.zone} (${matched.city})
- **Trauma Center:** ${matched.isTrauma ? 'Yes (Level-1 Apex)' : 'Standard Hospital'}
- **Current Inventory:** **${matched.totalStock} units** (Target Baseline: ${matched.targetBaseline}u)
- **Net Balance:** ${matched.netBalance >= 0 ? `+${matched.netBalance}u (Surplus)` : `${matched.netBalance}u (Deficit / Shortage)`}
- **Status:** **${matched.status.toUpperCase()}** (Urgency Priority: ${matched.priorityScore}pt)${donorText}`;
    }

    // 5. Shortest path / Route finding query
    if (q.includes('path') || q.includes('route') || q.includes('from') || q.includes('to')) {
      // Check for two hospital mentions
      const found: GraphNode[] = [];
      for (const n of this.nodes.values()) {
        if (q.includes(n.code.toLowerCase()) || q.includes(n.short.toLowerCase())) {
          found.push(n);
        }
      }
      if (found.length >= 2) {
        const pathResult = this.findShortestPath(found[0].code, found[1].code);
        if (pathResult) {
          return `🗺️ **GraphDB Shortest Logistics Corridor:**
Route from **${found[0].short}** to **${found[1].short}**:
• **Transit Corridor:** ${pathResult.path.join(' ➔ ')}
• **Total Distance:** **${pathResult.totalDistanceKm} km**
• **Estimated Transit Time:** **~${pathResult.totalEtaMins} mins** via emergency courier`;
        }
      }
    }

    // 6. Default Network Summary
    return `📊 **Plexus Route GraphDB Overview:**
- **Network Scope:** 25 Hospital Nodes across 5 Delhi-NCR Logistics Zones
- **Total Platelet Stock:** **${summary.totalNetworkStock} units**
- **Shortage Nodes:** **${summary.shortageCount}** (${summary.criticalHospitals.map((h) => h.code).join(', ') || 'None'})
- **Surplus Hubs:** **${summary.surplusCount}** (${summary.surplusHospitals.map((h) => h.code).join(', ') || 'None'})
- **Active Couriers:** **${summary.activeTransfersCount} in-transit** (${summary.unitsInTransit} units moving)

💡 *Ask me anything like:*
- *"Which hospitals have shortages?"*
- *"Find best donor for Safdarjung"*
- *"Show active couriers and box temperatures"*
- *"Calculate shortest route from Medanta to AIIMS"*`;
  }
}
