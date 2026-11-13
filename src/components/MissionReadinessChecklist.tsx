import React from 'react';
import { FlightChecklistItem } from '../types';
import { TechTooltip } from './TechTooltip';
import { holoAudio } from '../utils/audioSynthesizer';
import {
  CheckCircle2,
  Circle,
  ShieldCheck,
  Radio,
  Wind,
  Flame,
  Cpu,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface MissionReadinessChecklistProps {
  items: FlightChecklistItem[];
  onToggleItem: (itemId: string) => void;
  onCheckAll: () => void;
  onResetAll: () => void;
  readinessScore: number;
  planetName: string;
}

export const MissionReadinessChecklist: React.FC<MissionReadinessChecklistProps> = ({
  items,
  onToggleItem,
  onCheckAll,
  onResetAll,
  readinessScore,
  planetName,
}) => {
  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

  const handleToggle = (id: string) => {
    holoAudio.playBlip(920, 0.05);
    onToggleItem(id);
  };

  const getSystemIcon = (system: string) => {
    switch (system) {
      case 'LIFE_SUPPORT':
        return <Wind className="w-3.5 h-3.5 text-emerald-400" />;
      case 'AVIONICS':
        return <Radio className="w-3.5 h-3.5 text-cyan-400" />;
      case 'PROPULSION':
        return <Flame className="w-3.5 h-3.5 text-amber-400" />;
      case 'POWER_THERMAL':
        return <Zap className="w-3.5 h-3.5 text-yellow-400" />;
      case 'SURFACE_ISRU':
        return <Cpu className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const getSystemBadgeClass = (system: string) => {
    switch (system) {
      case 'LIFE_SUPPORT':
        return 'bg-emerald-950/80 text-emerald-200 border-emerald-600/60';
      case 'AVIONICS':
        return 'bg-cyan-950/80 text-cyan-200 border-cyan-600/60';
      case 'PROPULSION':
        return 'bg-amber-950/80 text-amber-200 border-amber-600/60';
      case 'POWER_THERMAL':
        return 'bg-yellow-950/80 text-yellow-200 border-yellow-600/60';
      case 'SURFACE_ISRU':
        return 'bg-purple-950/80 text-purple-200 border-purple-600/60';
      default:
        return 'bg-slate-900 text-slate-200 border-slate-700';
    }
  };

  const getReadinessStatus = () => {
    if (readinessScore >= 95) {
      return { label: 'OPTIMAL CRUISE', color: 'text-cyan-200', bg: 'bg-cyan-950/85 border-cyan-400' };
    }
    if (readinessScore >= 80) {
      return { label: 'GO FOR LAUNCH', color: 'text-emerald-200', bg: 'bg-emerald-950/85 border-emerald-400' };
    }
    if (readinessScore >= 50) {
      return { label: 'DEGRADED RECON', color: 'text-amber-200', bg: 'bg-amber-950/85 border-amber-400' };
    }
    return { label: 'LAUNCH HOLD', color: 'text-red-200', bg: 'bg-red-950/85 border-red-400' };
  };

  const status = getReadinessStatus();

  return (
    <div className="holo-panel rounded-xl p-4 border border-cyan-500/35 flex flex-col relative overflow-visible shrink-0">
      <div className="reticle-bracket-tl" />
      <div className="reticle-bracket-tr" />
      <div className="reticle-bracket-bl" />
      <div className="reticle-bracket-br" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/25 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-400/50">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-orbitron text-[13px] font-bold text-cyan-100 tracking-wider">
                MISSION READINESS CHECKLIST
              </h3>
              <TechTooltip
                title="Mission Flight Prep Protocol"
                category="AVIONICS"
                definition="Pre-launch flight hardware verification matrix ensuring redundant systems are online before orbital insertion."
                formulaOrMetric="Readiness Factor = Σ(Validated Systems) / Total Loadout"
                missionRelevance="Unchecked critical systems degrade telemetry and increase the probability of mission abort."
              >
                <span className="cursor-help text-[10px] text-cyan-300 border border-cyan-500/40 px-1.5 rounded hover:text-white">
                  ?
                </span>
              </TechTooltip>
            </div>
            <div className="text-[11px] font-mono text-cyan-300/85">
              TARGET: {planetName.toUpperCase()} // HARDWARE VALIDATION
            </div>
          </div>
        </div>

        {/* Quick Bulk Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              holoAudio.playBlip(1040, 0.08);
              onCheckAll();
            }}
            className="px-2.5 py-1 rounded text-[11px] font-mono font-semibold bg-cyan-950/75 text-cyan-200 border border-cyan-500/60 hover:bg-cyan-900/70 transition-all"
            title="Validate and check all flight systems"
          >
            ALL GO
          </button>
          <button
            onClick={() => {
              holoAudio.playBlip(440, 0.08);
              onResetAll();
            }}
            className="p-1.5 rounded text-slate-300 hover:text-red-300 transition-colors"
            title="Reset flight prep checklist"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Live Readiness Progress Bar */}
      <div className="mb-3 bg-[#030718]/90 p-3 rounded-lg border border-cyan-500/25">
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-mono mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-200">VERIFIED:</span>
            <span className="text-cyan-200 font-bold text-sm">
              {checkedCount} / {totalCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${status.bg} ${status.color}`}
            >
              {status.label}
            </span>
            <span className="text-sm font-orbitron font-bold text-white">
              {readinessScore}%
            </span>
          </div>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-700 overflow-hidden relative">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${readinessScore}%`,
              background:
                readinessScore >= 80
                  ? 'linear-gradient(90deg, #00f0ff, #10b981)'
                  : readinessScore >= 50
                  ? 'linear-gradient(90deg, #f59e0b, #00f0ff)'
                  : 'linear-gradient(90deg, #ef4444, #f59e0b)',
            }}
          />
        </div>

        <div className="text-[11px] font-mono text-cyan-300/85 mt-1.5 flex flex-wrap items-center justify-between gap-1">
          <span>Modulates Mission Access & Probability</span>
          <span className="font-semibold">+{checkedCount > 0 ? checkedCount * 5 : 0}% telemetry</span>
        </div>
      </div>

      {/* Flight Prep Items List */}
      <div className="space-y-2 overflow-y-auto max-h-[290px] pr-1">
        {items.map((item) => (
          <TechTooltip
            key={item.id}
            term={item.techGlossaryKey}
            title={item.label}
            definition={item.description}
            category={item.system}
            position="top"
            className="w-full"
          >
            <div
              onClick={() => handleToggle(item.id)}
              className={`w-full p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2.5 font-mono text-xs select-none ${
                item.checked
                  ? 'bg-[#06192a]/85 border-cyan-400/55 shadow-[0_0_12px_rgba(0,240,255,0.12)]'
                  : 'bg-[#030612]/80 border-slate-700/80 hover:border-slate-500 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  className="shrink-0 text-cyan-400 focus:outline-none"
                  aria-label={item.checked ? `Uncheck ${item.label}` : `Check ${item.label}`}
                >
                  {item.checked ? (
                    <CheckCircle2 className="w-4 h-4 text-cyan-300 drop-shadow-[0_0_6px_#00f0ff]" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                  )}
                </button>

                <div className="flex flex-col min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[13px] font-semibold truncate ${
                        item.checked ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.requiredForGo && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-950/90 text-red-200 border border-red-600/70 shrink-0">
                        CRITICAL
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-300 truncate">
                    {item.description}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 ${getSystemBadgeClass(
                    item.system
                  )}`}
                >
                  {getSystemIcon(item.system)}
                  <span className="hidden sm:inline">{item.system.replace('_', ' ')}</span>
                </span>

                <span
                  className={`text-[11px] font-mono font-bold ${
                    item.checked ? 'text-emerald-300' : 'text-slate-400'
                  }`}
                >
                  +{item.weightImpactPercent}%
                </span>
              </div>
            </div>
          </TechTooltip>
        ))}
      </div>
    </div>
  );
};
