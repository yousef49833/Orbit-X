import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import {
  ShieldCheck,
  AlertTriangle,
  Wind,
  Compass,
  Crosshair,
  Gauge,
  Cpu,
} from 'lucide-react';
import { PlanetData, SurfaceMarker } from '../types';
import { TechTooltip } from './TechTooltip';
import { computeMissionViabilityScore } from '../utils/physics';

interface MissionSuccessGaugeProps {
  planet: PlanetData;
  selectedMarker: SurfaceMarker | null;
  timeSliderValue: number;
  explodedView: boolean;
  flightReadinessScore?: number;
  onSelectMarker?: (marker: SurfaceMarker) => void;
}

export const MissionSuccessGauge: React.FC<MissionSuccessGaugeProps> = ({
  planet,
  selectedMarker,
  timeSliderValue,
  explodedView,
  flightReadinessScore,
  onSelectMarker,
}) => {
  const isEarth = planet.id === 'earth';

  const telemetryAnalysis = useMemo(() => {
    const scores = computeMissionViabilityScore(
      planet,
      selectedMarker,
      timeSliderValue,
      explodedView,
      flightReadinessScore
    );

    const clampedScore = scores.compositeScore;

    let statusLabel = 'OPTIMAL VECTOR';
    let statusColor = '#00f0ff';
    let statusBorder = 'border-cyan-400';
    let statusBg = 'bg-cyan-950/50 text-cyan-200';

    if (clampedScore >= 85) {
      statusLabel = isEarth ? 'LAUNCH READY // GO' : 'OPTIMAL // GO TOUCHDOWN';
      statusColor = '#00ff88';
      statusBorder = 'border-emerald-400';
      statusBg = 'bg-emerald-950/60 text-emerald-200';
    } else if (clampedScore >= 70) {
      statusLabel = 'NOMINAL STABILITY';
      statusColor = '#00f0ff';
      statusBorder = 'border-cyan-400';
      statusBg = 'bg-cyan-950/60 text-cyan-200';
    } else if (clampedScore >= 55) {
      statusLabel = 'MODERATE RISK';
      statusColor = '#ffb703';
      statusBorder = 'border-amber-400';
      statusBg = 'bg-amber-950/60 text-amber-200';
    } else {
      statusLabel = 'HIGH RISK // CAUTION';
      statusColor = '#ff3366';
      statusBorder = 'border-rose-500';
      statusBg = 'bg-rose-950/70 text-rose-200';
    }

    const radarData = [
      { subject: 'Radiation', score: scores.radiationScore, fullMark: 100 },
      { subject: 'Terrain', score: scores.terrainScore, fullMark: 100 },
      { subject: 'Atmosphere', score: scores.atmosphereScore, fullMark: 100 },
      { subject: 'Delta-V', score: scores.gravityMarginScore, fullMark: 100 },
      { subject: 'Thermal', score: scores.thermalScore, fullMark: 100 },
    ];

    return {
      ...scores,
      statusLabel,
      statusColor,
      statusBorder,
      statusBg,
      radarData,
    };
  }, [planet, selectedMarker, timeSliderValue, explodedView, flightReadinessScore, isEarth]);

  const gaugeData = useMemo(() => {
    return [
      { name: 'Score', value: telemetryAnalysis.compositeScore },
      { name: 'Remaining', value: 100 - telemetryAnalysis.compositeScore },
    ];
  }, [telemetryAnalysis.compositeScore]);

  return (
    <div
      id="mission-success-gauge-card"
      className="holo-panel p-4 rounded-xl border border-cyan-500/35 relative flex flex-col gap-3 backdrop-blur-md bg-[#050816]/90 shadow-[0_0_25px_rgba(0,240,255,0.12)]"
    >
      <div className="reticle-bracket-tl" />
      <div className="reticle-bracket-tr" />
      <div className="reticle-bracket-bl" />
      <div className="reticle-bracket-br" />

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/25 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-cyan-950/80 border border-cyan-400/50">
            <Gauge className="w-4 h-4 text-cyan-300 animate-pulse" />
          </div>
          <div>
            <h2 className="font-orbitron font-bold text-[13px] text-cyan-100 tracking-wider">
              MISSION ACCESS & PROBABILITY
            </h2>
            <div className="text-[11px] font-mono text-cyan-300/85">
              {isEarth
                ? 'EARTH LAUNCH & OBSERVATORY BASELINE'
                : 'NASA TELEMETRY COMPUTATION MATRIX'}
            </div>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase border ${telemetryAnalysis.statusBorder} ${telemetryAnalysis.statusBg}`}
        >
          {telemetryAnalysis.statusLabel}
        </span>
      </div>

      {/* Selected Target Site Indicator & Flight Readiness Status */}
      <div className="flex flex-col gap-2 bg-[#030612]/80 p-2.5 rounded-lg border border-cyan-500/25 text-xs font-mono">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-300 text-[11px]">
              {isEarth ? 'LAUNCH / OBS SITE:' : 'SELECTED SITE:'}
            </span>
            <span className="text-white font-bold text-xs">
              {selectedMarker ? selectedMarker.name : 'Global Sector Average'}
            </span>
          </div>
          {selectedMarker && (
            <span className="text-[11px] text-emerald-200 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-600/40 truncate max-w-full">
              {selectedMarker.status}
            </span>
          )}
        </div>

        {flightReadinessScore !== undefined && (
          <div className="flex items-center justify-between border-t border-cyan-500/20 pt-1.5 text-[11px]">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              FLIGHT HARDWARE READINESS:
            </span>
            <TechTooltip term="mission-readiness" position="left">
              <span
                className={`font-bold px-2 py-0.5 rounded border text-[11px] ${
                  flightReadinessScore >= 80
                    ? 'text-emerald-200 bg-emerald-950/70 border-emerald-500/50'
                    : flightReadinessScore >= 50
                    ? 'text-cyan-200 bg-cyan-950/70 border-cyan-500/50'
                    : 'text-amber-200 bg-amber-950/70 border-amber-500/50'
                }`}
              >
                {flightReadinessScore}% {flightReadinessScore >= 80 ? '✓ GO' : '⚠ HOLD'}
              </span>
            </TechTooltip>
          </div>
        )}
      </div>

      {/* Main Visualizer: Speedometer Gauge + Radar Analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        <div className="relative flex flex-col items-center justify-between h-[176px] pt-1">
          <div className="relative w-full h-[146px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="88%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius="72%"
                  outerRadius="94%"
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell
                    fill={telemetryAnalysis.statusColor}
                    className="drop-shadow-[0_0_8px_currentColor]"
                  />
                  <Cell fill="rgba(255, 255, 255, 0.1)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center pointer-events-none">
              <div
                className="font-orbitron font-extrabold text-xl sm:text-2xl tracking-tight leading-none"
                style={{ color: telemetryAnalysis.statusColor }}
              >
                {telemetryAnalysis.compositeScore}%
              </div>
              <div className="text-[9px] font-mono text-slate-300 uppercase tracking-wider mt-1">
                VIABILITY
              </div>
            </div>
          </div>

          <div className="w-full flex justify-between px-4 text-[10px] font-mono text-slate-400">
            <span>0% ABORT</span>
            <span>50%</span>
            <span>100% GO</span>
          </div>
        </div>

        <div className="h-[186px] relative overflow-visible">
          <ResponsiveContainer width="100%" height="100%" className="overflow-visible">
            <RadarChart
              data={telemetryAnalysis.radarData}
              outerRadius="50%"
              margin={{ top: 24, right: 44, bottom: 24, left: 44 }}
              style={{ overflow: 'visible' }}
            >
              <PolarGrid stroke="rgba(0, 240, 255, 0.25)" />
              <PolarAngleAxis
                dataKey="subject"
                tickLine={false}
                tick={{ fill: '#bae6fd', fontSize: 9.5, fontFamily: 'monospace' }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                name="Stability"
                dataKey="score"
                stroke={telemetryAnalysis.statusColor}
                fill={telemetryAnalysis.statusColor}
                fillOpacity={0.35}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#050c1e',
                  borderColor: '#00f0ff',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {explodedView && (
        <div className="flex items-center gap-2 p-2.5 rounded bg-purple-950/75 border border-purple-400/50 text-xs font-mono text-purple-100">
          <AlertTriangle className="w-4 h-4 text-purple-300 shrink-0 animate-bounce" />
          <span>
            CORE DELAMINATION ACTIVE: Magnetosphere shielding degraded (-25% radiation margin).
          </span>
        </div>
      )}

      {/* Tactical Telemetry Factor Breakdown Tiles */}
      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
        <TechTooltip term="gcr-radiation" position="top" className="w-full">
          <div className="w-full p-2 rounded-lg bg-slate-900/80 border border-cyan-500/25 hover:border-cyan-400/60 transition-colors cursor-help">
            <div className="text-slate-300 text-[11px] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              SHIELDING
            </div>
            <div className="text-cyan-200 font-bold text-sm mt-0.5">
              {telemetryAnalysis.radiationScore}%
            </div>
          </div>
        </TechTooltip>

        <TechTooltip term="atmospheric-pressure" position="top" className="w-full">
          <div className="w-full p-2 rounded-lg bg-slate-900/80 border border-cyan-500/25 hover:border-cyan-400/60 transition-colors cursor-help">
            <div className="text-slate-300 text-[11px] flex items-center gap-1">
              <Wind className="w-3 h-3 text-cyan-400" />
              ATMO
            </div>
            <div className="text-cyan-200 font-bold text-sm mt-0.5">
              {telemetryAnalysis.atmosphereScore}%
            </div>
          </div>
        </TechTooltip>

        <TechTooltip term="delta-v" position="top" className="w-full">
          <div className="w-full p-2 rounded-lg bg-slate-900/80 border border-cyan-500/25 hover:border-cyan-400/60 transition-colors cursor-help">
            <div className="text-slate-300 text-[11px] flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan-400" />
              DELTA-V
            </div>
            <div className="text-cyan-200 font-bold text-sm mt-0.5">
              {telemetryAnalysis.gravityMarginScore}%
            </div>
          </div>
        </TechTooltip>
      </div>

      {/* Orbital / Probe Only Mission Banner & Quick Site Switcher */}
      {(planet.excludeFromHumanLanding || planet.missionStatusMode === 'orbital_probe_only') && (
        <div className="border-t border-cyan-500/25 pt-2.5">
          <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/50 text-xs font-mono text-rose-100 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                {planet.id === 'europa'
                  ? 'SCIENTIFIC COMPARISON ONLY // NO LANDING CANDIDATE'
                  : 'ORBITAL / PROBE MISSION ONLY // NO HUMAN LANDING'}
              </span>
            </div>
            <p className="text-[11px] font-sans text-rose-100/90 leading-relaxed">
              {planet.landingExclusionNote}
            </p>
          </div>
        </div>
      )}

      {planet.surfaceMarkers.length > 0 && onSelectMarker && (
        <div className="border-t border-cyan-500/25 pt-2.5 space-y-2">
          <div className="text-[11px] font-mono text-slate-300 flex items-center justify-between gap-2">
            <span>
              {isEarth
                ? 'EARTH LAUNCH & OBSERVATORIES:'
                : planet.missionStatusMode === 'orbital_probe_only'
                ? 'ORBITAL & PROBE RECONNAISSANCE TARGETS:'
                : 'EVALUATE LANDING SITE SENSORS (SUITABILITY INDEX):'}
            </span>
            <span className="text-cyan-300 font-semibold shrink-0">SYNC 3D</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {planet.surfaceMarkers.map((marker) => {
              const isSelected = selectedMarker?.id === marker.id;
              return (
                <button
                  key={marker.id}
                  onClick={() => onSelectMarker(marker)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-cyan-500/30 text-white border-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                      : 'bg-slate-900/85 text-slate-200 border-cyan-500/25 hover:border-cyan-400/60'
                  }`}
                  title={`Relative Site Suitability Index: ${marker.safetyScore}% (click to focus 3D camera)`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      marker.safetyScore >= 85
                        ? 'bg-emerald-400'
                        : marker.safetyScore >= 40
                        ? 'bg-cyan-400'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-left">{marker.name}</span>
                  <span className="text-[11px] text-cyan-300 font-bold shrink-0">
                    {marker.safetyScore}%
                  </span>
                </button>
              );
            })}
          </div>

          {!isEarth && planet.missionStatusMode !== 'orbital_probe_only' && (
            <p className="text-[10px] font-mono text-slate-300/90 leading-snug bg-[#030612]/80 p-2 rounded border border-slate-700/70">
              <strong className="text-amber-300">RELATIVE SITE SUITABILITY INDEX (%):</strong>{' '}
              Illustrative project screening score (not a NASA rating or survival probability).
            </p>
          )}
        </div>
      )}
    </div>
  );
};
