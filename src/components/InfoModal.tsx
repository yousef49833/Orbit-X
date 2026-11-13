import React from 'react';
import { X, Award, Globe2, Layers, Clock, Rocket, MapPin, Bot, ExternalLink } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="holo-panel rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-cyan-400 p-6 relative shadow-[0_0_50px_rgba(0,240,255,0.3)] animate-in fade-in zoom-in-95 duration-200">
        <div className="reticle-bracket-tl" />
        <div className="reticle-bracket-tr" />
        <div className="reticle-bracket-bl" />
        <div className="reticle-bracket-br" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-400 text-cyan-300">
            <Award className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <h2 className="font-orbitron text-lg font-bold text-cyan-200 tracking-wider">
              ORBIT-X // ARCHITECTURAL DOSSIER
            </h2>
            <div className="text-xs font-mono text-cyan-400/80">
              NASA SPACE APPS CHALLENGE // "SPACE MISSION DESIGN GAME" // ORBIT-X
            </div>
          </div>
        </div>

        {/* Abstract */}
        <p className="text-xs text-slate-300 leading-relaxed mb-6">
          Orbit-X transforms complex open-source planetary datasets from NASA (InSight seismic profiles, MAVEN atmospheric measurements, Lunar Prospector, and Curiosity/Perseverance rover telemetry) into a gamified, holographic command laboratory.
        </p>

        {/* 5 Core Feature Breakdown */}
        <div className="space-y-3 mb-6 font-mono text-xs">
          <div className="p-3 rounded-lg bg-slate-900/80 border border-cyan-500/20">
            <div className="flex items-center gap-2 text-cyan-300 font-bold mb-1 font-orbitron">
              <Globe2 className="w-4 h-4 text-cyan-400" />
              <span>1. HOLOGRAPHIC SCENE & DIGITAL SCANLINE OVERLAY</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
              Three.js WebGL scene with emissive cyan (#00f0ff) and deep purple (#7000ff) shader wireframes, dynamic starfield, atmospheric halo, and pure CSS CRT horizontal scanlines simulating a radar terminal.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/80 border border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-300 font-bold mb-1 font-orbitron">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>2. CORE EXPLODED VIEW PROGRAMMATIC DELAMINATION</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
              Smooth lerping loops separate the planetary sphere into concentric geological shells (Crust, Mantle, Outer Core, Inner Core), projecting floating HTML HUD tags calibrated with NASA InSight seismic data.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/80 border border-cyan-500/20">
            <div className="flex items-center gap-2 text-cyan-300 font-bold mb-1 font-orbitron">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>3. COSMIC TIME MACHINE PROCEDURAL MORPHING</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
              Temporal scrubber (4.0 Billion Years Ago to Present Day) that procedurally interpolates planetary surface maps—transforming oceanic Noachian Mars into the modern hyper-arid red desert.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/80 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-300 font-bold mb-1 font-orbitron">
              <Rocket className="w-4 h-4 text-amber-400" />
              <span>4. DYNAMIC GRAVITY & KINEMATIC SIMULATOR</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
              Dynamic physical conversion of body weight and vertical leap across different celestial gravities (Earth 9.81 m/s², Mars 3.73 m/s², Moon 1.62 m/s²), visualized with a real-time parabolic flight canvas loop.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/80 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-emerald-300 font-bold mb-1 font-orbitron">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>5. SPACE ARCHAEOLOGY & OPTIMAL SETTLEMENT GRIDS</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
              Projects 2D vector coordinate pointers onto the 3D rotating planetary sphere coordinates (mapping longitude/latitude into Three.js Vector3 fields). Pinpoints Opportunity, Curiosity, Perseverance, and verified lunar/Martian landing grids.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/80 border border-blue-500/20">
            <div className="flex items-center gap-2 text-blue-300 font-bold mb-1 font-orbitron">
              <Bot className="w-4 h-4 text-blue-400" />
              <span>6. COMMANDER X // FLIGHT DIRECTOR</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
              Production telemetry interface streaming live mission context into a disciplined flight director briefing loop powered by the Orbit-X mission control core.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20 text-[11px] font-mono text-cyan-400/80">
          <span>ORBIT-X // PRODUCTION BUILD</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-400 hover:bg-cyan-500/30 transition-all font-bold"
          >
            ENTER SIMULATION LAB
          </button>
        </div>
      </div>
    </div>
  );
};
