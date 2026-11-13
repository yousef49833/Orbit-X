import React from 'react';
import { NASA_VISUAL_GALLERY } from '../data/nasaResearchData';
import { X, ExternalLink, Box, Sparkles, Image as ImageIcon, Globe2, Info } from 'lucide-react';

interface NasaVisualGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanetId: string;
  onSelectPlanet: (planetId: string) => void;
}

export const NasaVisualGalleryModal: React.FC<NasaVisualGalleryModalProps> = ({
  isOpen,
  onClose,
  currentPlanetId,
  onSelectPlanet,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="NASA 3D Planetary Visual Gallery"
    >
      <div className="holo-panel rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-cyan-400/70 relative shadow-[0_0_50px_rgba(0,240,255,0.28)] overflow-hidden">
        <div className="reticle-bracket-tl" />
        <div className="reticle-bracket-tr" />
        <div className="reticle-bracket-bl" />
        <div className="reticle-bracket-br" />

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-cyan-500/30 bg-[#04091a]/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-950/85 border border-cyan-400/60 shrink-0">
              <ImageIcon className="w-5 h-5 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-orbitron text-sm sm:text-lg font-bold text-cyan-100 tracking-wider truncate">
                {NASA_VISUAL_GALLERY.sectionTitle.toUpperCase()}
              </h2>
              <p className="text-[11px] sm:text-xs font-mono text-cyan-300/85 break-words">
                {NASA_VISUAL_GALLERY.purpose}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/70 shrink-0 transition-colors"
            aria-label="Close NASA Visual Gallery"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 holo-scrollbar">
          {/* Implementation Clarity Banner */}
          <div className="p-3 rounded-xl bg-[#050d22]/90 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-mono font-bold text-cyan-200">ASSET DISTINCTION: </span>
                <span>
                  Preview thumbnails below are still{' '}
                  <strong className="text-white">NASA Visualization / Spacecraft Imagery</strong>.
                  Interactive glTF/USDZ files and browser 3D views are linked under{' '}
                  <strong className="text-cyan-200">Official 3D Model Resources</strong>.
                </span>
              </div>
            </div>

            <a
              href={NASA_VISUAL_GALLERY.sharedInteractiveViewer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg bg-purple-600/30 hover:bg-purple-600/45 border border-purple-400/70 text-purple-100 text-xs font-mono font-bold flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>LAUNCH NASA EYES 3D</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* 3-Card Planetary Grid (Earth, Mars, Europa) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {NASA_VISUAL_GALLERY.assets.map((asset) => {
              const isSelectedBody = currentPlanetId === asset.planetId;

              return (
                <article
                  key={asset.assetId}
                  className={`rounded-xl border flex flex-col overflow-hidden bg-[#040919]/95 transition-all ${
                    isSelectedBody
                      ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.22)]'
                      : 'border-cyan-500/30 hover:border-cyan-400/70'
                  }`}
                >
                  {/* Preview Image Container */}
                  <div className="relative aspect-video bg-black overflow-hidden border-b border-cyan-500/25">
                    <img
                      src={asset.previewImage.url}
                      alt={asset.previewImage.altText}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-black/80 border border-cyan-400/50 text-[10px] font-mono text-cyan-200 backdrop-blur-sm">
                        NASA Visualization / Spacecraft Imagery
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 border border-slate-600/60 text-[10px] font-mono text-slate-200">
                      {asset.assetId} • {asset.objectType}
                      {asset.parentBody ? ` (${asset.parentBody})` : ''}
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="font-orbitron text-sm font-bold text-white tracking-wider">
                            {asset.name.toUpperCase()}
                          </h3>
                          <div className="text-[11px] font-mono text-cyan-300">
                            {asset.commonName}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPlanet(asset.planetId);
                            onClose();
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition-all shrink-0 flex items-center gap-1 ${
                            isSelectedBody
                              ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400'
                              : 'bg-cyan-950/80 text-cyan-200 border-cyan-500/50 hover:border-cyan-300'
                          }`}
                        >
                          <Globe2 className="w-3 h-3" />
                          <span>{isSelectedBody ? 'ACTIVE IN 3D' : 'FOCUS IN 3D'}</span>
                        </button>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed break-words">
                        {asset.roleInProject}
                      </p>

                      <div className="p-2 rounded bg-slate-900/90 border border-slate-700/80 text-[10px] font-mono text-slate-300 leading-snug break-words">
                        <strong className="text-cyan-300">IMAGE CREDIT: </strong>
                        {asset.previewImage.credit}
                      </div>
                    </div>

                    {/* Official 3D Model Resources Links */}
                    <div className="pt-2.5 border-t border-cyan-500/20 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                        <span className="text-amber-300 font-bold uppercase tracking-wider">
                          Official 3D Model Resources
                        </span>
                        <span className="text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                          {asset.nasa3dModel.availableDownloadFormats.join(' / ')}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <a
                          href={asset.nasa3dModel.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/70 text-cyan-100 text-xs font-mono font-semibold flex items-center justify-between gap-2 transition-all"
                        >
                          <span className="flex items-center gap-1.5 min-w-0 truncate">
                            <Box className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                            <span className="truncate">View Official NASA 3D Model</span>
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>

                        <a
                          href={asset.sharedViewerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full px-3 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900/70 border border-purple-500/60 text-purple-100 text-xs font-mono font-semibold flex items-center justify-between gap-2 transition-all"
                        >
                          <span className="flex items-center gap-1.5 min-w-0 truncate">
                            <Sparkles className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                            <span className="truncate">Launch NASA Eyes 3D</span>
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      </div>

                      <div className="text-[10px] text-slate-400 leading-tight">
                        {asset.nasa3dModel.downloadNote} ({asset.nasa3dModel.providerCredit})
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
