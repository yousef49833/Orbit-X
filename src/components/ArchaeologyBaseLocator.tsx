import React, { useState } from 'react';
import { PlanetData, SurfaceMarker } from '../types';
import {
  SITE_SUITABILITY_SCREENING,
  BASE_GRID_SPECIFICATION,
  MARS_PREVIEW_ASSET,
} from '../data/nasaResearchData';
import { DeployedHabitatBase, HabitatModuleType } from '../services/mockBackend';
import { holoAudio } from '../utils/audioSynthesizer';
import {
  MapPin,
  Shield,
  Radio,
  Navigation,
  X,
  Globe,
  AlertTriangle,
  Grid,
  Info,
  ExternalLink,
  Plus,
  Trash2,
  Building2,
} from 'lucide-react';

interface ArchaeologyBaseLocatorProps {
  planet: PlanetData;
  selectedMarker: SurfaceMarker | null;
  onSelectMarker: (marker: SurfaceMarker | null) => void;
  deployedBases?: DeployedHabitatBase[];
  selectedGridCells?: Record<string, string>;
  onSelectGridCell?: (siteId: string, cell: string) => void;
  onDeployBase?: (
    siteId: string,
    cell: string,
    moduleType: HabitatModuleType,
    label: string
  ) => void;
  onRemoveBase?: (baseId: string) => void;
}

const GRID_COLS = ['A', 'B', 'C', 'D', 'E'];
const GRID_ROWS = [1, 2, 3, 4, 5];

const MODULE_META: Record<
  HabitatModuleType,
  { short: string; label: string; colorClass: string }
> = {
  HAB_DOME: {
    short: 'HAB',
    label: 'Pressurized Hab Dome',
    colorClass: 'bg-emerald-500/30 text-emerald-100 border-emerald-400',
  },
  SOLAR_ARRAY: {
    short: 'SOL',
    label: 'Solar Power Array',
    colorClass: 'bg-amber-500/30 text-amber-100 border-amber-400',
  },
  ISRU_O2: {
    short: 'O₂',
    label: 'ISRU Propellant / O₂',
    colorClass: 'bg-cyan-500/30 text-cyan-100 border-cyan-400',
  },
  SHIELD_BUNKER: {
    short: 'RAD',
    label: 'Regolith Rad Vault',
    colorClass: 'bg-purple-500/30 text-purple-100 border-purple-400',
  },
};

export const ArchaeologyBaseLocator: React.FC<ArchaeologyBaseLocatorProps> = ({
  planet,
  selectedMarker,
  onSelectMarker,
  deployedBases = [],
  selectedGridCells = {},
  onSelectGridCell,
  onDeployBase,
  onRemoveBase,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'historical' | 'habitat'>('all');
  const [selectedModuleType, setSelectedModuleType] = useState<HabitatModuleType>('HAB_DOME');
  const isEarth = planet.id === 'earth';
  const isOrbitalProbeOnly =
    planet.missionStatusMode === 'orbital_probe_only' || Boolean(planet.excludeFromHumanLanding);

  const markers = planet.surfaceMarkers.filter((m) => {
    if (filterType === 'historical') {
      return isEarth ? m.type === 'observatory' : m.type === 'rover' || m.type === 'lander';
    }
    if (filterType === 'habitat') {
      return m.type === 'habitat_candidate';
    }
    return true;
  });

  const planetBases = deployedBases.filter((b) => b.planetId === planet.id);
  const selectedSiteKey = selectedMarker ? `${planet.id}:${selectedMarker.id}` : '';
  const activeCell = (selectedSiteKey && selectedGridCells[selectedSiteKey]) || 'C3';
  const siteBases = selectedMarker
    ? planetBases.filter((b) => b.siteId === selectedMarker.id)
    : [];

  return (
    <div className="holo-panel rounded-xl p-4 border border-cyan-500/35 relative">
      <div className="reticle-bracket-tl" />
      <div className="reticle-bracket-tr" />
      <div className="reticle-bracket-bl" />
      <div className="reticle-bracket-br" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/25 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          {isEarth ? (
            <Globe className="w-4 h-4 text-emerald-300 shrink-0" />
          ) : (
            <MapPin className="w-4 h-4 text-cyan-300 shrink-0" />
          )}
          <h3 className="font-orbitron text-[13px] font-bold text-cyan-100 tracking-wider uppercase">
            {isEarth
              ? 'EARTH LAUNCH & OBSERVATION LOCATOR'
              : planet.id === 'europa'
              ? 'EUROPA SCIENTIFIC COMPARISON STATUS'
              : isOrbitalProbeOnly
              ? 'ORBITAL / PROBE MISSION LOCATOR'
              : 'LANDING SITE LOCATOR & SUITABILITY'}
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {!isEarth && !isOrbitalProbeOnly && planetBases.length > 0 && (
            <span className="text-[10px] font-mono text-emerald-200 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/45 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-emerald-300" />
              BASES: {planetBases.length}
            </span>
          )}
          <div
            className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
              isOrbitalProbeOnly
                ? 'text-amber-200 bg-amber-950/70 border-amber-500/50'
                : 'text-cyan-200 bg-cyan-950/70 border-cyan-700/50'
            }`}
          >
            {isOrbitalProbeOnly ? 'ORBITAL / PROBE ONLY' : `SITES: ${planet.surfaceMarkers.length}`}
          </div>
        </div>
      </div>

      {/* Orbital / Probe Only Mission Banner */}
      {isOrbitalProbeOnly && (
        <div className="mb-3 p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-xs space-y-2">
          <div className="flex items-center gap-2 font-orbitron font-bold text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              {planet.id === 'europa'
                ? 'ORBITAL / PROBE ONLY — EXCLUDED FROM HUMAN LANDINGS'
                : 'ORBITAL / PROBE MISSION ONLY (NO HUMAN SURFACE BASE)'}
            </span>
          </div>
          <p className="text-[12.5px] text-rose-100/95 leading-relaxed">
            {planet.landingExclusionNote}
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1">
            <div className="bg-slate-900/90 p-2 rounded border border-rose-500/30">
              <div className="text-slate-300 text-[10px]">SURFACE PRESSURE</div>
              <div className="text-rose-200 font-bold truncate" title={planet.surfacePressure}>
                {planet.surfacePressure}
              </div>
            </div>
            <div className="bg-slate-900/90 p-2 rounded border border-cyan-500/30">
              <div className="text-slate-300 text-[10px]">THERMAL RANGE</div>
              <div className="text-cyan-200 font-bold truncate" title={planet.tempRangeC}>
                {planet.tempRangeC}
              </div>
            </div>
          </div>
        </div>
      )}

      {(!isOrbitalProbeOnly || planet.surfaceMarkers.length > 0) && (
        <>
          {/* Mars Official NASA Preview Thumbnail Banner */}
          {planet.id === 'mars' && (
            <div className="mb-3 p-2 rounded-lg bg-[#030818]/90 border border-cyan-500/30 flex items-center gap-2.5">
              <img
                src={MARS_PREVIEW_ASSET.previewImage.url}
                alt={MARS_PREVIEW_ASSET.previewImage.altText}
                loading="lazy"
                className="w-16 h-12 rounded object-cover border border-cyan-400/50 shrink-0 bg-black"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono text-cyan-300 font-bold truncate">
                  NASA Visualization / Spacecraft Imagery
                </div>
                <div className="text-[11px] text-slate-200 font-semibold truncate">
                  {MARS_PREVIEW_ASSET.previewImage.title}
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                  <span className="truncate">NASA GSFC SVS (Viking / MOLA)</span>
                  <a
                    href={MARS_PREVIEW_ASSET.nasa3dModel.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-300 hover:text-white flex items-center gap-0.5 shrink-0"
                  >
                    <span>3D Model</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Earth Real-Time Baseline Telemetry Strip */}
          {isEarth && (
            <div className="grid grid-cols-3 gap-1.5 mb-3 text-[11px] font-mono">
              <div className="bg-emerald-950/40 border border-emerald-500/35 rounded p-2">
                <div className="text-slate-300 text-[10px]">SEA LEVEL ATMO</div>
                <div className="text-emerald-200 font-bold">101.3 kPa</div>
              </div>
              <div className="bg-cyan-950/40 border border-cyan-500/35 rounded p-2">
                <div className="text-slate-300 text-[10px]">MAGNETOSPHERE</div>
                <div className="text-cyan-200 font-bold">Kp-2 NOMINAL</div>
              </div>
              <div className="bg-purple-950/40 border border-purple-500/35 rounded p-2">
                <div className="text-slate-300 text-[10px]">ESCAPE Δv</div>
                <div className="text-purple-200 font-bold">11.19 km/s</div>
              </div>
            </div>
          )}

          {/* Category Filter Pills (Only shown for Earth & human surface candidates) */}
          {!isOrbitalProbeOnly && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all border ${
                  filterType === 'all'
                    ? 'bg-cyan-500/25 text-cyan-100 border-cyan-400 font-semibold shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                    : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white'
                }`}
              >
                ALL SITES
              </button>
              <button
                onClick={() => setFilterType('historical')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all border ${
                  filterType === 'historical'
                    ? 'bg-cyan-500/25 text-cyan-100 border-cyan-400 font-semibold shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                    : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white'
                }`}
              >
                {isEarth ? 'OBSERVATORIES & DSN' : 'CONFIRMED LANDINGS'}
              </button>
              <button
                onClick={() => setFilterType('habitat')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all border ${
                  filterType === 'habitat'
                    ? 'bg-emerald-500/25 text-emerald-100 border-emerald-400 font-semibold shadow-[0_0_10px_rgba(0,255,136,0.2)]'
                    : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white'
                }`}
              >
                {isEarth ? 'LAUNCH & OPS CENTERS' : 'CANDIDATE REGIONS'}
              </button>
            </div>
          )}

          {/* List of Sites */}
          <div className="space-y-2 max-h-[255px] overflow-y-auto pr-1 holo-scrollbar">
            {markers.map((marker) => {
              const isSelected = selectedMarker?.id === marker.id;
              const isHabitat = marker.type === 'habitat_candidate';
              const isObs = marker.type === 'observatory';
              const siteDeployedCount = planetBases.filter((b) => b.siteId === marker.id).length;

              return (
                <div
                  key={marker.id}
                  onClick={() => onSelectMarker(isSelected ? null : marker)}
                  className={`p-2.5 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? isHabitat
                        ? 'border-emerald-400 bg-emerald-950/65 shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                        : 'border-cyan-400 bg-cyan-950/65 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                      : 'border-slate-700/80 bg-[#071126]/75 hover:border-cyan-500/50 hover:bg-[#071126]/95'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isHabitat ? 'bg-emerald-400' : isObs ? 'bg-purple-400' : 'bg-cyan-400'
                        }`}
                      />
                      <span className="font-orbitron text-[13px] font-semibold text-white tracking-wide truncate">
                        {marker.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {siteDeployedCount > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-200 border border-emerald-500/50">
                          {siteDeployedCount} MOD
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          isHabitat
                            ? 'bg-emerald-950/85 text-emerald-200 border-emerald-600/60'
                            : isObs
                            ? 'bg-purple-950/85 text-purple-200 border-purple-600/60'
                            : 'bg-cyan-950/85 text-cyan-200 border-cyan-600/60'
                        }`}
                      >
                        {isEarth
                          ? isHabitat
                            ? 'LAUNCH / OPS'
                            : 'OBSERVATORY'
                          : isHabitat
                          ? 'CANDIDATE'
                          : marker.landingDateUtc || 'CONFIRMED SITE'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono text-slate-300">
                    <span>
                      LAT: {marker.lat > 0 ? `+${marker.lat}°` : `${marker.lat}°`}, LON:{' '}
                      {marker.lon > 0 ? `+${marker.lon}°` : `${marker.lon}°`}
                    </span>
                    <span className="text-cyan-200 font-bold">
                      {isEarth ? 'READINESS' : 'SUITABILITY INDEX'}: {marker.safetyScore}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expanding Holographic Telemetry Popup */}
          {selectedMarker && (
            <div className="mt-3 p-3.5 rounded-lg bg-[#050b1f]/95 border border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.25)] relative animate-in fade-in zoom-in-95 duration-200 space-y-2.5">
              <button
                onClick={() => onSelectMarker(null)}
                className="absolute top-2.5 right-2.5 p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 pr-6">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
                <div>
                  <div className="font-orbitron text-[13px] font-bold text-cyan-100">
                    {selectedMarker.name.toUpperCase()}
                  </div>
                  <div className="text-[11px] font-mono text-cyan-300">
                    {selectedMarker.status}
                    {selectedMarker.landingDateUtc ? ` • UTC: ${selectedMarker.landingDateUtc}` : ''}
                  </div>
                </div>
              </div>

              <p className="text-[13px] text-slate-200 leading-relaxed">
                {selectedMarker.description}
              </p>

              {selectedMarker.scientificCorrection && (
                <div className="p-2 rounded bg-amber-950/50 border border-amber-500/45 text-[11px] text-amber-100 leading-snug">
                  <strong className="text-amber-300 font-mono">SCIENTIFIC NOTE: </strong>
                  {selectedMarker.scientificCorrection}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-slate-900/90 p-2 rounded border border-cyan-500/25">
                  <div className="text-slate-300 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    <span>RADIATION</span>
                  </div>
                  <div className="text-cyan-200 font-bold mt-0.5">
                    {selectedMarker.radiationLevel}
                  </div>
                </div>

                <div className="bg-slate-900/90 p-2 rounded border border-amber-500/25">
                  <div className="text-slate-300 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-amber-400" />
                    <span>TERRAIN</span>
                  </div>
                  <div className="text-amber-200 font-bold mt-0.5">
                    {selectedMarker.terrainRoughness}
                  </div>
                </div>
              </div>

              {/* Interactive 5x5 Habitat Base Planning Grid (A1-E5 — strictly for Moon & Mars human surface candidates) */}
              {!isEarth && !isOrbitalProbeOnly && (
                <div className="bg-slate-900/90 p-2.5 rounded border border-purple-500/40 text-[11px] font-mono space-y-2">
                  <div className="flex items-center justify-between text-purple-200 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Grid className="w-3.5 h-3.5 text-purple-400" />
                      5×5 BASE GRID ({BASE_GRID_SPECIFICATION.cellLabels})
                    </span>
                    <span className="text-cyan-200">
                      SECTOR {activeCell} • {selectedMarker.safetyScore}%
                    </span>
                  </div>

                  {selectedMarker.hazardRatings && (
                    <div className="text-[10px] text-slate-300">
                      1–5 Hazard Ratings — Radiation: {selectedMarker.hazardRatings.radiation}/5 | Thermal:{' '}
                      {selectedMarker.hazardRatings.thermal}/5 | Terrain: {selectedMarker.hazardRatings.terrain}/5 (Risk{' '}
                      {selectedMarker.riskScore})
                    </div>
                  )}

                  {/* Interactive 5x5 Cell Matrix */}
                  <div className="grid grid-cols-5 gap-1 pt-0.5">
                    {GRID_ROWS.map((row) =>
                      GRID_COLS.map((col) => {
                        const cellId = `${col}${row}`;
                        const baseInCell = siteBases.find((b) => b.cell === cellId);
                        const isCellSelected = activeCell === cellId;
                        const modMeta = baseInCell ? MODULE_META[baseInCell.moduleType] : null;

                        return (
                          <button
                            key={cellId}
                            type="button"
                            onClick={() => {
                              holoAudio.playBlip(840, 0.04);
                              onSelectGridCell?.(selectedMarker.id, cellId);
                            }}
                            className={`h-8 rounded border text-[10px] flex flex-col items-center justify-center leading-none transition-all ${
                              baseInCell && modMeta
                                ? `${modMeta.colorClass} ${
                                    isCellSelected ? 'ring-1 ring-white shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''
                                  }`
                                : isCellSelected
                                ? 'bg-cyan-500/25 border-cyan-300 text-cyan-100 font-bold shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                                : 'bg-[#04091a] border-slate-700/80 text-slate-400 hover:border-cyan-500/60 hover:text-slate-200'
                            }`}
                            title={
                              baseInCell
                                ? `Sector ${cellId}: ${baseInCell.label}`
                                : `Select Sector ${cellId} (1 km planning cell)`
                            }
                          >
                            <span className="font-bold">{cellId}</span>
                            {modMeta && <span className="text-[8px] mt-0.5">{modMeta.short}</span>}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Module Type Selector & Deploy Trigger */}
                  {onDeployBase && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-700/70">
                      <select
                        value={selectedModuleType}
                        onChange={(e) => setSelectedModuleType(e.target.value as HabitatModuleType)}
                        className="flex-1 min-w-[140px] bg-[#04091a] border border-cyan-500/40 rounded px-2 py-1 text-[10px] text-cyan-100 focus:outline-none focus:border-cyan-300"
                      >
                        {(Object.keys(MODULE_META) as HabitatModuleType[]).map((type) => (
                          <option key={type} value={type}>
                            {MODULE_META[type].label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          holoAudio.playBlip(980, 0.06);
                          onDeployBase(
                            selectedMarker.id,
                            activeCell,
                            selectedModuleType,
                            `${MODULE_META[selectedModuleType].label} @ ${activeCell}`
                          );
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/45 text-emerald-100 border border-emerald-400/70 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        <span>DEPLOY @ {activeCell}</span>
                      </button>
                    </div>
                  )}

                  {/* Deployed Habitat Bases List for this site */}
                  {siteBases.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {siteBases.map((base) => (
                        <div
                          key={base.id}
                          className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-[#030714] border border-emerald-500/35 text-[10px]"
                        >
                          <span className="text-emerald-200 truncate">
                            [{base.cell}] {base.label}
                          </span>
                          {onRemoveBase && (
                            <button
                              type="button"
                              onClick={() => {
                                holoAudio.playBlip(540, 0.05);
                                onRemoveBase(base.id);
                              }}
                              className="text-slate-400 hover:text-rose-400 p-0.5 shrink-0"
                              title="Decommission module"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 leading-snug">
                    {BASE_GRID_SPECIFICATION.warning}
                  </div>
                </div>
              )}

              {selectedMarker.instruments && selectedMarker.instruments.length > 0 && (
                <div className="bg-slate-900/75 p-2.5 rounded border border-slate-700 text-[11px] font-mono">
                  <span className="text-cyan-300 font-semibold block mb-1.5">
                    PRIMARY PAYLOAD & INSTRUMENTS:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMarker.instruments.map((inst, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-cyan-950/75 text-cyan-200 border border-cyan-700/50 text-[10px]"
                      >
                        {inst}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Scientific Suitability Screening Disclaimer Below Panel */}
      {!isEarth && !isOrbitalProbeOnly && (
        <div className="mt-3 p-2.5 rounded-lg bg-[#030715]/95 border border-amber-500/35 text-[11px] font-mono text-slate-200 leading-relaxed">
          <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>{SITE_SUITABILITY_SCREENING.displayLabel.toUpperCase()} — SCIENTIFIC DISCLAIMER</span>
          </div>
          <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
            {SITE_SUITABILITY_SCREENING.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
};
