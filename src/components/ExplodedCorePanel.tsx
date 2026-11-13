import React from 'react';
import { GeologicalLayer, PlanetData } from '../types';
import { Layers, Sparkles, Activity, Thermometer, Gauge, ChevronRight } from 'lucide-react';

interface ExplodedCorePanelProps {
  planet: PlanetData;
  explodedView: boolean;
  onToggleExplodedView: () => void;
  selectedLayer: GeologicalLayer | null;
  onSelectLayer: (layer: GeologicalLayer | null) => void;
}

export const ExplodedCorePanel: React.FC<ExplodedCorePanelProps> = ({
  planet,
  explodedView,
  onToggleExplodedView,
  selectedLayer,
  onSelectLayer,
}) => {
  return (
    <div className="holo-panel rounded-xl p-4 border border-cyan-500/35 relative shrink-0 overflow-visible">
      <div className="reticle-bracket-tl" />
      <div className="reticle-bracket-tr" />
      <div className="reticle-bracket-bl" />
      <div className="reticle-bracket-br" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/25 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-300 shrink-0" />
          <h3 className="font-orbitron text-[13px] font-bold text-cyan-100 tracking-wider uppercase">
            GEOLOGICAL CORE STRATIGRAPHY
          </h3>
        </div>
        <button
          onClick={onToggleExplodedView}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono tracking-wider transition-all flex items-center gap-1.5 border shrink-0 ${
            explodedView
              ? 'bg-purple-600/40 text-purple-100 border-purple-400 shadow-[0_0_12px_rgba(112,0,255,0.4)]'
              : 'holo-panel text-cyan-200 border-cyan-500/45 hover:border-cyan-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{explodedView ? 'COLLAPSE CORE' : 'EXPLODE LAYERS'}</span>
        </button>
      </div>

      {/* Overview notice */}
      <p className="text-[13px] text-slate-200 mb-3 leading-relaxed">
        {explodedView
          ? 'Internal shell matrices separated. Click any layer below or on the 3D hologram to inspect NASA seismological telemetry.'
          : 'Planetary sphere in solid mantle state. Trigger "Explode Layers" to delaminate crust, mantle, and metallic core.'}
      </p>

      {/* Layer List / Stepper */}
      <div className="space-y-2 mb-3">
        {planet.geologicalLayers.map((layer) => {
          const isSelected = selectedLayer?.id === layer.id;

          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(isSelected ? null : layer)}
              className={`p-3 rounded-lg cursor-pointer transition-all border ${
                isSelected
                  ? 'border-purple-400 bg-purple-950/60 shadow-[0_0_15px_rgba(112,0,255,0.3)]'
                  : 'border-cyan-500/25 bg-[#071126]/75 hover:border-cyan-400/60 hover:bg-[#071126]/95'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />
                  <span className="font-orbitron text-[13px] font-semibold text-white tracking-wide truncate">
                    {layer.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-mono text-cyan-100 bg-cyan-950/75 px-2 py-0.5 rounded border border-cyan-700/60">
                    {layer.depthRange}
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 text-cyan-300 transition-transform ${
                      isSelected ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Collapsed brief preview */}
              {!isSelected && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-slate-300">
                  <span>
                    THICKNESS:{' '}
                    <strong className="text-white">
                      {layer.thicknessLabel || `${layer.thicknessKm.toLocaleString()} km`}
                    </strong>
                  </span>
                  <span>
                    PRESSURE:{' '}
                    <strong className="text-purple-200">
                      {layer.pressureGpa !== null ? `${layer.pressureGpa} GPa` : 'N/A (Model Dependent)'}
                    </strong>
                  </span>
                  <span>
                    TEMP:{' '}
                    <strong className="text-amber-200">
                      {layer.temperatureK !== null ? `${layer.temperatureK} K` : 'N/A (Model Dependent)'}
                    </strong>
                  </span>
                </div>
              )}

              {/* Expanded In-Depth Telemetry */}
              {isSelected && (
                <div className="mt-2.5 pt-2.5 border-t border-purple-400/35 text-xs space-y-2.5">
                  <p className="text-slate-100 text-[13px] leading-relaxed">
                    {layer.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                    <div className="bg-slate-900/90 p-2 rounded border border-cyan-500/30">
                      <div className="text-slate-300 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-cyan-400" />
                        <span>{layer.densityKgM3 !== null ? 'DENSITY' : 'THICKNESS'}</span>
                      </div>
                      <div className="text-cyan-100 font-bold text-xs mt-0.5">
                        {layer.densityKgM3 !== null
                          ? `${layer.densityKgM3.toLocaleString()} kg/m³`
                          : layer.thicknessLabel || `${layer.thicknessKm.toLocaleString()} km`}
                      </div>
                    </div>

                    <div className="bg-slate-900/90 p-2 rounded border border-purple-500/30">
                      <div className="text-slate-300 flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-purple-400" />
                        <span>PRESSURE</span>
                      </div>
                      <div className="text-purple-100 font-bold text-xs mt-0.5">
                        {layer.pressureGpa !== null ? `${layer.pressureGpa} GPa` : 'N/A (Model Dependent)'}
                      </div>
                    </div>

                    <div className="bg-slate-900/90 p-2 rounded border border-amber-500/30">
                      <div className="text-slate-300 flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-amber-400" />
                        <span>TEMP</span>
                      </div>
                      <div className="text-amber-100 font-bold text-xs mt-0.5">
                        {layer.temperatureK !== null
                          ? `${layer.temperatureK.toLocaleString()} K`
                          : 'N/A (Model Dependent)'}
                      </div>
                      {layer.temperatureNote && (
                        <div className="text-[10px] text-amber-200/80 mt-0.5 leading-tight">
                          {layer.temperatureNote}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-700 text-xs font-mono">
                    <span className="text-cyan-300 font-semibold block mb-1">
                      CHEMICAL & MINERALOGICAL SIGNATURE:
                    </span>
                    <span className="text-slate-100">{layer.composition}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* NASA Mission Reference Badge */}
      <div className="flex items-center gap-2 p-2.5 rounded bg-cyan-950/40 border border-cyan-500/25 text-[11px] font-mono text-cyan-200">
        <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>INSIGHT SEIS, JUNO MWR (2026) & NASA MOON FACTS — N/A WHERE MODEL-DEPENDENT</span>
      </div>
    </div>
  );
};
