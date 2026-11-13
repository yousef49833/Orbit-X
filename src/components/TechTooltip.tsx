import React, { useState, useRef } from 'react';
import { getGlossaryEntry } from '../data/spaceTerminology';
import { SpaceGlossaryEntry } from '../types';
import { Info, Sparkles, Cpu, BookOpen } from 'lucide-react';

interface TechTooltipProps {
  term?: string;
  title?: string;
  definition?: string;
  category?: string;
  formulaOrMetric?: string;
  missionRelevance?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}

export const TechTooltip: React.FC<TechTooltipProps> = ({
  term,
  title: customTitle,
  definition: customDef,
  category: customCat,
  formulaOrMetric: customFormula,
  missionRelevance: customRelevance,
  position = 'top',
  children,
  className = '',
  delayMs = 180,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const entry: SpaceGlossaryEntry | undefined = term ? getGlossaryEntry(term) : undefined;
  const title = customTitle || entry?.title || term?.toUpperCase() || 'TECHNICAL DIRECTIVE';
  const definition = customDef || entry?.definition || 'Advanced orbital telemetry parameter.';
  const category = customCat || entry?.category || 'TELEMETRY';
  const formula = customFormula || entry?.formulaOrMetric;
  const relevance = customRelevance || entry?.missionRelevance;

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  // Position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'ASTRODYNAMICS':
        return 'text-purple-300 border-purple-500/50 bg-purple-950/70';
      case 'PROPULSION':
        return 'text-amber-300 border-amber-500/50 bg-amber-950/70';
      case 'LIFE_SUPPORT':
        return 'text-emerald-300 border-emerald-500/50 bg-emerald-950/70';
      case 'RADIATION':
        return 'text-red-300 border-red-500/50 bg-red-950/70';
      case 'GEOLOGY':
        return 'text-yellow-300 border-yellow-500/50 bg-yellow-950/70';
      case 'AVIONICS':
        return 'text-cyan-300 border-cyan-500/50 bg-cyan-950/70';
      default:
        return 'text-cyan-300 border-cyan-500/50 bg-cyan-950/70';
    }
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      {/* Holographic Tooltip Overlay */}
      {isVisible && (
        <div
          role="tooltip"
          className={`absolute ${getPositionClasses()} z-50 pointer-events-none w-72 sm:w-80 p-3 rounded-xl border border-cyan-400/60 bg-[#040816]/95 backdrop-blur-xl shadow-[0_0_25px_rgba(0,240,255,0.3)] font-mono animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Top Header with Category Badge */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-cyan-500/25">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span className="font-orbitron font-bold text-xs text-cyan-200 tracking-wide">
                {title}
              </span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase border ${getCategoryColor(
                category
              )}`}
            >
              {category}
            </span>
          </div>

          {/* Definition Body */}
          <p className="text-[11px] text-slate-200 leading-relaxed mb-2">{definition}</p>

          {/* Mission Relevance Note (if available) */}
          {relevance && (
            <div className="text-[9px] text-slate-400 mb-2 border-l-2 border-cyan-400/60 pl-2 italic">
              <span className="text-cyan-300 font-semibold not-italic">MISSION IMPACT: </span>
              {relevance}
            </div>
          )}

          {/* Formula or Telemetry Metric (if available) */}
          {formula && (
            <div className="bg-[#02050e] p-1.5 rounded-lg border border-cyan-500/30 text-[9px] text-cyan-300 flex items-center gap-1.5 overflow-x-auto">
              <Cpu className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="font-mono text-cyan-100">{formula}</span>
            </div>
          )}

          {/* Arrow / Pointer Indicator */}
          <div
            className={`absolute w-2 h-2 bg-[#040816] border-cyan-400/60 transform rotate-45 ${
              position === 'bottom'
                ? '-top-1 left-1/2 -translate-x-1/2 border-t border-l'
                : 'bottom-[-5px] left-1/2 -translate-x-1/2 border-b border-r'
            }`}
          />
        </div>
      )}
    </div>
  );
};
