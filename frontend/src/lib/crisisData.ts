export interface EmergencyRoute {
  id: string;
  source_id: string;
  source_name: string;
  donorCode: string;
  target_id: string;
  target_name: string;
  recipientCode: string;
  cargo: string;
  blood: string;
  units: number;
  eta: string;
  reason: string;
}

export interface CrisisScenario {
  id: "dengue" | "trauma" | "agitator";
  num: string;
  title: string;
  shortTitle: string;
  sub: string;
  accent: string;
  accentBg: string;
  epicenterName: string;
  centerCoords: [number, number]; // [lng, lat]
  zoom: number;
  affectedNodeIds: string[];
  bannerTitle: string;
  bannerTelemetry: string;
  siloedStockouts: number;
  meshStockouts: number;
  siloedStockoutLabel: string;
  meshStockoutLabel: string;
  rescuedUnits: number;
  rescuedSavingsText: string;
  oNegProtectedPct: number;
  oNegProtectedText: string;
  emergencyRoutes: EmergencyRoute[];
}

export const BASELINE_SCENARIO: Omit<CrisisScenario, "id" | "num" | "accent" | "accentBg" | "centerCoords" | "zoom" | "affectedNodeIds" | "shortTitle"> = {
  title: "Baseline Mesh Operations (Normal NCR Network Flow)",
  sub: "Steady-state automated clearinghouse balancing 25 nodes",
  epicenterName: "Delhi-NCR Autonomous Mesh",
  bannerTitle: "Baseline Mesh Operations (Normal NCR Network Flow)",
  bannerTelemetry: "OR-Tools Min-Cost Max-Flow · Operating at 98.8% Mesh Efficiency · 25 Nodes Linked",
  siloedStockouts: 24,
  meshStockouts: 0,
  siloedStockoutLabel: "24 Stockouts (Siloed)",
  meshStockoutLabel: "0 Stockouts (Steady State)",
  rescuedUnits: 34,
  rescuedSavingsText: "₹4.8L Bio-Value Saved",
  oNegProtectedPct: 98,
  oNegProtectedText: "Universal buffer distributed evenly across all trauma centers",
  emergencyRoutes: [
    { id: "#TX-1041", source_id: "ND-04", source_name: "Fortis Hospital Noida", donorCode: "N62", target_id: "ND-01", target_name: "AIIMS Trauma Center", recipientCode: "AIM", cargo: "8u O+ PLT", blood: "O+", units: 8, eta: "22m · Routine", reason: "Corridor inventory balancing" },
    { id: "#TX-1042", source_id: "ND-05", source_name: "Medanta The Medicity", donorCode: "MDT", target_id: "ND-07", target_name: "GTB Hospital East Delhi", recipientCode: "GTB", cargo: "6u O- PLT", blood: "O-", units: 6, eta: "32m · Standing", reason: "O-Negative trauma reserve replenishment" },
    { id: "#TX-1043", source_id: "ND-11", source_name: "Apollo Hospital Sarita", donorCode: "APL", target_id: "ND-09", target_name: "Lok Nayak LNJP", recipientCode: "LNJ", cargo: "12u A+ PLT", blood: "A+", units: 12, eta: "19m · Regular", reason: "Scheduled FEFO expiry prevention" },
  ],
};

export const CRISIS_SCENARIOS: Record<string, CrisisScenario> = {
  dengue: {
    id: "dengue",
    num: "01",
    shortTitle: "East Delhi Dengue Outbreak",
    title: "01 · East Delhi Dengue Outbreak (+340% Platelet Surge)",
    sub: "+340% Platelet Surge at GTB & AIIMS",
    accent: "#E11D48",
    accentBg: "rgba(225, 29, 72, 0.08)",
    epicenterName: "GTB Hospital & East Delhi Dengue Corridor",
    centerCoords: [77.265, 28.625],
    zoom: 11.2,
    affectedNodeIds: ["ND-07", "ND-01", "ND-09", "ND-12"],
    bannerTitle: "01 · East Delhi Dengue Outbreak (+340% Platelet Surge)",
    bannerTelemetry: "OR-Tools Min-Cost Max-Flow · Converged in 14.8ms · 7,840 arcs evaluated",
    siloedStockouts: 38,
    meshStockouts: 0,
    siloedStockoutLabel: "38 Stockouts (Siloed)",
    meshStockoutLabel: "0 Stockouts (100% Demand Met)",
    rescuedUnits: 94,
    rescuedSavingsText: "₹13.2L Bio-Value Saved",
    oNegProtectedPct: 100,
    oNegProtectedText: "Asymmetric ABO substitution satisfied 48u via type-specific match",
    emergencyRoutes: [
      { id: "#EMG-01", source_id: "ND-04", source_name: "Fortis Hospital Noida", donorCode: "N62", target_id: "ND-07", target_name: "GTB Hospital East Delhi", recipientCode: "GTB", cargo: "12u O+ PLT", blood: "O+", units: 12, eta: "14m · Green Corridor", reason: "Dengue deficit neutralization" },
      { id: "#EMG-02", source_id: "ND-11", source_name: "Apollo Hospital Sarita", donorCode: "APL", target_id: "ND-09", target_name: "Lok Nayak LNJP", recipientCode: "LNJ", cargo: "14u A+ PLT", blood: "A+", units: 14, eta: "16m · Expressway", reason: "Pediatric dengue surge" },
      { id: "#EMG-03", source_id: "ND-05", source_name: "Medanta The Medicity", donorCode: "MDT", target_id: "ND-01", target_name: "AIIMS Trauma Center", recipientCode: "AIM", cargo: "10u O- PLT", blood: "O-", units: 10, eta: "24m · Pre-positioned", reason: "ICU platelet buffer" },
      { id: "#EMG-04", source_id: "ND-03", source_name: "Max Super Specialty Saket", donorCode: "MAX", target_id: "ND-02", target_name: "Safdarjung Super Specialty", recipientCode: "SFD", cargo: "8u B+ PLT", blood: "B+", units: 8, eta: "9m · Direct Transfer", reason: "Regional cross-match leveling" },
      { id: "#EMG-05", source_id: "ND-20", source_name: "Jaypee Hospital Noida", donorCode: "NBV", target_id: "ND-12", target_name: "Rajiv Gandhi Super", recipientCode: "RGV", cargo: "6u O+ PLT", blood: "O+", units: 6, eta: "18m · Outer Ring", reason: "East corridor reserve" },
    ],
  },
  trauma: {
    id: "trauma",
    num: "02",
    shortTitle: "NH-48 Highway Mass-Casualty",
    title: "02 · NH-48 Highway Mass-Casualty (STAT O-Negative Drain)",
    sub: "STAT O-Negative Drain at Medanta & Artemis",
    accent: "#D97706",
    accentBg: "rgba(217, 119, 6, 0.08)",
    epicenterName: "Medanta The Medicity & Gurugram NH-48 Toll",
    centerCoords: [77.145, 28.540],
    zoom: 11.3,
    affectedNodeIds: ["ND-05", "ND-23", "ND-01", "ND-02"],
    bannerTitle: "02 · NH-48 Highway Mass-Casualty (STAT O-Negative Drain)",
    bannerTelemetry: "OR-Tools Min-Cost Max-Flow · Converged in 12.2ms · 5,120 arcs evaluated",
    siloedStockouts: 42,
    meshStockouts: 0,
    siloedStockoutLabel: "42 Unlinked Stockouts (Siloed)",
    meshStockoutLabel: "0 Stockouts (STAT Cover)",
    rescuedUnits: 58,
    rescuedSavingsText: "₹8.7L Bio-Value Saved",
    oNegProtectedPct: 94,
    oNegProtectedText: "Universal O- prioritized for uncrossmatched massive trauma",
    emergencyRoutes: [
      { id: "#EMG-11", source_id: "ND-23", source_name: "Artemis Hospital Gurugram", donorCode: "NH4", target_id: "ND-05", target_name: "Medanta The Medicity", recipientCode: "MDT", cargo: "16u O- PLT", blood: "O-", units: 16, eta: "8m · Code Red", reason: "Mass trauma resuscitation" },
      { id: "#EMG-12", source_id: "ND-19", source_name: "Paras Health Gurugram", donorCode: "GCH", target_id: "ND-01", target_name: "AIIMS Trauma Center", recipientCode: "AIM", cargo: "12u O+ PLT", blood: "O+", units: 12, eta: "22m · Flyover", reason: "Trauma surgery transfusion" },
      { id: "#EMG-13", source_id: "ND-13", source_name: "Fortis Vasant Kunj", donorCode: "FSB", target_id: "ND-02", target_name: "Safdarjung Hospital", recipientCode: "SFD", cargo: "8u A- PLT", blood: "A-", units: 8, eta: "12m · Rapid", reason: "Emergency replenishment" },
      { id: "#EMG-14", source_id: "ND-03", source_name: "Max Super Specialty Saket", donorCode: "MAX", target_id: "ND-05", target_name: "Medanta The Medicity", recipientCode: "MDT", cargo: "10u O- PLT", blood: "O-", units: 10, eta: "26m · Expressway", reason: "Trauma buffer backfill" },
      { id: "#EMG-15", source_id: "ND-14", source_name: "BLK-Max Super Specialty", donorCode: "BLK", target_id: "ND-08", target_name: "Dr. RML Hospital", recipientCode: "RML", cargo: "6u B+ PLT", blood: "B+", units: 6, eta: "11m · Direct Corridor", reason: "Central trauma surge" },
    ],
  },
  agitator: {
    id: "agitator",
    num: "03",
    shortTitle: "Safdarjung 28°C Agitator Fault",
    title: "03 · Safdarjung 28°C Agitator Fault (42u Emergency Evacuation)",
    sub: "42u Platelets Require <2h Evacuation",
    accent: "#0284C7",
    accentBg: "rgba(2, 132, 199, 0.08)",
    epicenterName: "Safdarjung Super Specialty Blood Bank",
    centerCoords: [77.205, 28.555],
    zoom: 11.8,
    affectedNodeIds: ["ND-02", "ND-01", "ND-03", "ND-06"],
    bannerTitle: "03 · Safdarjung 28°C Agitator Fault (42u Emergency Evacuation)",
    bannerTelemetry: "OR-Tools Min-Cost Max-Flow · Converged in 9.4ms · 3,450 arcs evaluated",
    siloedStockouts: 42,
    meshStockouts: 0,
    siloedStockoutLabel: "42u Incinerated Waste (Siloed)",
    meshStockoutLabel: "0u Spoiled (100% Evacuated)",
    rescuedUnits: 42,
    rescuedSavingsText: "₹6.3L Bio-Value Saved",
    oNegProtectedPct: 100,
    oNegProtectedText: "Validated 22.0°C active smart courier containers",
    emergencyRoutes: [
      { id: "#EMG-21", source_id: "ND-02", source_name: "Safdarjung Hospital", donorCode: "SFD", target_id: "ND-01", target_name: "AIIMS Trauma Center", recipientCode: "AIM", cargo: "14u O+ PLT", blood: "O+", units: 14, eta: "6m · Immediate Evac", reason: "Thermal cutoff rescue" },
      { id: "#EMG-22", source_id: "ND-02", source_name: "Safdarjung Hospital", donorCode: "SFD", target_id: "ND-03", target_name: "Max Super Specialty Saket", recipientCode: "MAX", cargo: "12u B+ PLT", blood: "B+", units: 12, eta: "10m · Coolbox Transit", reason: "28°C evacuation order" },
      { id: "#EMG-23", source_id: "ND-02", source_name: "Safdarjung Hospital", donorCode: "SFD", target_id: "ND-06", target_name: "Fortis Escorts Okhla", recipientCode: "FTN", cargo: "8u A+ PLT", blood: "A+", units: 8, eta: "14m · Urgent Reroute", reason: "Perishable preservation" },
      { id: "#EMG-24", source_id: "ND-02", source_name: "Safdarjung Hospital", donorCode: "SFD", target_id: "ND-08", target_name: "Dr. RML Hospital", recipientCode: "RML", cargo: "4u O- PLT", blood: "O-", units: 4, eta: "16m · Cold-Chain STAT", reason: "Thermal cutoff rescue" },
      { id: "#EMG-25", source_id: "ND-02", source_name: "Safdarjung Hospital", donorCode: "SFD", target_id: "ND-25", target_name: "Holy Family Okhla", recipientCode: "PRS", cargo: "4u AB+ PLT", blood: "AB+", units: 4, eta: "18m · Evacuation Arcs", reason: "Zero-waste absorption" },
    ],
  },
};

export const CRISIS_BUTTONS = [
  {
    id: "dengue",
    num: "01",
    label: "East Delhi Dengue Outbreak",
    sub: "+340% Platelet Surge at GTB & AIIMS",
    accent: "#E11D48",
    accentBg: "rgba(225, 29, 72, 0.08)",
  },
  {
    id: "trauma",
    num: "02",
    label: "NH-48 Highway Mass-Casualty",
    sub: "STAT O-Negative Drain at Medanta & Artemis",
    accent: "#D97706",
    accentBg: "rgba(217, 119, 6, 0.08)",
  },
  {
    id: "agitator",
    num: "03",
    label: "Safdarjung 28°C Agitator Fault",
    sub: "42u Platelets Require <2h Evacuation",
    accent: "#0284C7",
    accentBg: "rgba(2, 132, 199, 0.08)",
  },
];

