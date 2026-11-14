import { useEffect, useState, useRef, lazy, Suspense, useCallback } from 'react';
import WorkspaceShell from './components/workspace/WorkspaceShell';
import MapStage from './components/map/MapStage';
import PlateletDevControls from './components/landing/PlateletDevControls';
import DebugProgressReadout from './components/shared/DebugProgressReadout';
import { useStoryStore } from './store/storyStore';
import {
  executeEnterWorkspace,
  executeExitToStory,
  getMorphTimeline,
  isMorphRunning,
  buildMorphTimeline,
} from './story/morphController';
import { playWorkspaceReveal, reverseWorkspaceReveal } from './story/workspaceReveal';
import { runAllStoryChecks } from './story/storyChecks';
import { useDispatchStore } from './data/dispatch';
import { getSession } from './portal/session';
import type { ScenarioKey } from './types';

// Code-split story components: never loaded on direct #/workspace/map visits
const LandingPage = lazy(() => import('./components/landing/LandingPage'));
const HeroPlateletCanvas = lazy(() => import('./components/landing/HeroPlateletCanvas'));
const SignInPage = lazy(() => import('./components/SignInPage'));
const LedgerGallery = lazy(() => import('./ui/ledger/LedgerGallery'));
const HospitalPortalShell = lazy(() =>
  import('./portal/HospitalPortalShell').then((m) => ({ default: m.HospitalPortalShell }))
);

export type WorkspaceTab = 'map' | 'dashboard' | 'surge' | 'inventory' | 'dispatch' | 'graph';

interface Route {
  view: 'landing' | 'workspace' | 'signin' | 'hospital' | 'dev-ui';
  tab: WorkspaceTab;
  scenario: ScenarioKey | null;
  hospitalCode: string | null;
  hospitalTab?: 'today' | 'requests' | 'stock';
  hospitalRequestId?: string | null;
}

const SCENARIO_KEYS: Record<string, ScenarioKey> = {
  dengue: 'dengue',
  trauma: 'trauma',
  coldchain: 'coldchain',
};

function parseHash(): Route {
  const hashClean = window.location.hash.split('?')[0];
  const raw = hashClean.replace(/^#\/?/, '');
  const [section, tab, param, subParam] = raw.split('/');
  if (section === 'signin' || section === 'login') {
    return { view: 'signin', tab: 'map', scenario: null, hospitalCode: null };
  }
  if (section === 'dev' && tab === 'ui') {
    return { view: 'dev-ui', tab: 'map', scenario: null, hospitalCode: null };
  }
  if (section === 'hospital') {
    const hospCode = (tab || 'AIM').toUpperCase();
    const hospTab = (param === 'requests' || param === 'stock' || param === 'today') ? param : 'today';
    const hospReqId = (hospTab === 'requests' && subParam) ? subParam : null;
    return {
      view: 'hospital',
      tab: 'map',
      scenario: null,
      hospitalCode: hospCode,
      hospitalTab: hospTab,
      hospitalRequestId: hospReqId,
    };
  }
  if (section !== 'workspace') {
    return { view: 'landing', tab: 'map', scenario: null, hospitalCode: null };
  }

  // Session guard: hospital users trying to access workspace are redirected to their Today screen
  const session = getSession();
  if (session.role === 'hospital') {
    const targetCode = session.hospital || 'AIM';
    window.location.hash = `#/hospital/${targetCode}/today`;
    return {
      view: 'hospital',
      tab: 'map',
      scenario: null,
      hospitalCode: targetCode,
      hospitalTab: 'today',
    };
  }

  let resolvedTab: WorkspaceTab = 'map';
  if (tab === 'dashboard' || tab === 'inventory' || tab === 'dispatch' || tab === 'clinical') {
    resolvedTab = 'dashboard';
  } else if (tab === 'surge' || tab === 'stress') {
    resolvedTab = 'surge';
  } else if (tab === 'graph' || tab === 'routes') {
    resolvedTab = 'graph';
  } else if (tab === 'map' || tab === 'tv') {
    resolvedTab = 'map';
  }
  const isScenario = param && SCENARIO_KEYS[param];
  const isHospCode = resolvedTab === 'map' && param && !isScenario;
  return {
    view: 'workspace',
    tab: resolvedTab,
    scenario: isScenario ? SCENARIO_KEYS[param] : null,
    hospitalCode: isHospCode ? param.toUpperCase() : null,
  };
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const routeRef = useRef<Route>(route);
  routeRef.current = route;

  const setRouteMode = useStoryStore((state) => state.setRouteMode);
  const setStoreProgress = useStoryStore((state) => state.setProgress);
  const transitionState = useStoryStore((state) => state.transitionState);
  const setTransitionState = useStoryStore((state) => state.setTransitionState);

  // Check prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * enterWorkspace(immediate?: boolean)
   * LANDING_SPEC v3 Section 9
   * Triggered on transition from landing -> workspace
   */
  const enterWorkspace = useCallback((immediate = false) => {
    const map = (window as any).__map;
    const lenis = (window as any).__lenis;
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';

    if (prefersReducedMotion || immediate) {
      setStoreProgress(1.0);
      setRouteMode('workspace');
      setRoute({ view: 'workspace', tab: 'map', scenario: null, hospitalCode: null });
      setTransitionState('idle');
      return;
    }

    setTransitionState('entering');
    setRoute({ view: 'workspace', tab: 'map', scenario: null, hospitalCode: null });

    requestAnimationFrame(() => {
      executeEnterWorkspace(map, {
        onCompleteEnter: () => {
          setStoreProgress(1.0);
          setRouteMode('workspace');
          setTransitionState('idle');
        },
        onCompleteExit: () => {
          setStoreProgress(1.0);
          setRouteMode('story');
          setRoute({ view: 'landing', tab: 'map', scenario: null, hospitalCode: null });
          setTransitionState('idle');
        },
      });
    });
  }, [prefersReducedMotion, setRouteMode, setStoreProgress, setTransitionState]);

  /**
   * exitToStory()
   * LANDING_SPEC v4 Section 9
   * Exact reverse of enterWorkspace()
   */
  const exitToStory = useCallback(() => {
    const map = (window as any).__map;
    setTransitionState('exiting');

    executeExitToStory(map, {
      onCompleteExit: () => {
        setStoreProgress(1.0);
        setRouteMode('story');
        setRoute({ view: 'landing', tab: 'map', scenario: null, hospitalCode: null });
        setTransitionState('idle');
      },
      onCompleteEnter: () => {
        setStoreProgress(1.0);
        setRouteMode('workspace');
        setTransitionState('idle');
      },
    });
  }, [setRouteMode, setStoreProgress, setTransitionState]);

  // Expose transition functions on window.__story for testing & dev controls
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storyObj = (window as any).__story || {};
      storyObj.enterWorkspace = (immediate = false) => {
        navigate('/workspace/map');
        enterWorkspace(immediate);
      };
      storyObj.exitToStory = () => {
        navigate('/');
        exitToStory();
      };
      storyObj.getMorphTimeline = getMorphTimeline;
      storyObj.isMorphRunning = isMorphRunning;
      storyObj.buildMorphTimeline = buildMorphTimeline;
      storyObj.playWorkspaceReveal = playWorkspaceReveal;
      storyObj.reverseWorkspaceReveal = reverseWorkspaceReveal;
      storyObj.checks = () => runAllStoryChecks();
      (window as any).__story = storyObj;
      (window as any).checks = () => runAllStoryChecks();
      (window as any).useDispatchStore = useDispatchStore;
    }
  }, [enterWorkspace, exitToStory]);

  // Route hashchange listener: central routing orchestrator
  useEffect(() => {
    const onChange = () => {
      const newRoute = parseHash();
      const prev = routeRef.current;
      routeRef.current = newRoute;

      if (prev.view === 'workspace' && newRoute.view === 'landing') {
        // Browser Back button or URL hash change to story
        exitToStory();
      } else if (prev.view === 'landing' && newRoute.view === 'workspace') {
        // Browser Forward button or URL hash change to workspace
        enterWorkspace();
      } else {
        setRoute(newRoute);
        setRouteMode(newRoute.view === 'landing' ? 'story' : 'workspace');
        if (newRoute.view === 'workspace') {
          setStoreProgress(1.0);
        }
      }
    };

    window.addEventListener('hashchange', onChange);

    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/');
    }

    // Initialize initial route mode & progress
    const initRoute = parseHash();
    if (initRoute.view === 'workspace') {
      setRouteMode('workspace');
      setStoreProgress(1.0);
    } else {
      setRouteMode('story');
    }

    return () => window.removeEventListener('hashchange', onChange);
  }, [enterWorkspace, exitToStory, setRouteMode, setStoreProgress]);

  return (
    <div
      className="app-root-shell"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* 1. Persistent MapStage mounted ABOVE the router */}
      <MapStage />

      {/* 2. Story 3D Canvas (code-split, unmounted in workspace & signin) */}
      <Suspense fallback={null}>
        {(route.view === 'landing' || transitionState === 'entering') && (
          <HeroPlateletCanvas />
        )}
      </Suspense>

      {/* 3. Dedicated Sign-In Page (Plexus Node Authentication Console) */}
      {route.view === 'signin' ? (
        <Suspense fallback={null}>
          <SignInPage />
        </Suspense>
      ) : route.view === 'dev-ui' ? (
        <div
          data-testid="dev-ui-root"
          style={{
            position: 'relative',
            zIndex: 30,
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            background: '#FCFBF8',
          }}
        >
          <Suspense fallback={<div style={{ background: '#FCFBF8', minHeight: '100vh' }} />}>
            <LedgerGallery />
          </Suspense>
        </div>
      ) : route.view === 'hospital' ? (
        <div
          data-testid="hospital-portal-root"
          style={{
            position: 'relative',
            zIndex: 25,
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            background: '#FCFBF8',
          }}
        >
          <Suspense fallback={<div style={{ background: '#FCFBF8', minHeight: '100vh' }} />}>
            <HospitalPortalShell
              hospitalCode={route.hospitalCode || 'AIM'}
              initialTab={route.hospitalTab || 'today'}
              initialRequestId={route.hospitalRequestId || null}
            />
          </Suspense>
        </div>
      ) : (
        /* 4. Router-driven active view wrapped for transition controller */
        <div
          className={`app-route-view ws-transition-${transitionState}`}
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            height: '100%',
            pointerEvents:
              route.view === 'workspace' && route.tab === 'map' && transitionState === 'idle'
                ? 'none'
                : 'auto',
          }}
        >
          <Suspense fallback={null}>
            {(route.view === 'workspace' || transitionState === 'entering' || transitionState === 'exiting') && (
              <WorkspaceShell
                initialTab={route.tab}
                initialScenario={route.scenario}
                initialHospitalCode={route.hospitalCode}
                onExit={() => {
                  navigate('/');
                  exitToStory();
                }}
              />
            )}
            {(route.view === 'landing' || transitionState === 'entering' || transitionState === 'exiting') && (
              <LandingPage
                onOpenWorkspace={() => {
                  navigate('/workspace/map');
                  enterWorkspace();
                }}
                onRunDemo={() => {
                  navigate('/workspace/surge/dengue');
                }}
              />
            )}
          </Suspense>
        </div>
      )}

      {/* 4. Dev Tooling & Progress readout: render ONLY with ?dev=1 */}
      {typeof window !== 'undefined' && window.location.search.includes('dev=1') && (
        <>
          {route.view === 'landing' && <PlateletDevControls />}
          <DebugProgressReadout />
        </>
      )}
    </div>
  );
}
