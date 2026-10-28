import { useEffect, useState } from "react";
import LandingPage from "./components/landing/LandingPage";
import WorkspaceShell from "./components/workspace/WorkspaceShell";
import type { ScenarioKey } from "./types";

export type WorkspaceTab = "map" | "dashboard" | "surge" | "inventory" | "dispatch";

interface Route {
  view: "landing" | "workspace";
  tab: WorkspaceTab;
  scenario: ScenarioKey | null;
}

const SCENARIO_KEYS: Record<string, ScenarioKey> = {
  dengue: "dengue",
  trauma: "trauma",
  coldchain: "coldchain",
};

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [section, tab, scenario] = raw.split("/");
  if (section !== "workspace") {
    return { view: "landing", tab: "map", scenario: null };
  }
  let resolvedTab: WorkspaceTab = "map";
  if (tab === "dashboard" || tab === "inventory" || tab === "dispatch") {
    resolvedTab = "dashboard";
  } else if (tab === "surge" || tab === "stress") {
    resolvedTab = "surge";
  } else if (tab === "map" || tab === "tv") {
    resolvedTab = "map";
  }
  return {
    view: "workspace",
    tab: resolvedTab,
    scenario: scenario ? (SCENARIO_KEYS[scenario] ?? null) : null,
  };
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    };
    window.addEventListener("hashchange", onChange);
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#/");
    }
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  if (route.view === "landing") {
    return (
      <LandingPage
        onOpenWorkspace={() => navigate("/workspace/map")}
        onRunDemo={() => navigate("/workspace/surge/dengue")}
      />
    );
  }

  return (
    <WorkspaceShell
      initialTab={route.tab}
      initialScenario={route.scenario}
      onExit={() => navigate("/")}
    />
  );
}
