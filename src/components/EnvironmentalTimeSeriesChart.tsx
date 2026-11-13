import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { PlanetData, SurfaceMarker } from '../types';
import { TechTooltip } from './TechTooltip';
import { Activity, ShieldAlert, Wind, Sparkles, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface EnvironmentalTimeSeriesChartProps {
  planet: PlanetData;
  timeSliderValue: number;
  selectedMarker: SurfaceMarker | null;
  onChangeTimeSlider?: (val: number) => void;
}

export const EnvironmentalTimeSeriesChart: React.FC<EnvironmentalTimeSeriesChartProps> = ({
  planet,
  timeSliderValue,
  selectedMarker,
  onChangeTimeSlider,
}) => {
  const [metricMode, setMetricMode] = useState<'pressure' | 'radiation' | 'dual'>('pressure');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const chartData = useMemo(() => {
    const points: Array<{
      sliderVal: number;
      label: string;
      epochName: string;
      pressureBar: number;
      pressureKPa: number;
      radiationMSv: number;
      areaPressureBar: number;
      areaRadiationMSv: number;
    }> = [];

    const steps = [0, 15, 30, 45, 60, 75, 90, 100];

    steps.forEach((val) => {
      const era = planet.eras.reduce((prev, curr) => {
        return Math.abs(curr.sliderValue - val) < Math.abs(prev.sliderValue - val) ? curr : prev;
      }, planet.eras[0]);

      let basePressure = era.atmosphericPressureBar;
      if (basePressure === undefined || isNaN(basePressure)) {
        basePressure = planet.atmosphericDensityKgM3 * 0.3;
      }

      let baseRadiation = 200;
      if (planet.id === 'mercury') {
        baseRadiation = 950;
      } else if (planet.id === 'venus') {
        baseRadiation = 12;
      } else if (planet.id === 'earth') {
        baseRadiation = 3.2;
      } else if (planet.id === 'mars') {
        // 0.64 mSv/day GCR (~234 mSv/yr) in Present Day Mars, lower during denser Noachian atmosphere
        baseRadiation = Math.round(45 + (val / 100) * 189);
      } else if (planet.id === 'moon') {
        baseRadiation = 380;
      } else if (planet.id === 'jupiter') {
        baseRadiation = 12000;
      } else if (planet.id === 'europa') {
        baseRadiation = 5400;
      } else if (planet.id === 'saturn') {
        baseRadiation = 1800;
      } else if (planet.id === 'uranus') {
        baseRadiation = 650;
      } else if (planet.id === 'neptune') {
        baseRadiation = 520;
      }

      let areaPressure = basePressure;
      let areaRadiation = baseRadiation;

      if (selectedMarker) {
        const sid = selectedMarker.id.toLowerCase();
        if (sid.includes('titan-relay')) {
          areaRadiation = 45;
          areaPressure = 0.0;
        } else if (sid.includes('mauna-loa')) {
          areaPressure = basePressure * 0.67;
          areaRadiation = 5;
        } else if (sid.includes('shackleton')) {
          // Crater does NOT block radiation; engineered regolith shielding is required
          areaRadiation = baseRadiation;
          areaPressure = basePressure;
        } else {
          areaRadiation = baseRadiation;
        }
      }

      points.push({
        sliderVal: val,
        label: `${val}%`,
        epochName: era.epochName,
        pressureBar: Number(basePressure.toFixed(4)),
        pressureKPa: Number((basePressure * 100).toFixed(2)),
        radiationMSv: Math.round(baseRadiation),
        areaPressureBar: Number(areaPressure.toFixed(4)),
        areaRadiationMSv: Math.round(areaRadiation),
      });
    });

    return points;
  }, [planet, selectedMarker]);

  const currentTelemetry = useMemo(() => {
    const leftPoint = chartData.reduce((prev, curr) => {
      return curr.sliderVal <= timeSliderValue && curr.sliderVal > prev.sliderVal ? curr : prev;
    }, chartData[0]);

    const rightPoint =
      chartData.find((p) => p.sliderVal >= timeSliderValue) || chartData[chartData.length - 1];

    const ratio =
      rightPoint.sliderVal === leftPoint.sliderVal
        ? 0
        : (timeSliderValue - leftPoint.sliderVal) / (rightPoint.sliderVal - leftPoint.sliderVal);

    const interpPressure =
      leftPoint.areaPressureBar + ratio * (rightPoint.areaPressureBar - leftPoint.areaPressureBar);
    const interpRadiation =
      leftPoint.areaRadiationMSv + ratio * (rightPoint.areaRadiationMSv - leftPoint.areaRadiationMSv);

    return {
      pressure: interpPressure,
      radiation: Math.round(interpRadiation),
      epoch: (
        timeSliderValue < 35
          ? chartData[0]
          : timeSliderValue < 75
          ? chartData[3]
          : chartData[chartData.length - 1]
      ).epochName,
    };
  }, [chartData, timeSliderValue]);

  return (
    <div className="holo-panel rounded-xl border border-cyan-500/35 flex flex-col relative overflow-visible shrink-0">
      <div className="reticle-bracket-tl" />
      <div className="reticle-bracket-tr" />
      <div className="reticle-bracket-bl" />
      <div className="reticle-bracket-br" />

      {/* Accordion Header Bar (Never Clipped, Aligned Icon + Title + Chevron) */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className={`w-full py-3 px-3.5 overflow-visible min-h-[44px] flex items-center justify-between gap-2 text-left transition-colors hover:bg-cyan-950/30 rounded-t-xl ${
          isExpanded ? 'border-b border-cyan-500/25 rounded-b-none' : 'rounded-b-xl'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-400/50 shrink-0">
            <Activity className="w-4 h-4 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-orbitron text-[13px] font-bold text-cyan-100 tracking-wider leading-tight">
                CHRONO-ENVIRONMENTAL TELEMETRY
              </h3>
            </div>
            <div className="text-[11px] font-mono text-cyan-300/85 flex items-center gap-1.5 truncate">
              <span>ACTIVE SITE:</span>
              <span className="text-white font-semibold truncate">
                {selectedMarker ? selectedMarker.name : 'GLOBAL SURFACE AVERAGE'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <TechTooltip term="atmospheric-pressure" position="left">
            <span
              onClick={(e) => e.stopPropagation()}
              className="cursor-help text-[10px] text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded hover:text-white"
            >
              ?
            </span>
          </TechTooltip>
          <span className="p-1 rounded-md bg-cyan-950/70 border border-cyan-500/35 text-cyan-200 flex items-center justify-center shrink-0">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 pt-3 flex flex-col">
          {/* Telemetry Metric Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-mono text-slate-300">TELEMETRY CHANNEL:</span>
            <div className="flex items-center gap-1 bg-[#020612]/90 p-1 rounded-lg border border-cyan-500/30">
              <TechTooltip term="atmospheric-pressure">
                <button
                  onClick={() => setMetricMode('pressure')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                    metricMode === 'pressure'
                      ? 'bg-cyan-500/25 text-cyan-100 border border-cyan-400 font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                      : 'text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <Wind className="w-3 h-3 text-cyan-400" />
                  <span>PRESSURE</span>
                </button>
              </TechTooltip>

              <TechTooltip term="gcr-radiation">
                <button
                  onClick={() => setMetricMode('radiation')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                    metricMode === 'radiation'
                      ? 'bg-red-500/25 text-red-100 border border-red-400 font-bold shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                      : 'text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3 text-red-400" />
                  <span>RADIATION</span>
                </button>
              </TechTooltip>

              <button
                onClick={() => setMetricMode('dual')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                  metricMode === 'dual'
                    ? 'bg-purple-500/25 text-purple-100 border border-purple-400 font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                    : 'text-slate-300 hover:text-white border border-transparent'
                }`}
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>DUAL</span>
              </button>
            </div>
          </div>

      {/* Live Readout Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        <div className="bg-[#03081a]/90 p-2.5 rounded-lg border border-cyan-500/25 flex flex-col">
          <span className="text-[11px] font-mono text-slate-300 flex items-center gap-1">
            <Wind className="w-3 h-3 text-cyan-400 shrink-0" />
            LOCAL PRESSURE
          </span>
          <span className="text-sm font-orbitron font-bold text-cyan-200 mt-0.5">
            {currentTelemetry.pressure < 0.01
              ? `${(currentTelemetry.pressure * 1000).toFixed(1)} mbar`
              : `${currentTelemetry.pressure.toFixed(3)} bar`}
          </span>
          <span className="text-[10px] font-mono text-cyan-300/80 mt-0.5">
            {selectedMarker ? 'Site Adjusted' : 'Equatorial Mean'}
          </span>
        </div>

        <div className="bg-[#03081a]/90 p-2.5 rounded-lg border border-red-500/25 flex flex-col">
          <span className="text-[11px] font-mono text-slate-300 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />
            RADIATION
          </span>
          <span className="text-sm font-orbitron font-bold text-red-200 mt-0.5">
            {currentTelemetry.radiation} <span className="text-[11px] font-mono">mSv/yr</span>
          </span>
          <span className="text-[10px] font-mono text-red-300/80 mt-0.5">
            {planet.id === 'earth'
              ? 'Magnetosphere Shielded'
              : selectedMarker?.id.includes('SHACKLETON')
              ? 'Regolith Shielding Req.'
              : planet.id === 'mars'
              ? '~0.64 mSv/day GCR Context'
              : 'Ambient Cosmic Flux'}
          </span>
        </div>

        <div className="bg-[#03081a]/90 p-2.5 rounded-lg border border-purple-500/25 col-span-2 sm:col-span-1 flex flex-col">
          <span className="text-[11px] font-mono text-slate-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-400 shrink-0" />
            EPOCH CURSOR
          </span>
          <span className="text-[13px] font-orbitron font-bold text-purple-200 truncate mt-0.5">
            {currentTelemetry.epoch}
          </span>
          <span className="text-[10px] font-mono text-purple-300/80 mt-0.5">
            Sync: T={timeSliderValue}%
          </span>
        </div>
      </div>

      {/* Recharts Time-Series Graph */}
      <div className="h-44 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -16, bottom: 0 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload[0] && onChangeTimeSlider) {
                const val = state.activePayload[0].payload?.sliderVal;
                if (typeof val === 'number') {
                  onChangeTimeSlider(val);
                }
              }
            }}
          >
            <defs>
              <linearGradient id="pressureGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="radiationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="sliderVal"
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
              tickFormatter={(v) => `${v}%`}
              stroke="#334155"
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
              stroke="#334155"
            />
            {metricMode === 'dual' && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#fca5a5', fontSize: 10, fontFamily: 'monospace' }}
                stroke="#7f1d1d"
              />
            )}

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#040816]/95 border border-cyan-500/60 p-2.5 rounded-lg text-xs font-mono shadow-[0_0_15px_rgba(0,240,255,0.25)]">
                      <div className="text-cyan-200 font-bold border-b border-cyan-500/30 pb-1 mb-1 flex items-center justify-between gap-2">
                        <span>{data.epochName}</span>
                        <span className="text-slate-300">T={data.sliderVal}%</span>
                      </div>
                      <div className="text-cyan-100">
                        Area Pressure: <span className="font-bold">{data.areaPressureBar} bar</span>
                      </div>
                      <div className="text-red-200">
                        Area Radiation: <span className="font-bold">{data.areaRadiationMSv} mSv/yr</span>
                      </div>
                      {selectedMarker && (
                        <div className="text-slate-300 text-[11px] mt-1">
                          Site: {selectedMarker.name}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            {(metricMode === 'pressure' || metricMode === 'dual') && (
              <>
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="areaPressureBar"
                  stroke="#00f0ff"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#pressureGradient)"
                  name="Pressure (bar)"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="pressureBar"
                  stroke="#38bdf8"
                  strokeDasharray="3 3"
                  dot={false}
                  strokeWidth={1.2}
                  name="Global Pressure"
                />
              </>
            )}

            {(metricMode === 'radiation' || metricMode === 'dual') && (
              <>
                <Area
                  yAxisId={metricMode === 'dual' ? 'right' : 'left'}
                  type="monotone"
                  dataKey="areaRadiationMSv"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#radiationGradient)"
                  name="Radiation (mSv/yr)"
                />
                <Line
                  yAxisId={metricMode === 'dual' ? 'right' : 'left'}
                  type="monotone"
                  dataKey="radiationMSv"
                  stroke="#f87171"
                  strokeDasharray="3 3"
                  dot={false}
                  strokeWidth={1.2}
                  name="Global Radiation"
                />
              </>
            )}

            <ReferenceLine
              x={timeSliderValue}
              stroke="#a855f7"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{
                value: `TIME ${timeSliderValue}%`,
                position: 'top',
                fill: '#d8b4fe',
                fontSize: 10,
                fontFamily: 'monospace',
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div
          className="absolute top-1/2 pointer-events-none -translate-y-1/2 -translate-x-1/2 transition-all duration-200"
          style={{
            left: `${Math.max(4, Math.min(96, (timeSliderValue / 100) * 88 + 6))}%`,
          }}
        >
          <div className="relative flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-purple-500/40 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 border border-white shadow-[0_0_10px_#c084fc]" />
          </div>
        </div>
      </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 pt-2 border-t border-cyan-500/20 mt-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Sync with Time Machine Slider</span>
            </span>
            <span className="text-cyan-300 font-semibold">LIVE TELEMETRY</span>
          </div>
        </div>
      )}
    </div>
  );
};
