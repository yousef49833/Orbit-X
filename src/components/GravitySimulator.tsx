import React, { useState, useEffect, useMemo } from 'react';
import { PlanetData, GravityCalcResult } from '../types';
import { calculateGravityMetrics, EARTH_GRAVITY } from '../utils/physics';
import { NASA_PLANETS } from '../data/nasaPlanets';
import { Rocket, Gauge, Scale, Zap, ArrowLeftRight } from 'lucide-react';

interface GravitySimulatorProps {
  planet: PlanetData;
  userWeight: number;
  setUserWeight: (val: number) => void;
  jumpHeight: number;
  setJumpHeight: (val: number) => void;
  onUpdateMetrics?: (calc: GravityCalcResult) => void;
}

export const GravitySimulator: React.FC<GravitySimulatorProps> = ({
  planet,
  userWeight,
  setUserWeight,
  jumpHeight,
  setJumpHeight,
  onUpdateMetrics,
}) => {
  const isEarthMode = planet.id === 'earth';

  // Quick comparison target when Earth (Terra) 1.0x Reference Baseline is active
  const [comparePlanetId, setComparePlanetId] = useState<string>('mars');

  const activeTargetPlanet = isEarthMode
    ? NASA_PLANETS[comparePlanetId] || NASA_PLANETS.mars
    : planet;

  const metrics = calculateGravityMetrics(userWeight, jumpHeight, activeTargetPlanet.gravity);

  useEffect(() => {
    if (onUpdateMetrics) {
      onUpdateMetrics(metrics);
    }
  }, [userWeight, jumpHeight, activeTargetPlanet.gravity]);

  // Smooth phase animation (0 -> 1 across airtime) for live astronaut trajectory marker
  const [cycleProgress, setCycleProgress] = useState<number>(0.5);

  useEffect(() => {
    let rafId: number;
    const start = performance.now();
    const cycleMs = 3400;

    const tick = (now: number) => {
      const u = ((now - start) % cycleMs) / cycleMs;
      setCycleProgress(u);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [activeTargetPlanet.id, jumpHeight]);

  // SVG Parabolic Trajectory Chart Geometry & Dynamic Scaling
  const chartGeom = useMemo(() => {
    const svgW = 380;
    const svgH = 195;
    const padLeft = 46;
    const padRight = 16;
    const padTop = 34;
    const padBottom = 26;
    const plotW = svgW - padLeft - padRight;
    const plotH = svgH - padTop - padBottom;
    const baseY = padTop + plotH;

    const planetApexM = Math.max(0.05, metrics.jumpHeightPlanetM);
    const earthApexM = Math.max(0.05, metrics.jumpHeightEarthM);
    const rawMax = Math.max(planetApexM, earthApexM, 0.5);
    const hMax = Number((rawMax * 1.18).toFixed(2));

    const toX = (u: number) => padLeft + u * plotW;
    const toY = (meters: number) => baseY - (meters / hMax) * plotH;

    const buildParabolaPath = (apexM: number, closeArea: boolean) => {
      const steps = 40;
      const pts: string[] = [];
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const h = apexM * 4 * u * (1 - u); // Exact normalized vertical kinematics h(u)
        const x = toX(u).toFixed(1);
        const y = toY(h).toFixed(1);
        pts.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
      }
      if (closeArea) {
        pts.push(`L ${toX(1).toFixed(1)} ${baseY.toFixed(1)}`);
        pts.push(`L ${toX(0).toFixed(1)} ${baseY.toFixed(1)} Z`);
      }
      return pts.join(' ');
    };

    const planetLinePath = buildParabolaPath(planetApexM, false);
    const planetAreaPath = buildParabolaPath(planetApexM, true);
    const earthLinePath = buildParabolaPath(earthApexM, false);

    // 4 clean Y-axis tick lines
    const yTicks = [0, 0.33, 0.67, 1].map((frac) => {
      const val = hMax * frac;
      return {
        y: toY(val),
        label: val >= 10 ? val.toFixed(1) : val.toFixed(2),
      };
    });

    return {
      svgW,
      svgH,
      padLeft,
      padRight,
      padTop,
      plotW,
      plotH,
      baseY,
      hMax,
      planetApexM,
      earthApexM,
      planetLinePath,
      planetAreaPath,
      earthLinePath,
      yTicks,
      toX,
      toY,
    };
  }, [metrics.jumpHeightPlanetM, metrics.jumpHeightEarthM]);

  // Live positions at current airtime phase u in [0, 1]
  const curPlanetH = chartGeom.planetApexM * 4 * cycleProgress * (1 - cycleProgress);
  const curEarthH = chartGeom.earthApexM * 4 * cycleProgress * (1 - cycleProgress);
  const dotX = chartGeom.toX(cycleProgress);
  const dotPlanetY = chartGeom.toY(curPlanetH);
  const dotEarthY = chartGeom.toY(curEarthH);
  const apexX = chartGeom.toX(0.5);
  const apexPlanetY = chartGeom.toY(chartGeom.planetApexM);
  const apexEarthY = chartGeom.toY(chartGeom.earthApexM);

  return (
    <div className="holo-panel rounded-xl p-4 border border-cyan-500/35 relative shrink-0 overflow-visible">
      <div className="reticle-bracket-tl" />
      <div className="reticle-bracket-tr" />
      <div className="reticle-bracket-bl" />
      <div className="reticle-bracket-br" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/25 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-cyan-300 shrink-0" />
          <h3 className="font-orbitron text-[13px] font-bold text-cyan-100 tracking-wider uppercase">
            DYNAMIC GRAVITY SIMULATOR
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-200 bg-cyan-950/70 px-2.5 py-0.5 rounded border border-cyan-700/50">
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isEarthMode ? '9.81 m/s² (1.0x BASELINE)' : `G-ACCEL: ${planet.gravity} m/s²`}</span>
        </div>
      </div>

      {/* Smart Earth Reference Baseline Banner & Quick Comparison Dropdown */}
      {isEarthMode && (
        <div className="mb-3 p-2.5 rounded-lg bg-sky-950/50 border border-sky-400/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-emerald-500/25 text-emerald-200 border border-emerald-400/60 font-bold">
              1.0x REFERENCE BASELINE
            </span>
            <span className="text-slate-200">Earth: {EARTH_GRAVITY} m/s²</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono">
            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-300" />
            <label htmlFor="earth-gravity-compare" className="text-slate-300">
              VS:
            </label>
            <select
              id="earth-gravity-compare"
              value={comparePlanetId}
              onChange={(e) => setComparePlanetId(e.target.value)}
              className="bg-[#050b1d] border border-cyan-400/60 rounded px-2 py-1 text-xs text-cyan-100 font-semibold focus:outline-none focus:border-cyan-300 cursor-pointer"
            >
              <option value="mercury">Mercury (3.7 m/s²)</option>
              <option value="venus">Venus (8.87 m/s²)</option>
              <option value="moon">The Moon (1.62 m/s²)</option>
              <option value="mars">Mars (3.73 m/s²)</option>
              <option value="jupiter">Jupiter (24.79 m/s²)</option>
              <option value="europa">Europa (1.315 m/s²)</option>
              <option value="saturn">Saturn (10.44 m/s²)</option>
              <option value="uranus">Uranus (8.69 m/s²)</option>
              <option value="neptune">Neptune (11.15 m/s²)</option>
            </select>
          </div>
        </div>
      )}

      {/* Inputs for Mass and 1g Leap Height */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-cyan-500/25">
          <div className="flex justify-between items-center text-xs font-mono mb-1">
            <span className="text-slate-200 flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              MASS (m)
            </span>
            <span className="text-cyan-200 font-bold text-sm">{userWeight} kg</span>
          </div>
          <input
            type="range"
            min="20"
            max="150"
            step="1"
            value={userWeight}
            onChange={(e) => setUserWeight(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
            <span>20 kg</span>
            <span>75 kg</span>
            <span>150 kg</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-cyan-500/25">
          <div className="flex justify-between items-center text-xs font-mono mb-1">
            <span className="text-slate-200 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              1G LEAP
            </span>
            <span className="text-amber-200 font-bold text-sm">{jumpHeight} m</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.5"
            step="0.05"
            value={jumpHeight}
            onChange={(e) => setJumpHeight(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
            <span>0.2 m</span>
            <span>0.6 m</span>
            <span>1.2 m</span>
          </div>
        </div>
      </div>

      {/* SVG Parabolic Kinematic Jump Trajectory Graph (0% to 100% Airtime) */}
      <div className="relative mb-3 bg-[#040817]/95 rounded-lg border border-cyan-500/35 p-2 overflow-hidden">
        {/* Chart Top Header & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1 text-[10px] font-mono">
          <span className="text-cyan-200 font-bold tracking-wider">
            KINEMATIC JUMP TRAJECTORY
          </span>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="flex items-center gap-1 text-cyan-300 font-semibold">
              <span className="inline-block w-3.5 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full" />
              {activeTargetPlanet.id.toUpperCase()}
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <span className="inline-block w-3.5 border-t-2 border-dashed border-slate-300" />
              EARTH 1G
            </span>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${chartGeom.svgW} ${chartGeom.svgH}`}
          className="w-full h-auto block select-none"
          role="img"
          aria-label={`Parabolic jump trajectory comparing ${activeTargetPlanet.name} (${metrics.jumpHeightPlanetM} m) against Earth 1g (${metrics.jumpHeightEarthM} m)`}
        >
          <defs>
            <linearGradient id="orbitx-traj-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="orbitx-traj-fill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(0, 240, 255, 0.28)" />
              <stop offset="100%" stopColor="rgba(0, 240, 255, 0.01)" />
            </linearGradient>
            <filter id="orbitx-traj-glow" x="-15%" y="-15%" width="130%" height="130%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Horizontal Y-Axis Gridlines & Elevation Ticks */}
          {chartGeom.yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={chartGeom.padLeft}
                y1={tick.y}
                x2={chartGeom.svgW - chartGeom.padRight}
                y2={tick.y}
                stroke={idx === 0 ? 'rgba(0, 240, 255, 0.55)' : 'rgba(56, 189, 248, 0.14)'}
                strokeWidth={idx === 0 ? 1.4 : 1}
              />
              <text
                x={chartGeom.padLeft - 6}
                y={tick.y + 3}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
              >
                {tick.label}m
              </text>
            </g>
          ))}

          {/* Left Y-Axis Spine & HEIGHT (m) Label */}
          <line
            x1={chartGeom.padLeft}
            y1={chartGeom.padTop - 8}
            x2={chartGeom.padLeft}
            y2={chartGeom.baseY}
            stroke="rgba(0, 240, 255, 0.35)"
            strokeWidth="1"
          />
          <text
            x={10}
            y={(chartGeom.padTop + chartGeom.baseY) / 2}
            textAnchor="middle"
            fill="#67e8f9"
            fontSize="8.5"
            fontFamily="monospace"
            fontWeight="bold"
            transform={`rotate(-90 10 ${(chartGeom.padTop + chartGeom.baseY) / 2})`}
          >
            HEIGHT (m)
          </text>

          {/* 50% Airtime Apex Vertical Guide */}
          <line
            x1={apexX}
            y1={chartGeom.padTop - 4}
            x2={apexX}
            y2={chartGeom.baseY}
            stroke="rgba(168, 85, 247, 0.25)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Earth 1g Baseline Dashed Parabolic Reference Curve */}
          <path
            d={chartGeom.earthLinePath}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="2"
            strokeDasharray="5 4"
            opacity="0.78"
          />

          {/* Selected Planet Parabolic Trajectory Fill + Glowing Curve */}
          <path d={chartGeom.planetAreaPath} fill="url(#orbitx-traj-fill)" />
          <path
            d={chartGeom.planetLinePath}
            fill="none"
            stroke="url(#orbitx-traj-stroke)"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#orbitx-traj-glow)"
          />

          {/* Peak Apex Readout Pins */}
          <circle cx={apexX} cy={apexEarthY} r="3" fill="#e2e8f0" opacity="0.85" />
          <circle
            cx={apexX}
            cy={apexPlanetY}
            r="4"
            fill="#00f0ff"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          <rect
            x={apexX - 46}
            y={Math.max(4, apexPlanetY - 22)}
            width="92"
            height="15"
            rx="4"
            fill="#031224"
            stroke="rgba(0, 240, 255, 0.65)"
            strokeWidth="0.9"
          />
          <text
            x={apexX}
            y={Math.max(14, apexPlanetY - 12)}
            textAnchor="middle"
            fill="#67e8f9"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
          >
            APEX: {metrics.jumpHeightPlanetM} m
          </text>

          {/* Live Animated Kinematic Tracer Dots */}
          <circle cx={dotX} cy={dotEarthY} r="3.2" fill="#cbd5e1" opacity="0.85" />
          <line
            x1={dotX}
            y1={dotPlanetY}
            x2={dotX}
            y2={chartGeom.baseY}
            stroke="rgba(0, 240, 255, 0.35)"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <circle
            cx={dotX}
            cy={dotPlanetY}
            r="5.5"
            fill="#00f0ff"
            stroke="#040817"
            strokeWidth="1.5"
            filter="url(#orbitx-traj-glow)"
          />

          {/* X-Axis Airtime Labels (0% to 100%) */}
          <text
            x={chartGeom.toX(0)}
            y={chartGeom.baseY + 15}
            textAnchor="start"
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
          >
            0%
          </text>
          <text
            x={chartGeom.toX(0.5)}
            y={chartGeom.baseY + 15}
            textAnchor="middle"
            fill="#c084fc"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
          >
            50% AIRTIME
          </text>
          <text
            x={chartGeom.toX(1)}
            y={chartGeom.baseY + 15}
            textAnchor="end"
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
          >
            100% ({metrics.hangTimePlanetS}s)
          </text>
        </svg>
      </div>

      {/* Glowing Telemetry Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs mb-2.5">
        <div className="bg-slate-900/85 p-2.5 rounded-lg border border-cyan-500/30">
          <div className="text-slate-300 text-[10px]">
            {isEarthMode ? `${activeTargetPlanet.id.toUpperCase()} WEIGHT` : 'WEIGHT (W = m·g)'}
          </div>
          <div className="text-cyan-200 font-bold text-sm mt-0.5">
            {metrics.weightPlanetNewtons} N
          </div>
          <div className="text-[11px] text-cyan-300/90">
            {metrics.weightPlanetKg} kgf ({metrics.gravityRatio < 1
              ? `-${Math.round((1 - metrics.gravityRatio) * 100)}%`
              : `+${Math.round((metrics.gravityRatio - 1) * 100)}%`})
          </div>
        </div>

        <div className="bg-slate-900/85 p-2.5 rounded-lg border border-purple-500/30">
          <div className="text-slate-300 text-[10px]">
            {isEarthMode ? `${activeTargetPlanet.id.toUpperCase()} APEX` : 'JUMP APEX (h)'}
          </div>
          <div className="text-purple-200 font-bold text-sm mt-0.5">
            {metrics.jumpHeightPlanetM} m
          </div>
          <div className="text-[11px] text-purple-300/90">
            {(metrics.jumpHeightPlanetM / metrics.jumpHeightEarthM).toFixed(1)}x vs 1.0g
          </div>
        </div>

        <div className="bg-slate-900/85 p-2.5 rounded-lg border border-amber-500/30">
          <div className="text-slate-300 text-[10px]">AIRTIME</div>
          <div className="text-amber-200 font-bold text-sm mt-0.5">
            {metrics.hangTimePlanetS} s
          </div>
          <div className="text-[11px] text-amber-300/90">
            1.0g: {metrics.hangTimeEarthS}s
          </div>
        </div>

        <div className="bg-slate-900/85 p-2.5 rounded-lg border border-emerald-500/30">
          <div className="text-slate-300 text-[10px]">TAKEOFF WORK</div>
          <div className="text-emerald-200 font-bold text-sm mt-0.5">
            {metrics.kineticWorkJoules} J
          </div>
          <div className="text-[11px] text-emerald-300/90">
            v: {metrics.takeoffVelocityMs} m/s
          </div>
        </div>
      </div>

      {/* Grounded Physics Equations Note */}
      <div className="p-2 rounded-lg bg-[#040a1a]/90 border border-cyan-500/25 text-[11px] font-mono text-slate-200 flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong className="text-cyan-300">W = m · g</strong> ({userWeight}kg × {activeTargetPlanet.gravity} ={' '}
          <strong className="text-white">{metrics.weightPlanetNewtons} N</strong> vs 1g {metrics.weightEarthNewtons} N)
        </span>
        <span>
          <strong className="text-purple-300">h = v² / (2g)</strong> (idealized, vacuum)
        </span>
      </div>
    </div>
  );
};
