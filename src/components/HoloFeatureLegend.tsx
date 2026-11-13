import React, { useState, useEffect } from 'react';
import { PlanetaryFeatureVisibility } from '../types';
import { TechTooltip } from './TechTooltip';
import { holoAudio } from '../utils/audioSynthesizer';
import {
  Layers,
  Wind,
  MapPin,
  CircleDot,
  Radio,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
} from 'lucide-react';

interface HoloFeatureLegendProps {
  visibility: PlanetaryFeatureVisibility;
  onToggleFeature: (key: keyof PlanetaryFeatureVisibility) => void;
  onToggleAll: (visible: boolean) => void;
  planetName: string;
  hasRings?: boolean;
}

export const HoloFeatureLegend: React.FC<HoloFeatureLegendProps> = ({
  visibility,
  onToggleFeature,
  onToggleAll,
  planetName,
  hasRings,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : true
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 1023px)');
    if (mq.matches) {
      setIsMinimized(true);
    }
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMinimized(e.matches);
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const features = [
    {
      key: 'atmosphere' as const,
      label: 'Atmospheric Rim & Glow',
      category: 'ATMOSPHERE',
      color: 'bg-cyan-400',
      glowColor: 'shadow-[0_0_8px_#00f0ff]',
      description: 'Outer gaseous Fresnel limb glow and planetary atmospheric scattering envelope.',
      tooltipTerm: 'scale-height',
      icon: <Wind className="w-3.5 h-3.5 text-cyan-400" />,
    },
    ...(hasRings
      ? [
          {
            key: 'planetaryRings' as const,
            label: `${planetName} Planetary Rings`,
            category: 'ASTRODYNAMICS',
            color: 'bg-amber-300',
            glowColor: 'shadow-[0_0_8px_#fcd34d]',
            description: 'Translucent icy/dust planetary ring system (visible exclusively on ringed planets Saturn & Uranus).',
            tooltipTerm: 'roche-limit',
            icon: <Sparkles className="w-3.5 h-3.5 text-amber-300" />,
          },
        ]
      : []),
    {
      key: 'tectonicPlates' as const,
      label: 'Tectonic Plates & Faults',
      category: 'GEOLOGY',
      color: 'bg-amber-400',
      glowColor: 'shadow-[0_0_8px_#f59e0b]',
      description: 'Lithospheric plate boundaries, crustal fracture rifts, and thermal fault rifts.',
      tooltipTerm: 'tectonic-plates',
      icon: <CircleDot className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      key: 'magneticField' as const,
      label: 'Magnetic Field Dipole Lines',
      category: 'ASTRODYNAMICS',
      color: 'bg-purple-400',
      glowColor: 'shadow-[0_0_8px_#a855f7]',
      description: 'Dipolar magnetospheric flux loops deflecting solar particle events.',
      tooltipTerm: 'magnetic-field',
      icon: <Zap className="w-3.5 h-3.5 text-purple-400" />,
    },
    {
      key: 'surfaceMarkers' as const,
      label: 'Landing Sites & Beacons',
      category: 'AVIONICS',
      color: 'bg-emerald-400',
      glowColor: 'shadow-[0_0_8px_#10b981]',
      description: 'Interactive rovers, lander touchdown zones, and observation/habitat sites.',
      tooltipTerm: 'lidar-guidance',
      icon: <MapPin className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      key: 'orbitalRadar' as const,
      label: 'Orbital Grid & Solar Rays',
      category: 'ASTRODYNAMICS',
      color: 'bg-sky-400',
      glowColor: 'shadow-[0_0_8px_#38bdf8]',
      description: 'Equatorial orbital telemetry rings and directional solar insolation ray vectors.',
      tooltipTerm: 'delta-v',
      icon: <Radio className="w-3.5 h-3.5 text-sky-400" />,
    },
  ];

  const activeCount = features.filter((f) => visibility[f.key] !== false).length;

  const handleToggle = (key: keyof PlanetaryFeatureVisibility) => {
    holoAudio.playBlip(780, 0.05);
    onToggleFeature(key);
  };

  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={() => {
          holoAudio.playBlip(820, 0.05);
          setIsMinimized(false);
        }}
        className="holo-panel rounded-lg border border-cyan-500/45 bg-[#040818]/90 backdrop-blur-xl px-2.5 py-1.5 text-xs font-mono text-cyan-100 hover:border-cyan-300 shadow-[0_0_16px_rgba(0,0,0,0.8)] flex items-center gap-2 pointer-events-auto transition-all"
        title="Expand 3D Feature Layers overlay controls"
      >
        <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="font-orbitron font-bold text-[11px] tracking-wider">LAYERS</span>
        <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-950 text-cyan-200 border border-cyan-600/50">
          {activeCount}/{features.length}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-cyan-300" />
      </button>
    );
  }

  return (
    <div className="holo-panel rounded-xl border border-cyan-500/40 bg-[#040818]/90 backdrop-blur-xl shadow-[0_0_24px_rgba(0,0,0,0.85)] p-2.5 text-xs font-mono select-none pointer-events-auto transition-all duration-300 w-[250px] sm:w-[270px]">
      {/* Reticle brackets */}
      <div className="reticle-bracket-tl" />
      <div className="reticle-bracket-tr" />
      <div className="reticle-bracket-bl" />
      <div className="reticle-bracket-br" />

      {/* Floating Window Header */}
      <div className="flex items-center justify-between gap-2 border-b border-cyan-500/25 pb-1.5 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute -top-0.5 -right-0.5 animate-ping" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-orbitron font-bold text-[11px] text-cyan-100 tracking-wider whitespace-nowrap">
                LAYERS
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-200 border border-cyan-600/50 shrink-0">
                {activeCount}/{features.length}
              </span>
            </div>
            <div className="text-[10px] text-cyan-300/80 truncate">
              {planetName.toUpperCase()} OVERLAYS
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleAll(activeCount < features.length)}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono text-cyan-200 hover:text-white bg-cyan-950/70 border border-cyan-600/50 transition-all"
            title="Toggle all 3D features on or off"
          >
            {activeCount === features.length ? 'HIDE' : 'ALL'}
          </button>

          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded text-cyan-300 hover:text-white transition-colors"
            title="Minimize feature layers"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Feature List (Collapsible Checkboxes) */}
      {!isMinimized && (
        <div className="space-y-1 pt-0.5">
          {features.map((feat) => {
            const isVisible = visibility[feat.key] !== false;

            return (
              <TechTooltip
                key={feat.key}
                term={feat.tooltipTerm}
                title={feat.label}
                definition={feat.description}
                category={feat.category}
                position="right"
                className="w-full"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isVisible}
                  onClick={() => handleToggle(feat.key)}
                  className={`w-full px-2 py-1.5 rounded-lg border text-left transition-all flex items-center justify-between gap-2 ${
                    isVisible
                      ? 'bg-[#07152b]/90 border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.12)] text-slate-100'
                      : 'bg-[#020510]/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">
                      {isVisible ? (
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-300" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </span>

                    <div
                      className={`w-2 h-2 rounded-full ${feat.color} shrink-0 transition-all ${
                        isVisible ? feat.glowColor : 'opacity-30'
                      }`}
                    />

                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="shrink-0">{feat.icon}</span>
                      <span
                        className={`text-[11px] font-medium truncate ${
                          isVisible ? 'text-cyan-50 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {feat.label}
                      </span>
                    </div>
                  </div>
                </button>
              </TechTooltip>
            );
          })}
        </div>
      )}
    </div>
  );
};
