import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { NASA_PLANETS } from './data/nasaPlanets';
import {
  SurfaceMarker,
  GeologicalLayer,
  MissionTelemetryState,
  GravityCalcResult,
  FlightChecklistItem,
  PlanetaryFeatureVisibility,
  AdvisorMessage,
  SessionMissionLogEntry,
} from './types';
import {
  mockBackend,
  DeployedHabitatBase,
  HabitatModuleType,
} from './services/mockBackend';
import { DEFAULT_FLIGHT_CHECKLIST } from './data/missionChecklist';
import { computeMissionViabilityScore } from './utils/physics';
import { ThreeHoloCanvas } from './components/ThreeHoloCanvas';
import { ScanlineOverlay } from './components/ScanlineOverlay';
import { TopNavbar } from './components/TopNavbar';
import { ExplodedCorePanel } from './components/ExplodedCorePanel';
import { TimeMachineSlider } from './components/TimeMachineSlider';
import { EnvironmentalTimeSeriesChart } from './components/EnvironmentalTimeSeriesChart';
import { MissionReadinessChecklist } from './components/MissionReadinessChecklist';
import { GravitySimulator } from './components/GravitySimulator';
import { ArchaeologyBaseLocator } from './components/ArchaeologyBaseLocator';
import { MissionSuccessGauge } from './components/MissionSuccessGauge';
import { FlightDirectorPanel } from './components/FlightDirectorPanel';
import { InfoModal } from './components/InfoModal';
import { NasaVisualGalleryModal } from './components/NasaVisualGalleryModal';
import { NASA_VISUAL_GALLERY } from './data/nasaResearchData';
import { holoAudio } from './utils/audioSynthesizer';
import { Bot, ChevronDown, ChevronUp, ArrowUp, X, Images, ExternalLink } from 'lucide-react';

const FEATURE_LAYER_LABELS: Record<keyof PlanetaryFeatureVisibility, string> = {
  atmosphere: 'Atmospheric Ring & Glow',
  tectonicPlates: 'Tectonic Plates & Faults',
  magneticField: 'Magnetic Field Dipole Lines',
  surfaceMarkers: 'Landing Sites & Beacons',
  orbitalRadar: 'Orbital Grid & Solar Rays',
  coreShells: 'Core Stratigraphy Shells',
  planetaryRings: 'Planetary Torus Rings',
};

export default function App() {
  const initialPersistedRef = useRef(mockBackend.loadState());
  const initialPersisted = initialPersistedRef.current;

  const [currentPlanetId, setCurrentPlanetId] = useState<string>(initialPersisted.selectedPlanetId);
  const [timeSliderValue, setTimeSliderValue] = useState<number>(100);
  const [explodedView, setExplodedView] = useState<boolean>(false);
  const [showAtmosphericRing, setShowAtmosphericRing] = useState<boolean>(true);
  const [selectedMarker, setSelectedMarker] = useState<SurfaceMarker | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<GeologicalLayer | null>(null);

  // 3D Render Mode & Feature Layers State (Persisted)
  const [surfaceRenderMode, setSurfaceRenderMode] = useState<'nasa' | 'wireframe'>(
    initialPersisted.surfaceRenderMode
  );
  const [featureVisibility, setFeatureVisibility] = useState<PlanetaryFeatureVisibility>(
    initialPersisted.featureVisibility
  );

  // Persisted 5x5 Base Grid Selections, Habitat Bases, Commander X Logs & Chat
  const [selectedGridCells, setSelectedGridCells] = useState<Record<string, string>>(
    initialPersisted.selectedGridCells
  );
  const [deployedBases, setDeployedBases] = useState<DeployedHabitatBase[]>(
    initialPersisted.deployedBases
  );
  const [chatMessages, setChatMessages] = useState<AdvisorMessage[]>(initialPersisted.chatMessages);
  const [missionLogs, setMissionLogs] = useState<SessionMissionLogEntry[]>(
    initialPersisted.missionLogs
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(initialPersisted.lastSyncedAt);

  // PNG Snapshot capture ref registered by ThreeHoloCanvas
  const capturePngRef = useRef<(() => void) | null>(null);
  const handleRegisterCapture = useCallback((fn: (() => void) | null) => {
    capturePngRef.current = fn;
  }, []);

  const leftSidebarRef = useRef<HTMLElement>(null);
  const rightSidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (leftSidebarRef.current) leftSidebarRef.current.scrollTop = 0;
    if (rightSidebarRef.current) rightSidebarRef.current.scrollTop = 0;
  }, [currentPlanetId]);

  // Flight Readiness Checklist state
  const [checklistItems, setChecklistItems] = useState<FlightChecklistItem[]>(DEFAULT_FLIGHT_CHECKLIST);

  const handleToggleChecklistItem = (id: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleCheckAllItems = () => {
    setChecklistItems((prev) => prev.map((item) => ({ ...item, checked: true })));
  };

  const handleResetAllItems = () => {
    setChecklistItems((prev) => prev.map((item) => ({ ...item, checked: false })));
  };

  const flightReadinessScore = Math.min(
    100,
    Math.round(
      checklistItems.reduce((acc, item) => (item.checked ? acc + item.weightImpactPercent : acc), 0)
    )
  );

  // Gravity Simulator Inputs (Persisted)
  const [userWeight, setUserWeight] = useState<number>(initialPersisted.userWeight);
  const [jumpHeight, setJumpHeight] = useState<number>(initialPersisted.jumpHeight);
  const [activeMetrics, setActiveMetrics] = useState<GravityCalcResult | null>(null);

  // Persist simulation & planner updates automatically to mockBackend
  useEffect(() => {
    const saved = mockBackend.patchState({
      selectedPlanetId: currentPlanetId,
      userWeight,
      jumpHeight,
      surfaceRenderMode,
      featureVisibility,
      selectedGridCells,
      deployedBases,
      chatMessages,
      missionLogs,
    });
    setLastSyncedAt(saved.lastSyncedAt);
  }, [
    currentPlanetId,
    userWeight,
    jumpHeight,
    surfaceRenderMode,
    featureVisibility,
    selectedGridCells,
    deployedBases,
    chatMessages,
    missionLogs,
  ]);

  // Audio, CRT Overlays, Gallery & Info Modals
  const [crtEnabled, setCrtEnabled] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);

  // Scroll-to-Top Floating Button Visibility (scrollY > 250)
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 250);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Commander X Drawer (desktop bottom bar / mobile-tablet floating modal)
  const [isAdvisorDrawerOpen, setIsAdvisorDrawerOpen] = useState<boolean>(false);

  const currentPlanet = NASA_PLANETS[currentPlanetId] || NASA_PLANETS.mars;

  const activeEra = currentPlanet.eras.reduce((prev, curr) => {
    return Math.abs(curr.sliderValue - timeSliderValue) < Math.abs(prev.sliderValue - timeSliderValue)
      ? curr
      : prev;
  }, currentPlanet.eras[0]);

  const viabilityBreakdown = useMemo(
    () =>
      computeMissionViabilityScore(
        currentPlanet,
        selectedMarker,
        timeSliderValue,
        explodedView,
        flightReadinessScore
      ),
    [currentPlanet, selectedMarker, timeSliderValue, explodedView, flightReadinessScore]
  );

  const activeFeatureLayers = useMemo(() => {
    return (Object.keys(featureVisibility) as (keyof PlanetaryFeatureVisibility)[])
      .filter((key) => {
        if (key === 'planetaryRings' && !currentPlanet.hasPlanetaryRings) return false;
        if (key === 'coreShells') return false;
        return featureVisibility[key] !== false;
      })
      .map((key) => FEATURE_LAYER_LABELS[key]);
  }, [featureVisibility, currentPlanet.hasPlanetaryRings]);

  const uncheckedCriticalSystems = useMemo(
    () => checklistItems.filter((item) => item.requiredForGo && !item.checked).map((i) => i.label),
    [checklistItems]
  );

  const handleSelectPlanet = (planetId: string) => {
    holoAudio.playBlip(720);
    setCurrentPlanetId(planetId);
    setSelectedMarker(null);
    setSelectedLayer(null);
    setTimeSliderValue(100);
    setExplodedView(false);
  };

  const handleToggleExplodedView = () => {
    holoAudio.playExplodeSound();
    setExplodedView((prev) => !prev);
  };

  const handleSelectMarker = (marker: SurfaceMarker | null) => {
    if (marker) holoAudio.playBlip(980);
    setSelectedMarker(marker);
  };

  const handleSelectLayer = (layer: GeologicalLayer | null) => {
    if (layer) holoAudio.playBlip(640);
    setSelectedLayer(layer);
  };

  const handleToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    holoAudio.setEnabled(next);
    if (next) holoAudio.playBlip(880);
  };

  const handleSelectGridCell = (siteId: string, cell: string) => {
    setSelectedGridCells((prev) => ({
      ...prev,
      [`${currentPlanetId}:${siteId}`]: cell,
    }));
  };

  const handleDeployBase = (
    siteId: string,
    cell: string,
    moduleType: HabitatModuleType,
    label: string
  ) => {
    const newBase: DeployedHabitatBase = {
      id: `base-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      planetId: currentPlanetId,
      siteId,
      cell,
      moduleType,
      label,
      deployedAt: new Date().toISOString(),
    };
    setDeployedBases((prev) => [
      ...prev.filter((b) => !(b.planetId === currentPlanetId && b.siteId === siteId && b.cell === cell)),
      newBase,
    ]);
  };

  const handleRemoveBase = (baseId: string) => {
    setDeployedBases((prev) => prev.filter((b) => b.id !== baseId));
  };

  const handleResetMissionData = () => {
    holoAudio.playBlip(520, 0.08);
    const reset = mockBackend.resetState();
    setCurrentPlanetId(reset.selectedPlanetId);
    setSelectedMarker(null);
    setSelectedLayer(null);
    setTimeSliderValue(100);
    setExplodedView(false);
    setUserWeight(reset.userWeight);
    setJumpHeight(reset.jumpHeight);
    setSurfaceRenderMode(reset.surfaceRenderMode);
    setFeatureVisibility(reset.featureVisibility);
    setSelectedGridCells(reset.selectedGridCells);
    setDeployedBases(reset.deployedBases);
    setChatMessages(reset.chatMessages);
    setMissionLogs(reset.missionLogs);
    setChecklistItems(DEFAULT_FLIGHT_CHECKLIST);
    setLastSyncedAt(reset.lastSyncedAt);
  };

  const missionState: MissionTelemetryState = {
    planet: currentPlanet.name,
    planetId: currentPlanet.id,
    era: activeEra.epochName,
    waterCoverage: `${activeEra.waterCoveragePercent}%`,
    explodedView,
    selectedMarker,
    gravity: currentPlanet.gravity,
    userWeight,
    jumpHeight,
    hangTime: activeMetrics?.hangTimePlanetS || 1.15,
    calcJump: activeMetrics?.jumpHeightPlanetM || 1.58,
    missionViabilityScore: viabilityBreakdown.compositeScore,
    flightReadinessScore,
    activeFeatureLayers,
    surfaceRenderMode,
    uncheckedCriticalSystems,
  };

  return (
    <div className="min-h-screen bg-[#050510] text-[#e0f7fc] flex flex-col relative overflow-x-hidden select-none pb-6 lg:pb-14">
      {/* 1. Global CRT Scanline & Radar Overlay */}
      <ScanlineOverlay crtEnabled={crtEnabled} />

      {/* 2. Top Holographic Command Bar */}
      <TopNavbar
        currentPlanetId={currentPlanetId}
        onSelectPlanet={handleSelectPlanet}
        crtEnabled={crtEnabled}
        onToggleCrt={() => setCrtEnabled(!crtEnabled)}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
        onOpenInfo={() => setIsInfoOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onCapturePng={() => capturePngRef.current?.()}
        lastSyncedAt={lastSyncedAt}
        onResetMissionData={handleResetMissionData}
      />

      {/* 3. Main Command Laboratory Dashboard */}
      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-3 p-2.5 sm:p-3 max-w-[1920px] w-full mx-auto relative z-10">
        {/* Left Column: NASA Visual Gallery Quick Card, Cosmic Time Machine, Telemetry Chart & Core Stratigraphy */}
        <section
          ref={leftSidebarRef}
          className="lg:col-span-3 flex flex-col-reverse lg:flex-col gap-3 order-3 lg:order-1 lg:overflow-y-auto lg:h-[calc(100vh-154px)] 2xl:h-[calc(100vh-118px)] pt-2 lg:pt-3 pb-3 scroll-pt-3 pr-1 holo-scrollbar [&>*]:shrink-0"
        >
          {/* Compact NASA 3D Planetary Visual Gallery Launcher Card */}
          <div className="holo-panel rounded-xl p-3 border border-purple-500/40 relative shrink-0 overflow-visible bg-[#060a1e]/90">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Images className="w-4 h-4 text-purple-300 shrink-0" />
                <h3 className="font-orbitron text-xs font-bold text-purple-100 tracking-wider truncate">
                  NASA 3D VISUAL GALLERY
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGalleryOpen(true)}
                className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-purple-600/30 hover:bg-purple-600/45 text-purple-100 border border-purple-400/60 shrink-0 whitespace-nowrap transition-all"
              >
                OPEN GALLERY
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {NASA_VISUAL_GALLERY.assets.map((asset) => (
                <button
                  key={asset.assetId}
                  type="button"
                  onClick={() => setIsGalleryOpen(true)}
                  className="group rounded-lg overflow-hidden border border-cyan-500/30 hover:border-cyan-300 bg-black text-left transition-all"
                  title={`${asset.previewImage.title} — Click to view NASA imagery & official 3D model links`}
                >
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={asset.previewImage.url}
                      alt={asset.previewImage.altText}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="px-1.5 py-1 bg-[#04091a] flex items-center justify-between text-[10px] font-mono text-cyan-200">
                    <span className="truncate font-bold">{asset.name.toUpperCase()}</span>
                    <ExternalLink className="w-2.5 h-2.5 text-purple-300 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <TimeMachineSlider
            planet={currentPlanet}
            timeSliderValue={timeSliderValue}
            onChangeTimeSlider={(val) => setTimeSliderValue(val)}
          />

          <EnvironmentalTimeSeriesChart
            planet={currentPlanet}
            timeSliderValue={timeSliderValue}
            selectedMarker={selectedMarker}
            onChangeTimeSlider={(val) => setTimeSliderValue(val)}
          />

          <ExplodedCorePanel
            planet={currentPlanet}
            explodedView={explodedView}
            onToggleExplodedView={handleToggleExplodedView}
            selectedLayer={selectedLayer}
            onSelectLayer={handleSelectLayer}
          />
        </section>

        {/* Center Column: 3D Holographic WebGL Scene (Responsive unobstructed framing across mobile/tablet/laptop/desktop) */}
        <section className="lg:col-span-5 xl:col-span-6 flex flex-col gap-2 order-1 lg:order-2">
          <div className="h-[56vh] min-h-[380px] sm:h-[60vh] lg:h-[calc(100vh-154px)] 2xl:h-[calc(100vh-118px)] w-full relative rounded-xl overflow-hidden border border-cyan-500/35 bg-[#040612]/90 shadow-[0_0_30px_rgba(0,240,255,0.12)]">
            <ThreeHoloCanvas
              planet={currentPlanet}
              timeSliderValue={timeSliderValue}
              explodedView={explodedView}
              onToggleExplodedView={handleToggleExplodedView}
              selectedMarker={selectedMarker}
              onSelectMarker={handleSelectMarker}
              selectedLayer={selectedLayer}
              onSelectLayer={handleSelectLayer}
              showAtmosphericRing={showAtmosphericRing}
              onToggleAtmosphericRing={() => setShowAtmosphericRing((prev) => !prev)}
              featureVisibility={featureVisibility}
              onChangeFeatureVisibility={setFeatureVisibility}
              surfaceRenderMode={surfaceRenderMode}
              onChangeSurfaceRenderMode={setSurfaceRenderMode}
              onRegisterCapture={handleRegisterCapture}
            />
          </div>
        </section>

        {/* Right Column: Gravity, Site Locator, Mission Suitability & Checklist */}
        <section
          ref={rightSidebarRef}
          className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3 order-2 lg:order-3 lg:overflow-y-auto lg:h-[calc(100vh-154px)] 2xl:h-[calc(100vh-118px)] pt-3 pb-3 scroll-pt-3 pr-1 holo-scrollbar [&>*]:shrink-0"
        >
          <div className="order-3 lg:order-1">
            <MissionSuccessGauge
              planet={currentPlanet}
              selectedMarker={selectedMarker}
              timeSliderValue={timeSliderValue}
              explodedView={explodedView}
              flightReadinessScore={flightReadinessScore}
              onSelectMarker={handleSelectMarker}
            />
          </div>

          <div className="order-4 lg:order-2">
            <MissionReadinessChecklist
              items={checklistItems}
              onToggleItem={handleToggleChecklistItem}
              onCheckAll={handleCheckAllItems}
              onResetAll={handleResetAllItems}
              readinessScore={flightReadinessScore}
              planetName={currentPlanet.name}
            />
          </div>

          <div className="order-1 lg:order-3">
            <GravitySimulator
              planet={currentPlanet}
              userWeight={userWeight}
              setUserWeight={setUserWeight}
              jumpHeight={jumpHeight}
              setJumpHeight={setJumpHeight}
              onUpdateMetrics={setActiveMetrics}
            />
          </div>

          <div className="order-2 lg:order-4">
            <ArchaeologyBaseLocator
              planet={currentPlanet}
              selectedMarker={selectedMarker}
              onSelectMarker={handleSelectMarker}
              deployedBases={deployedBases}
              selectedGridCells={selectedGridCells}
              onSelectGridCell={handleSelectGridCell}
              onDeployBase={handleDeployBase}
              onRemoveBase={handleRemoveBase}
            />
          </div>
        </section>
      </main>

      {/* Static Non-Fixed Document Footer */}
      <footer className="static mt-2 border-t border-cyan-500/20 px-4 py-2.5 text-[10px] font-mono text-cyan-300/60 flex flex-wrap items-center justify-between gap-2 max-w-[1920px] w-full mx-auto">
        <span>TEAM ORBIT-X // NASA SPACE APPS CHALLENGE</span>
        <span>VERIFIED NASA PLANETARY TELEMETRY TERMINAL</span>
      </footer>

      {/* Desktop Only: Clickable Bottom Drawer for Commander X Flight Director */}
      <div
        className={`hidden lg:block fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-out ${
          isAdvisorDrawerOpen ? 'translate-y-0' : 'translate-y-[calc(100%-44px)]'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4">
          {/* Clickable Drawer Bar */}
          <button
            type="button"
            onClick={() => {
              holoAudio.playBlip(isAdvisorDrawerOpen ? 620 : 940, 0.06);
              setIsAdvisorDrawerOpen((prev) => !prev);
            }}
            aria-expanded={isAdvisorDrawerOpen}
            className="w-full h-[44px] holo-panel rounded-t-xl px-4 border-t border-x border-cyan-400/60 cursor-pointer flex items-center justify-between gap-2 shadow-[0_-6px_25px_rgba(0,240,255,0.22)] bg-[#071329]/95 hover:bg-[#091b3a]/95 transition-colors text-left"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <Bot className="w-4 h-4 text-cyan-300 shrink-0" />
              <span className="font-orbitron text-xs font-bold text-cyan-100 tracking-wider truncate">
                COMMANDER X // FLIGHT DIRECTOR
              </span>
              <span className="text-[11px] font-mono text-cyan-300 shrink-0">
                [{currentPlanet.name.toUpperCase()} • {viabilityBreakdown.compositeScore}/100]
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-600/50 shrink-0 whitespace-nowrap">
                {isAdvisorDrawerOpen ? 'MINIMIZE' : 'EXPAND'}
              </span>
              {isAdvisorDrawerOpen ? (
                <ChevronDown className="w-4 h-4 text-cyan-300 shrink-0" />
              ) : (
                <ChevronUp className="w-4 h-4 text-cyan-300 shrink-0" />
              )}
            </div>
          </button>

          {/* Translucent Sci-Fi Chat Panel */}
          <div className="h-[400px] border-x border-cyan-400/55 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] overflow-hidden">
            <FlightDirectorPanel
              missionState={missionState}
              persistedMessages={chatMessages}
              onChangeMessages={setChatMessages}
              persistedLogs={missionLogs}
              onChangeLogs={setMissionLogs}
            />
          </div>
        </div>
      </div>

      {/* Floating "Back to Top" Button when scrolled down (scrollY > 250) */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => {
            holoAudio.playBlip(760, 0.05);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          aria-label="Scroll back to top 3D planet view"
          title="Back to Top 3D View"
          className="fixed bottom-20 right-4 z-40 lg:bottom-16 w-11 h-11 rounded-full holo-panel border border-cyan-400/70 bg-[#050d22]/90 backdrop-blur-md text-cyan-200 hover:text-white hover:border-cyan-300 shadow-[0_0_18px_rgba(0,240,255,0.35)] flex items-center justify-center transition-all"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* Mobile & Tablet (< 1024px): Floating Circular AI Chat Action Button (Commander X) */}
      <button
        type="button"
        onClick={() => {
          holoAudio.playBlip(960, 0.06);
          setIsAdvisorDrawerOpen(true);
        }}
        aria-label="Open Commander X Flight Director"
        title="Commander X // Flight Director"
        className="lg:hidden fixed bottom-5 right-4 z-50 w-13 h-13 rounded-full bg-[#06142e]/95 border-2 border-cyan-400 text-cyan-200 shadow-[0_0_24px_rgba(0,240,255,0.5)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <span className="absolute inset-0 rounded-full border border-cyan-400/60 animate-ping pointer-events-none" />
        <Bot className="w-6 h-6 text-cyan-300 relative z-10" />
      </button>

      {/* Mobile & Tablet (< 1024px): Responsive Commander X Modal Drawer */}
      {isAdvisorDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Commander X Flight Director"
        >
          <div className="holo-panel w-full max-w-lg h-[82vh] max-h-[640px] rounded-2xl border border-cyan-400/70 shadow-[0_0_40px_rgba(0,240,255,0.3)] flex flex-col overflow-hidden bg-[#040a1c]/95">
            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-cyan-500/35 bg-[#071329]/95 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Bot className="w-4 h-4 text-cyan-300 shrink-0" />
                <span className="font-orbitron text-xs font-bold text-cyan-100 tracking-wider truncate">
                  COMMANDER X // FLIGHT DIRECTOR
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  holoAudio.playBlip(620, 0.05);
                  setIsAdvisorDrawerOpen(false);
                }}
                aria-label="Close Commander X Advisor"
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/70 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <FlightDirectorPanel
                missionState={missionState}
                persistedMessages={chatMessages}
                onChangeMessages={setChatMessages}
                persistedLogs={missionLogs}
                onChangeLogs={setMissionLogs}
              />
            </div>
          </div>
        </div>
      )}

      {/* NASA 3D Planetary Visual Gallery Modal */}
      <NasaVisualGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        currentPlanetId={currentPlanetId}
        onSelectPlanet={handleSelectPlanet}
      />

      {/* Info & Architectural Dossier Modal */}
      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </div>
  );
}
