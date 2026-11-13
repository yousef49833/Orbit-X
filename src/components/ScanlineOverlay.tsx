import React from 'react';

interface ScanlineOverlayProps {
  crtEnabled?: boolean;
}

export const ScanlineOverlay: React.FC<ScanlineOverlayProps> = ({ crtEnabled = true }) => {
  if (!crtEnabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* 1. High-frequency digital scanlines */}
      <div className="absolute inset-0 scanlines-overlay opacity-75" />

      {/* 2. Sweeping CRT beam */}
      <div className="absolute left-0 right-0 crt-beam-overlay" />

      {/* 3. CRT screen vignette & corner darkening */}
      <div className="absolute inset-0 crt-vignette" />

      {/* 4. Global HUD Corner Reticle Brackets */}
      <div className="hidden sm:block absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-cyan-400/60" />
      <div className="hidden sm:block absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-cyan-400/60" />
      <div className="hidden sm:block absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-cyan-400/60" />
      <div className="hidden sm:block absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-cyan-400/60" />
    </div>
  );
};
