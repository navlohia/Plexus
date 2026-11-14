import { create } from 'zustand';
import type React from 'react';
import type { MapboxOverlay } from '@deck.gl/mapbox';
import { CLINICAL_ATLAS_STYLE } from '../story/clinicalAtlasStyle';

export const CARTO_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
export const CARTO_VOYAGER = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
export const CARTO_POSITRON = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
}

export const INITIAL_MAP_VIEW: MapViewState = {
  longitude: 77.16,
  latitude: 28.585,
  zoom: 10.8,
  pitch: 50,
  bearing: -12,
  transitionDuration: 0,
};

export interface PlateletScreenData {
  x: number;
  y: number;
  radius: number;
}

export interface PlateletDevSettings {
  tiltDeg: number;
  thickness: number;
  roughness: number;
  transmission: number;
  rimIntensity: number;
  rotationSpeed: number;
}

export const DEFAULT_PLATELET_SETTINGS: PlateletDevSettings = {
  tiltDeg: 20,
  thickness: 1.2,
  roughness: 0.25,
  transmission: 0.65,
  rimIntensity: 0.85,
  rotationSpeed: 0.1,
};

export interface StoryStore {
  progress: number;
  routeMode: 'story' | 'workspace';
  reducedMotion: boolean;
  mapCreated: boolean;
  mapStyle: any;
  viewState: MapViewState;
  mapOverlays: React.ReactNode | null;
  deckOverlay: MapboxOverlay | null;
  mapInstance: any | null;
  transitionState: 'idle' | 'entering' | 'exiting';
  selectedHospitalId: string | null;

  // Hero Platelet & Performance state
  plateletScreen: PlateletScreenData | null;
  useLiteMaterial: boolean;
  fps: number;
  devSettings: PlateletDevSettings;
  showVoronoiSeeds: boolean;

  setProgress: (progress: number) => void;
  setRouteMode: (routeMode: 'story' | 'workspace') => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setMapCreated: (mapCreated: boolean) => void;
  setMapStyle: (mapStyle: any) => void;
  setViewState: (viewState: Partial<MapViewState> | ((prev: MapViewState) => MapViewState)) => void;
  setMapOverlays: (overlays: React.ReactNode | null) => void;
  setDeckOverlay: (overlay: MapboxOverlay | null) => void;
  setMapInstance: (map: any | null) => void;
  setTransitionState: (state: 'idle' | 'entering' | 'exiting') => void;
  setSelectedHospitalId: (id: string | null) => void;

  setPlateletScreen: (screen: PlateletScreenData | null) => void;
  setUseLiteMaterial: (lite: boolean) => void;
  setFps: (fps: number) => void;
  setDevSettings: (settings: Partial<PlateletDevSettings>) => void;
  setShowVoronoiSeeds: (show: boolean) => void;
}

export const useStoryStore = create<StoryStore>((set) => ({
  progress: 0,
  routeMode: 'story',
  reducedMotion: false,
  mapCreated: false,
  mapStyle: CLINICAL_ATLAS_STYLE,
  viewState: INITIAL_MAP_VIEW,
  mapOverlays: null,
  deckOverlay: null,
  mapInstance: null,
  transitionState: 'idle',
  selectedHospitalId: null,

  plateletScreen: null,
  useLiteMaterial: false,
  fps: 60,
  devSettings: DEFAULT_PLATELET_SETTINGS,
  showVoronoiSeeds: false,

  setProgress: (progress) =>
    set({ progress: Math.max(0, Math.min(1, Number(progress.toFixed(4)))) }),
  setRouteMode: (routeMode) => set({ routeMode }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setMapCreated: (mapCreated) => set({ mapCreated }),
  setMapStyle: (mapStyle) => set({ mapStyle }),
  setViewState: (updater) =>
    set((state) => ({
      viewState: typeof updater === 'function' ? updater(state.viewState) : { ...state.viewState, ...updater },
    })),
  setMapOverlays: (mapOverlays) => set({ mapOverlays }),
  setDeckOverlay: (deckOverlay) => set({ deckOverlay }),
  setMapInstance: (mapInstance) => set({ mapInstance }),
  setTransitionState: (transitionState) => set({ transitionState }),
  setSelectedHospitalId: (selectedHospitalId) => set({ selectedHospitalId }),

  setPlateletScreen: (plateletScreen) => set({ plateletScreen }),
  setUseLiteMaterial: (useLiteMaterial) => set({ useLiteMaterial }),
  setFps: (fps) => set({ fps }),
  setDevSettings: (settings) =>
    set((state) => ({ devSettings: { ...state.devSettings, ...settings } })),
  setShowVoronoiSeeds: (showVoronoiSeeds) => set({ showVoronoiSeeds }),
}));

if (typeof window !== 'undefined') {
  (window as any).useStoryStore = useStoryStore;
  (window as any).__story = {
    setProgress: (p: number) => {
      const clamped = Math.max(0, Math.min(1, Number(p.toFixed(4))));
      useStoryStore.getState().setProgress(clamped);
      const lenis = (window as any).__lenis;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (lenis && maxScroll > 0) {
        lenis.scrollTo(maxScroll * clamped, { immediate: true });
      }
    },
    store: useStoryStore,
  };
}
