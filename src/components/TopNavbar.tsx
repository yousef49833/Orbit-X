import React from 'react';
import { NASA_PLANETS } from '../data/nasaPlanets';
import { Volume2, VolumeX, Tv, Info, Radio, Camera, Images, RotateCcw, Database } from 'lucide-react';
import { TechTooltip } from './TechTooltip';

interface TopNavbarProps {
  currentPlanetId: string;
  onSelectPlanet: (planetId: string) => void;
  crtEnabled: boolean;
  onToggleCrt: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenInfo: () => void;
  onOpenGallery?: () => void;
  onCapturePng?: () => void;
  lastSyncedAt?: string;
  onResetMissionData?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentPlanetId,
  onSelectPlanet,
  crtEnabled,
  onToggleCrt,
  audioEnabled,
  onToggleAudio,
  onOpenInfo,
  onOpenGallery,
  onCapturePng,
  lastSyncedAt,
  onResetMissionData,
}) => {
  return (
    <header className="holo-panel sticky top-0 z-30 backdrop-blur-md bg-[#050816]/92 border-b border-cyan-500/30 px-2.5 sm:px-4 py-2 flex flex-wrap 2xl:flex-nowrap items-center justify-between gap-2 sm:gap-2.5">
      <div className="reticle-bracket-tl" />
      <div className="reticle-bracket-tr" />
      <div className="reticle-bracket-bl" />
      <div className="reticle-bracket-br" />

      {/* Zone 1: Brand & Team Orbit-X Header */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-[#030714] border border-cyan-400/70 shadow-[0_0_16px_rgba(0,240,255,0.4)] shrink-0">
          <img
            src="/assets/orbitx/orbitx_emblem.jpeg"
            alt="Orbit-X Official Emblem"
            className="w-full h-full object-cover scale-110"
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="font-orbitron font-extrabold text-sm sm:text-base text-cyan-200 tracking-wider text-glow-cyan whitespace-nowrap">
              ORBIT-X
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-200 text-[9px] sm:text-[10px] font-mono border border-cyan-500/40 whitespace-nowrap">
              MISSION LAB
            </span>
          </div>
          <div className="hidden md:block text-[10px] xl:text-[11px] font-mono text-cyan-300/80 tracking-tight truncate">
            NASA SPACE APPS // HOLOGRAPHIC MISSION SIMULATION
          </div>
        </div>
      </div>

      {/* Zone 2: Target Celestial Body Switcher (Always crisp single horizontal rail; centered on wide 2xl desktops) */}
      <nav
        aria-label="Target celestial body selector"
        className="order-3 2xl:order-2 flex items-center flex-nowrap overflow-x-auto no-scrollbar gap-1 sm:gap-1.5 bg-[#030612]/90 p-1 rounded-lg border border-cyan-500/30 w-full 2xl:w-auto 2xl:flex-1 2xl:min-w-0 2xl:max-w-max"
      >
        <span className="text-[10px] sm:text-[11px] font-mono text-slate-300 px-1.5 sm:px-2 flex items-center gap-1 shrink-0 whitespace-nowrap">
          <Radio className="w-3 h-3 text-cyan-400" />
          <span>TARGET:</span>
        </span>

        {Object.values(NASA_PLANETS).map((planet) => {
          const isSelected = currentPlanetId === planet.id;

          return (
            <TechTooltip
              key={planet.id}
              title={`${planet.name.toUpperCase()} (${planet.category})`}
              category="ORBITAL MECHANICS"
              definition={`Surface gravity: ${planet.gravity} m/s², Radius: ${planet.radiusKm.toLocaleString()} km, Atmosphere: ${planet.atmosphericDensityLabel}. Click to align 3D holographic projection.`}
              position="bottom"
            >
              <button
                type="button"
                onClick={() => onSelectPlanet(planet.id)}
                className={`px-2 sm:px-2.5 py-1 rounded text-[11px] font-orbitron transition-all tracking-wider shrink-0 whitespace-nowrap ${
                  isSelected
                    ? 'bg-cyan-500/30 text-cyan-100 border border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)] font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                {planet.name.toUpperCase()}
              </button>
            </TechTooltip>
          );
        })}
      </nav>

      {/* Zone 3: Secondary Quick Utilities */}
      <div className="order-2 2xl:order-3 flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Local Persistence Status Badge */}
        <TechTooltip
          title="Mission Persistence Active"
          category="TELEMETRY STORAGE"
          definition={`Mission telemetry, deployed habitat grid modules, and Commander X logs automatically persist to localStorage${
            lastSyncedAt ? ` (Last sync: ${new Date(lastSyncedAt).toLocaleTimeString()})` : ''
          }.`}
          position="bottom"
        >
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-lg border border-emerald-500/40 bg-emerald-950/50 text-[10px] font-mono text-emerald-200 shrink-0 whitespace-nowrap">
            <Database className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>SYNCED</span>
          </div>
        </TechTooltip>

        {/* NASA 3D Planetary Visual Gallery Button */}
        {onOpenGallery && (
          <TechTooltip
            title="NASA 3D Planetary Visual Gallery"
            category="NASA ASSETS"
            definition="Browse official NASA preview visualizations for Earth, Mars, and Europa alongside downloadable glTF/USDZ 3D model links and NASA Eyes 3D."
            position="bottom"
          >
            <button
              type="button"
              onClick={onOpenGallery}
              className="px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-mono flex items-center gap-1.5 border border-purple-400/60 bg-purple-950/60 text-purple-100 hover:border-purple-300 hover:bg-purple-900/60 transition-all shrink-0 whitespace-nowrap"
              title="Open NASA 3D Planetary Visual Gallery"
            >
              <Images className="w-3.5 h-3.5 text-purple-300 shrink-0" />
              <span className="hidden sm:inline">GALLERY</span>
            </button>
          </TechTooltip>
        )}

        {/* High-Quality PNG Snapshot Button */}
        {onCapturePng && (
          <TechTooltip
            title="Mission Documentation Capture"
            category="OPTICS"
            definition="Exports the live 3D WebGL planetary render with holographic scanline framing and orbital telemetry watermark as a high-resolution PNG."
            position="bottom"
          >
            <button
              type="button"
              onClick={onCapturePng}
              className="px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-mono flex items-center gap-1.5 border border-emerald-500/50 bg-emerald-950/60 text-emerald-200 hover:border-emerald-300 hover:bg-emerald-900/60 transition-all shrink-0 whitespace-nowrap"
              title="Download 3D Holographic Render as PNG"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="hidden md:inline">CAPTURE</span>
            </button>
          </TechTooltip>
        )}

        {/* CRT Scanline Toggle */}
        <TechTooltip term="crt-scan" position="bottom">
          <button
            type="button"
            onClick={onToggleCrt}
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-mono flex items-center gap-1.5 border transition-all shrink-0 whitespace-nowrap ${
              crtEnabled
                ? 'bg-cyan-950/70 text-cyan-200 border-cyan-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="Toggle CRT Scanlines"
          >
            <Tv className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline">CRT</span>
          </button>
        </TechTooltip>

        {/* Audio Telemetry Toggle */}
        <TechTooltip
          title="Avionics Sound Synthesis"
          category="AVIONICS"
          definition="Dynamic Web Audio API harmonic oscillators simulating spacecraft reactor hums, radar pings, and mission telemetry soundscapes."
          position="bottom"
        >
          <button
            type="button"
            onClick={onToggleAudio}
            className={`p-1.5 rounded-lg border transition-all shrink-0 ${
              audioEnabled
                ? 'bg-cyan-950/70 text-cyan-200 border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title={audioEnabled ? 'Mute Interface Soundscapes' : 'Enable Sci-Fi Audio Telemetry'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-cyan-300" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </TechTooltip>

        {/* Reset Saved Mission Telemetry Data */}
        {onResetMissionData && (
          <TechTooltip
            title="Reset Mission Data"
            category="STORAGE"
            definition="Clear persisted localStorage mission bases, gravity presets, and Commander X logs back to factory NASA defaults."
            position="bottom"
          >
            <button
              type="button"
              onClick={onResetMissionData}
              className="px-2 py-1.5 rounded-lg border border-rose-500/45 bg-rose-950/45 text-rose-200 hover:border-rose-400 hover:bg-rose-900/55 transition-all flex items-center gap-1 text-[10px] font-mono shrink-0 whitespace-nowrap"
              title="Reset Mission Data"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-300 shrink-0" />
              <span className="hidden xl:inline">RESET</span>
            </button>
          </TechTooltip>
        )}

        {/* NASA Challenge Briefing Info Modal */}
        <TechTooltip
          title="Mission Architecture"
          category="NASA"
          definition="Interactive documentation detailing planetary crust models, WebXR 1:1 scaling, and space biology criteria."
          position="bottom"
        >
          <button
            type="button"
            onClick={onOpenInfo}
            className="holo-panel p-1.5 rounded-lg border border-cyan-500/40 text-cyan-200 hover:border-cyan-300 hover:text-white transition-all shrink-0"
            title="Project & Mission Architecture Briefing"
          >
            <Info className="w-4 h-4" />
          </button>
        </TechTooltip>
      </div>
    </header>
  );
};
