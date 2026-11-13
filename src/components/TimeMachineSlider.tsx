import React, { useState, useEffect, useRef } from 'react';
import { PlanetData } from '../types';
import { EUROPA_PREVIEW_ASSET } from '../data/nasaResearchData';
import { Clock, Play, Pause, Droplets, Wind, ThermometerSun, ExternalLink } from 'lucide-react';

interface TimeMachineSliderProps {
  planet: PlanetData;
  timeSliderValue: number;
  onChangeTimeSlider: (value: number) => void;
}

export const TimeMachineSlider: React.FC<TimeMachineSliderProps> = ({
  planet,
  timeSliderValue,
  onChangeTimeSlider,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playIntervalRef = useRef<number | null>(null);

  const eras = planet.eras;

  const currentEra = eras.reduce((prev, curr) => {
    return Math.abs(curr.sliderValue - timeSliderValue) < Math.abs(prev.sliderValue - timeSliderValue)
      ? curr
      : prev;
  }, eras[0]);

  const calculateInterpolatedStats = () => {
    let left = eras[0];
    let right = eras[eras.length - 1];

    for (let i = 0; i < eras.length - 1; i++) {
      if (timeSliderValue >= eras[i].sliderValue && timeSliderValue <= eras[i + 1].sliderValue) {
        left = eras[i];
        right = eras[i + 1];
        break;
      }
    }

    const span = right.sliderValue - left.sliderValue || 1;
    const localT = (timeSliderValue - left.sliderValue) / span;

    const water = Math.round(
      left.waterCoveragePercent + (right.waterCoveragePercent - left.waterCoveragePercent) * localT
    );
    const pressure = Number(
      (left.atmosphericPressureBar + (right.atmosphericPressureBar - left.atmosphericPressureBar) * localT).toFixed(3)
    );
    const temp = Math.round(left.averageTempC + (right.averageTempC - left.averageTempC) * localT);

    return { water, pressure, temp };
  };

  const currentStats = calculateInterpolatedStats();
  const timeValueRef = useRef<number>(timeSliderValue);
  timeValueRef.current = timeSliderValue;

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = window.setInterval(() => {
        if (timeValueRef.current >= 100) {
          setIsPlaying(false);
        } else {
          onChangeTimeSlider(Math.min(100, timeValueRef.current + 1));
        }
      }, 80);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, onChangeTimeSlider]);

  return (
    <div className="holo-panel rounded-xl p-4 border border-cyan-500/35 relative shrink-0 overflow-visible">
      <div className="reticle-bracket-tl" />
      <div className="reticle-bracket-tr" />
      <div className="reticle-bracket-bl" />
      <div className="reticle-bracket-br" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/25 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-300 shrink-0" />
          <h3 className="font-orbitron text-[13px] font-bold text-cyan-200 tracking-wider uppercase">
            COSMIC TIME MACHINE
          </h3>
        </div>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="holo-panel px-2.5 py-1 rounded-lg text-xs text-cyan-200 border-cyan-500/40 hover:border-cyan-300 flex items-center gap-1.5 transition-all"
          title={isPlaying ? 'Pause Chronology Loop' : 'Play Chronology Loop'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-300" /> : <Play className="w-3.5 h-3.5 text-emerald-300" />}
          <span className="font-mono text-[11px] font-semibold">{isPlaying ? 'PAUSE' : 'SIMULATE'}</span>
        </button>
      </div>

      {/* Current Era Readout */}
      <div className="mb-3 p-3 rounded-lg bg-[#071329]/85 border border-cyan-500/30">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-orbitron text-[13px] font-bold text-cyan-100">
            {currentEra.epochName}
          </span>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-100 border border-cyan-600/50 shrink-0">
            {currentEra.yearsAgo}
          </span>
        </div>
        <p className="text-[13px] text-slate-200 leading-relaxed">
          {currentEra.description}
        </p>
      </div>

      {/* Interactive HTML Range Slider */}
      <div className="mb-3.5">
        <div className="flex justify-between items-center text-[11px] font-mono text-cyan-200 mb-1.5">
          <span>PRIMORDIAL</span>
          <span className="text-white font-bold bg-cyan-950/90 px-2 py-0.5 rounded border border-cyan-500/40">
            T = {timeSliderValue}%
          </span>
          <span>PRESENT DAY</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={timeSliderValue}
          onChange={(e) => onChangeTimeSlider(Number(e.target.value))}
          className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
        />

        {/* Era Quick Buttons */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mt-2">
          {eras.map((era) => {
            const isActive = currentEra.id === era.id;
            return (
              <button
                key={era.id}
                onClick={() => onChangeTimeSlider(era.sliderValue)}
                className={`py-1 px-1.5 rounded text-[11px] font-mono text-center truncate border transition-all ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-500/25 text-cyan-100 font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:text-cyan-200 hover:border-cyan-500/50'
                }`}
              >
                {era.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Environmental Telemetry Gauges */}
      <div className="grid grid-cols-3 gap-2 font-mono text-xs mb-2.5">
        <div className="bg-slate-900/85 p-2.5 rounded-lg border border-cyan-500/25">
          <div className="flex items-center gap-1 text-slate-300 text-[11px] mb-1">
            <Droplets className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{planet.id === 'europa' ? 'SURFACE SEA' : 'SURFACE WATER'}</span>
          </div>
          <div className="text-cyan-200 font-bold text-sm">
            {planet.id === 'europa' ? '0% (Sub-Ice)' : `${currentStats.water}%`}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-cyan-400 h-full transition-all duration-300"
              style={{ width: `${planet.id === 'europa' ? 0 : currentStats.water}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/85 p-2.5 rounded-lg border border-purple-500/25">
          <div className="flex items-center gap-1 text-slate-300 text-[11px] mb-1">
            <Wind className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>ATMO</span>
          </div>
          <div className="text-purple-200 font-bold text-sm">
            {currentStats.pressure} bar
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-purple-400 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (currentStats.pressure / 1.5) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/85 p-2.5 rounded-lg border border-amber-500/25">
          <div className="flex items-center gap-1 text-slate-300 text-[11px] mb-1">
            <ThermometerSun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>TEMP</span>
          </div>
          <div className="text-amber-200 font-bold text-sm">
            {currentStats.temp}°C
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, ((currentStats.temp + 190) / 210) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {(planet.id === 'mars' || planet.id === 'europa') && (
        <div className="p-2.5 rounded-lg bg-[#040a1a]/90 border border-cyan-500/25 text-[11px] text-slate-300 leading-snug space-y-2">
          <div>
            <strong className="text-cyan-300 font-mono">COMPARISON NOTE: </strong>
            {planet.id === 'europa'
              ? 'Europa holds a likely subsurface ocean (60–150 km) beneath ~29 km ice—no exposed surface sea or thick atmosphere.'
              : 'Mars preserves ancient surface valley networks and lakes (4.0–3.5 Bya), unlike Europa’s hidden sub-ice ocean.'}
          </div>

          {planet.id === 'europa' && (
            <div className="pt-2 border-t border-cyan-500/20 flex items-center gap-2.5">
              <img
                src={EUROPA_PREVIEW_ASSET.previewImage.url}
                alt={EUROPA_PREVIEW_ASSET.previewImage.altText}
                loading="lazy"
                className="w-16 h-12 rounded object-cover border border-cyan-400/50 shrink-0 bg-black"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono text-cyan-300 font-bold truncate">
                  NASA Visualization / Spacecraft Imagery
                </div>
                <div className="text-[11px] text-slate-200 font-semibold truncate">
                  {EUROPA_PREVIEW_ASSET.previewImage.title}
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                  <span className="truncate">NASA/JPL-Caltech/SwRI/MSSS</span>
                  <a
                    href={EUROPA_PREVIEW_ASSET.nasa3dModel.pageUrl}
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
        </div>
      )}
    </div>
  );
};
