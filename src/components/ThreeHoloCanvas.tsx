import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PlanetData, SurfaceMarker, GeologicalLayer, PlanetaryFeatureVisibility } from '../types';
import { latLonToVector3 } from '../utils/physics';
import {
  generateProceduralPlanetTexture,
  generateProceduralBumpTexture,
  generateProceduralRingTexture,
  generateProceduralNightLightsTexture,
  NASA_SURFACE_TEXTURE_URLS,
  loadExternalTextureSafe,
  buildEarthRoughnessMapFromSpecular,
} from '../utils/textureGenerator';
import { holoAudio } from '../utils/audioSynthesizer';
import { HoloFeatureLegend } from './HoloFeatureLegend';
import { TechTooltip } from './TechTooltip';
import {
  Layers,
  RotateCcw,
  RotateCw,
  Wind,
  Keyboard,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Headset,
  Minimize2,
  Sun,
  Moon,
  Orbit,
  Grid3x3,
  Globe,
  Scan,
} from 'lucide-react';

const PLANET_RADIUS = 2.0;
const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 1.8, 8.2);
const DEFAULT_CAMERA_DISTANCE = DEFAULT_CAMERA_POS.length();
const MIN_ZOOM_DISTANCE = 2.6;
const MAX_ZOOM_DISTANCE = 14.0;

/**
 * Generates a soft circular radial-gradient sprite texture for THREE.Points starfields
 * so stars render as crisp glowing points with subtle halos rather than flat squares.
 */
function createStarSpriteTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const center = size / 2;
    const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.16, 'rgba(242, 249, 255, 0.92)');
    grad.addColorStop(0.42, 'rgba(185, 224, 255, 0.34)');
    grad.addColorStop(0.74, 'rgba(120, 185, 255, 0.08)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Official NASA / JPL 3D glTF Binary (.glb) model paths (served from /public/models/).
 * Preflight check validates non-HTML content-type so missing local models silently use high-res procedural spheres.
 */
const NASA_GLB_MODEL_PATHS: Record<string, string> = {
  mercury: '/models/Mercury_1_4878.glb',
  venus: '/models/Venus_1_12103.glb',
  earth: '/models/Earth_1_12756.glb',
  moon: '/models/Moon_1_3474.glb',
  mars: '/models/24881_Mars_1_6792.glb',
  jupiter: '/models/Jupiter_1_142984.glb',
  europa: '/models/Europa_1_3138.glb',
  saturn: '/models/Saturn_1_120536.glb',
  uranus: '/models/Uranus_1_51118.glb',
  neptune: '/models/Neptune_1_49528.glb',
};

const glbAvailabilityCache = new Map<string, boolean>();
let sharedGltfLoader: GLTFLoader | null = null;

async function checkGlbModelAvailable(url: string): Promise<boolean> {
  if (glbAvailabilityCache.has(url)) {
    return glbAvailabilityCache.get(url)!;
  }
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const valid = res.ok && !ct.includes('text/html');
    glbAvailabilityCache.set(url, valid);
    return valid;
  } catch {
    glbAvailabilityCache.set(url, false);
    return false;
  }
}

interface ThreeHoloCanvasProps {
  planet: PlanetData;
  timeSliderValue: number; // 0 to 100
  explodedView: boolean;
  onToggleExplodedView: () => void;
  selectedMarker: SurfaceMarker | null;
  onSelectMarker: (marker: SurfaceMarker | null) => void;
  onSelectLayer: (layer: GeologicalLayer | null) => void;
  selectedLayer: GeologicalLayer | null;
  showAtmosphericRing?: boolean;
  onToggleAtmosphericRing?: () => void;
  featureVisibility: PlanetaryFeatureVisibility;
  onChangeFeatureVisibility: React.Dispatch<React.SetStateAction<PlanetaryFeatureVisibility>>;
  surfaceRenderMode: 'nasa' | 'wireframe';
  onChangeSurfaceRenderMode: (mode: 'nasa' | 'wireframe') => void;
  onRegisterCapture?: (captureFn: (() => void) | null) => void;
}

interface ProjectedMarker {
  marker: SurfaceMarker;
  screenX: number;
  screenY: number;
  visible: boolean;
}

interface ProjectedLayerHUD {
  layer: GeologicalLayer;
  anchorX: number;
  anchorY: number;
  screenX: number;
  screenY: number;
  placement: 'above' | 'below';
  visible: boolean;
  distanceOffset: number;
}

export const ThreeHoloCanvas: React.FC<ThreeHoloCanvasProps> = ({
  planet,
  timeSliderValue,
  explodedView,
  onToggleExplodedView,
  selectedMarker,
  onSelectMarker,
  onSelectLayer,
  selectedLayer,
  showAtmosphericRing,
  onToggleAtmosphericRing,
  featureVisibility,
  onChangeFeatureVisibility,
  surfaceRenderMode,
  onChangeSurfaceRenderMode,
  onRegisterCapture,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const planetGroupRef = useRef<THREE.Group | null>(null);
  const planetAnchorGroupRef = useRef<THREE.Group | null>(null);
  const mainPlanetMeshRef = useRef<THREE.Mesh | null>(null);
  const glbModelGroupRef = useRef<THREE.Group | null>(null);
  const glbLoadedRef = useRef<boolean>(false);
  const glbLoadTokenRef = useRef<number>(0);
  const wireframeCageMeshRef = useRef<THREE.Mesh | null>(null);
  const innerHoloCoreRef = useRef<THREE.Mesh | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphericRingGroupRef = useRef<THREE.Group | null>(null);
  const layerMeshesRef = useRef<THREE.Mesh[]>([]);
  const markerObjectsRef = useRef<{ id: string; group: THREE.Group; worldPos: THREE.Vector3 }[]>([]);
  const tectonicPlatesGroupRef = useRef<THREE.Group | null>(null);
  const magneticFieldGroupRef = useRef<THREE.Group | null>(null);
  const orbitGridGroupRef = useRef<THREE.Group | null>(null);
  const planetaryRingGroupRef = useRef<THREE.Group | null>(null);
  const planetaryRingMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudMeshRef = useRef<THREE.Mesh | null>(null);
  const nightLightsMeshRef = useRef<THREE.Mesh | null>(null);
  const scanSweepGroupRef = useRef<THREE.Group | null>(null);
  const scanSweepActiveRef = useRef<boolean>(false);
  const scanSweepProgressRef = useRef<number>(0);
  const textureRequestTokenRef = useRef<string>('');
  const timeSliderValueRef = useRef<number>(timeSliderValue);
  useEffect(() => {
    timeSliderValueRef.current = timeSliderValue;
  }, [timeSliderValue]);

  // Dynamic Sun-Position Lighting: 'lit' | 'shadow' | 'orbit'
  const [sunLightingMode, setSunLightingMode] = useState<'lit' | 'shadow' | 'orbit'>('lit');
  const sunLightingModeRef = useRef<'lit' | 'shadow' | 'orbit'>(sunLightingMode);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null);
  const sunAngleRef = useRef<number>(0);

  // Satellite Terrain Scanline Sweep State
  const [scanlineSweepData, setScanlineSweepData] = useState<{
    active: boolean;
    markerName: string;
    elevationM: number;
    slopeDeg: number;
    progress: number;
  } | null>(null);

  // HUD Snapshot Toast notification
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);

  useEffect(() => {
    sunLightingModeRef.current = sunLightingMode;
  }, [sunLightingMode]);

  // Atmospheric Ring state (internal fallback if not controlled)
  const [internalShowRing, setInternalShowRing] = useState<boolean>(true);
  const showRing = showAtmosphericRing !== undefined ? showAtmosphericRing : internalShowRing;
  const toggleRing = onToggleAtmosphericRing || (() => setInternalShowRing((prev) => !prev));
  const showRingRef = useRef<boolean>(showRing);
  useEffect(() => {
    showRingRef.current = showRing;
  }, [showRing]);

  // Auto-Rotate state
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const featureVisibilityRef = useRef<PlanetaryFeatureVisibility>(featureVisibility);
  const surfaceRenderModeRef = useRef<'nasa' | 'wireframe'>(surfaceRenderMode);

  // Post-Processing UnrealBloomPass state (Balanced low glow so NASA textures & Saturn rings stay crisp)
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const [bloomEnabled, setBloomEnabled] = useState<boolean>(true);
  const [bloomStrength] = useState<number>(0.18);

  // 4-Way Symmetrical Pyramid Hologram Mode
  const [isFourWayHolo, setIsFourWayHolo] = useState<boolean>(false);
  const isFourWayHoloRef = useRef<boolean>(false);
  const holoCamRef = useRef<THREE.PerspectiveCamera | null>(null);
  const starFieldGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    isFourWayHoloRef.current = isFourWayHolo;
    if (controlsRef.current) {
      controlsRef.current.enabled = !isFourWayHolo;
    }
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(isFourWayHolo ? 0x000000 : 0x040612);
    }
    if (starFieldGroupRef.current) {
      starFieldGroupRef.current.visible = !isFourWayHolo;
    }
    if (orbitGridGroupRef.current) {
      orbitGridGroupRef.current.visible = !isFourWayHolo && featureVisibilityRef.current.orbitalRadar;
    }
    if (planetGroupRef.current) {
      planetGroupRef.current.scale.setScalar(isFourWayHolo ? 0.95 : 1);
    }
    if (!isFourWayHolo && rendererRef.current && containerRef.current) {
      const w = containerRef.current.clientWidth || 800;
      const h = containerRef.current.clientHeight || 600;
      rendererRef.current.setScissorTest(false);
      rendererRef.current.setViewport(0, 0, w, h);
    }
  }, [isFourWayHolo]);

  // WebXR and 1:1 Scale Inspection state
  const [isVRActive, setIsVRActive] = useState<boolean>(false);
  const [isScaleInspectionActive, setIsScaleInspectionActive] = useState<boolean>(false);
  const [isVRSupported, setIsVRSupported] = useState<boolean | null>(null);

  // Keyboard shortcut tactile exploration state
  const activeKeysRef = useRef<Set<string>>(new Set());
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);

  // Projected 2D screen positions for HTML overlays
  const [projectedMarkers, setProjectedMarkers] = useState<ProjectedMarker[]>([]);
  const [projectedLayerHUDs, setProjectedLayerHUDs] = useState<ProjectedLayerHUD[]>([]);

  // Animation values for smooth exploding lerp
  const explodeFactorRef = useRef<number>(0);
  const targetExplodeFactorRef = useRef<number>(0);

  // Auto-rotate & Camera Marker Focus State
  const autoRotateRef = useRef<boolean>(true);
  const targetFocusLocalDirRef = useRef<THREE.Vector3 | null>(null);

  // Sync feature visibility
  useEffect(() => {
    featureVisibilityRef.current = featureVisibility;
    if (tectonicPlatesGroupRef.current) {
      tectonicPlatesGroupRef.current.visible = featureVisibility.tectonicPlates && explodeFactorRef.current < 0.35;
    }
    if (magneticFieldGroupRef.current) {
      magneticFieldGroupRef.current.visible = featureVisibility.magneticField && explodeFactorRef.current < 0.45;
    }
    if (orbitGridGroupRef.current) {
      orbitGridGroupRef.current.visible = !isFourWayHoloRef.current && featureVisibility.orbitalRadar;
    }
    if (atmosphereMeshRef.current) {
      atmosphereMeshRef.current.visible = featureVisibility.atmosphere && explodeFactorRef.current < 0.3;
    }
    if (cloudMeshRef.current) {
      cloudMeshRef.current.visible =
        surfaceRenderModeRef.current === 'nasa' && explodeFactorRef.current < 0.3;
    }
    if (planetaryRingGroupRef.current) {
      const useGlbRing = glbLoadedRef.current && surfaceRenderModeRef.current === 'nasa' && timeSliderValueRef.current >= 80 && explodeFactorRef.current < 0.05;
      planetaryRingGroupRef.current.visible =
        !useGlbRing &&
        (planet.id === 'saturn' || planet.id === 'uranus') &&
        Boolean(planet.hasPlanetaryRings) &&
        featureVisibility.planetaryRings !== false &&
        explodeFactorRef.current < 0.35;
    }
    markerObjectsRef.current.forEach((item) => {
      item.group.visible = featureVisibility.surfaceMarkers;
    });
  }, [featureVisibility, showRing, planet.id, planet.hasPlanetaryRings]);

  // Sync surface render mode ('nasa' vs 'wireframe') smoothly without rebuilding scene
  const applySurfaceRenderMode = useCallback((mode: 'nasa' | 'wireframe') => {
    if (mainPlanetMeshRef.current) {
      const mat = mainPlanetMeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        if (mode === 'wireframe') {
          mat.wireframe = true;
          mat.emissive.setHex(0x00c8ff);
          mat.emissiveIntensity = 0.45;
          mat.roughness = 0.35;
        } else {
          mat.wireframe = false;
          mat.emissive.setHex(0x001a28);
          mat.emissiveIntensity = 0.03;
          mat.roughness = 0.88;
        }
        mat.needsUpdate = true;
      }
    }

    if (wireframeCageMeshRef.current) {
      const cageMat = wireframeCageMeshRef.current.material as THREE.MeshBasicMaterial;
      if (cageMat) {
        cageMat.opacity = mode === 'wireframe' ? 0.52 : 0.03;
        cageMat.needsUpdate = true;
      }
    }

    if (innerHoloCoreRef.current) {
      innerHoloCoreRef.current.visible = mode === 'wireframe';
    }

    if (cloudMeshRef.current) {
      cloudMeshRef.current.visible = mode === 'nasa' && explodeFactorRef.current < 0.3;
    }

    if (planetaryRingMeshRef.current) {
      const ringMat = planetaryRingMeshRef.current.material as THREE.MeshStandardMaterial;
      if (ringMat) {
        if (mode === 'wireframe') {
          ringMat.wireframe = true;
          ringMat.emissiveIntensity = 0.45;
        } else {
          ringMat.wireframe = false;
          ringMat.emissiveIntensity = 0.08;
        }
        ringMat.needsUpdate = true;
      }
    }

    const useGlb =
      glbLoadedRef.current &&
      mode === 'nasa' &&
      explodeFactorRef.current < 0.05 &&
      timeSliderValueRef.current >= 80;
    if (glbModelGroupRef.current) {
      glbModelGroupRef.current.visible = useGlb;
    }
    if (mainPlanetMeshRef.current) {
      mainPlanetMeshRef.current.visible = !useGlb;
    }
  }, []);

  useEffect(() => {
    surfaceRenderModeRef.current = surfaceRenderMode;
    applySurfaceRenderMode(surfaceRenderMode);
  }, [surfaceRenderMode, applySurfaceRenderMode]);

  useEffect(() => {
    autoRotateRef.current = isAutoRotating;
  }, [isAutoRotating]);

  const handleToggleAutoRotate = () => {
    setIsAutoRotating((prev) => !prev);
  };

  const handleToggleFeature = (key: keyof PlanetaryFeatureVisibility) => {
    onChangeFeatureVisibility((prev) => ({
      ...prev,
      [key]: prev[key] === false ? true : !prev[key],
    }));
  };

  const handleToggleAllFeatures = (visible: boolean) => {
    onChangeFeatureVisibility({
      atmosphere: visible,
      tectonicPlates: visible,
      magneticField: visible,
      surfaceMarkers: visible,
      orbitalRadar: visible,
      coreShells: visible,
      planetaryRings: visible,
    });
  };

  // Check WebXR device capability on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'xr' in navigator && (navigator as any).xr) {
      (navigator as any).xr
        .isSessionSupported('immersive-vr')
        .then((supported: boolean) => {
          setIsVRSupported(supported);
        })
        .catch(() => {
          setIsVRSupported(false);
        });
    } else {
      setIsVRSupported(false);
    }
  }, []);

  // Sync bloom strength adjustments with UnrealBloomPass instance
  useEffect(() => {
    if (bloomPassRef.current) {
      bloomPassRef.current.strength = bloomEnabled ? bloomStrength : 0;
    }
  }, [bloomEnabled, bloomStrength]);

  // Update target explode factor
  useEffect(() => {
    targetExplodeFactorRef.current = explodedView ? 1 : 0;
  }, [explodedView]);

  // Trigger Satellite Terrain Scanline Sweep & smoothly orbit camera onto selected marker
  useEffect(() => {
    if (!selectedMarker) {
      scanSweepActiveRef.current = false;
      targetFocusLocalDirRef.current = null;
      if (scanSweepGroupRef.current) scanSweepGroupRef.current.visible = false;
      setScanlineSweepData(null);
      return;
    }

    const p = latLonToVector3(selectedMarker.lat, selectedMarker.lon, 1);
    targetFocusLocalDirRef.current = new THREE.Vector3(p.x, p.y, p.z).normalize();
    autoRotateRef.current = false;
    setIsAutoRotating(false);

    scanSweepProgressRef.current = 0;
    scanSweepActiveRef.current = true;
    if (scanSweepGroupRef.current) {
      scanSweepGroupRef.current.visible = true;
    }
    holoAudio.playScanSweepSound();

    // Deterministic terrain telemetry derived from coordinates & suitability index
    const elevationM = Math.round(((selectedMarker.lat * 73 + selectedMarker.lon * 41) % 3200) - 800);
    const slopeDeg = Number((10 - selectedMarker.safetyScore * 0.08).toFixed(1));
    setScanlineSweepData({
      active: true,
      markerName: selectedMarker.name,
      elevationM,
      slopeDeg: Math.max(0.4, slopeDeg),
      progress: 0,
    });
  }, [selectedMarker]);

  // Register PNG Screenshot Capture Callback (includes holographic overlay watermark)
  const handleCapturePng = useCallback(() => {
    const renderer = rendererRef.current;
    const composer = composerRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    // Force an immediate render frame so buffer is fresh (skip single-cam override in 4-way mode)
    if (!isFourWayHoloRef.current) {
      if (bloomEnabled && composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    }

    const webglCanvas = renderer.domElement;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = webglCanvas.width;
    exportCanvas.height = webglCanvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw WebGL 3D render
    ctx.drawImage(webglCanvas, 0, 0);

    // 2. Composite subtle holographic CRT scanlines & HUD overlay frame
    const w = exportCanvas.width;
    const h = exportCanvas.height;

    ctx.fillStyle = 'rgba(0, 240, 255, 0.03)';
    for (let y = 0; y < h; y += 6) {
      ctx.fillRect(0, y, w, 2);
    }

    // Outer HUD bracket border
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    // Holographic corner ticks
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 20px Orbitron, monospace';
    ctx.fillText(`ORBIT-X // ${planet.name.toUpperCase()} MISSION CAPTURE`, 36, 52);

    ctx.fillStyle = 'rgba(186, 230, 253, 0.85)';
    ctx.font = '14px monospace';
    ctx.fillText(
      `GRAVITY: ${planet.gravity} m/s²  |  MODE: ${surfaceRenderModeRef.current.toUpperCase()}  |  TIME: ${timeSliderValue}%  |  ${new Date().toISOString()}`,
      36,
      h - 34
    );

    if (selectedMarker) {
      ctx.fillStyle = '#00ff88';
      ctx.fillText(`LOCKED SITE: ${selectedMarker.name.toUpperCase()} (${selectedMarker.lat}°, ${selectedMarker.lon}°)`, 36, 78);
    }

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `cosmoholo-${planet.id}-mission-capture-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    holoAudio.playCameraShutterSound();
    setSnapshotToast(`PNG CAPTURED // ${planet.name.toUpperCase()}`);
    setTimeout(() => setSnapshotToast(null), 2800);
  }, [planet, bloomEnabled, timeSliderValue, selectedMarker]);

  useEffect(() => {
    if (onRegisterCapture) {
      onRegisterCapture(handleCapturePng);
      return () => onRegisterCapture(null);
    }
  }, [onRegisterCapture, handleCapturePng]);

  // Helper: Upgrade present-day planet material to real NASA equirectangular textures + bump/normal/cloud maps
  const applyRealNasaSurfaceTextures = useCallback(
    async (planetId: string, timeVal: number) => {
      const mesh = mainPlanetMeshRef.current;
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat) return;

      const token = `${planetId}:${timeVal >= 80 ? 'nasa' : 'epoch'}`;
      textureRequestTokenRef.current = token;

      // In ancient Cosmic Time Machine states (< 80%), use epoch-accurate procedural oceans / magma textures
      if (timeVal < 80) {
        const procMap = generateProceduralPlanetTexture(planetId, timeVal);
        const procBump = generateProceduralBumpTexture(planetId);
        if (textureRequestTokenRef.current !== token) return;
        mat.map = procMap;
        mat.bumpMap = procBump;
        mat.bumpScale = planetId === 'saturn' ? 0.02 : 0.1;
        mat.normalMap = null;
        mat.roughnessMap = null;
        mat.roughness = planetId === 'earth' ? 0.72 : 0.88;
        mat.needsUpdate = true;
        return;
      }

      if (planetId === 'earth') {
        const [earthMap, earthNormal, earthSpec, earthClouds] = await Promise.all([
          loadExternalTextureSafe(NASA_SURFACE_TEXTURE_URLS.earth.map, { srgb: true }),
          loadExternalTextureSafe(NASA_SURFACE_TEXTURE_URLS.earth.normalMap, { srgb: false }),
          loadExternalTextureSafe(NASA_SURFACE_TEXTURE_URLS.earth.specularMap, { srgb: false }),
          loadExternalTextureSafe(NASA_SURFACE_TEXTURE_URLS.earth.cloudsMap, { srgb: true }),
        ]);
        if (textureRequestTokenRef.current !== token || !mainPlanetMeshRef.current) return;
        if (earthMap) mat.map = earthMap;
        if (earthNormal) {
          mat.normalMap = earthNormal;
          mat.normalScale.set(0.85, 0.85);
        }
        if (earthSpec) {
          const roughTex = buildEarthRoughnessMapFromSpecular(earthSpec);
          if (roughTex) {
            mat.roughnessMap = roughTex;
            mat.roughness = 1.0;
          } else {
            mat.bumpMap = earthSpec;
            mat.bumpScale = 0.05;
          }
        }
        mat.needsUpdate = true;

        if (earthClouds && cloudMeshRef.current) {
          const cMat = cloudMeshRef.current.material as THREE.MeshStandardMaterial;
          if (cMat) {
            cMat.map = earthClouds;
            cMat.alphaMap = earthClouds;
            cMat.opacity = 0.58;
            cMat.needsUpdate = true;
          }
        }
      } else if (planetId === 'moon') {
        const moonMap = await loadExternalTextureSafe(NASA_SURFACE_TEXTURE_URLS.moon.map, { srgb: true });
        if (textureRequestTokenRef.current !== token || !mainPlanetMeshRef.current) return;
        if (moonMap) {
          mat.map = moonMap;
          mat.bumpMap = moonMap;
          mat.bumpScale = 0.14;
          mat.needsUpdate = true;
        }
      } else if (planetId === 'mars') {
        const marsMap = await loadExternalTextureSafe(NASA_SURFACE_TEXTURE_URLS.mars.map, { srgb: true });
        if (textureRequestTokenRef.current !== token || !mainPlanetMeshRef.current) return;
        if (marsMap) {
          mat.map = marsMap;
          mat.bumpScale = 0.12;
          mat.needsUpdate = true;
        }
      } else if (planetId === 'europa') {
        const europaMap = await loadExternalTextureSafe(NASA_SURFACE_TEXTURE_URLS.europa.map, { srgb: true });
        if (textureRequestTokenRef.current !== token || !mainPlanetMeshRef.current) return;
        if (europaMap) {
          mat.map = europaMap;
          mat.bumpScale = 0.08;
          mat.roughness = 0.65;
          mat.needsUpdate = true;
        }
      } else if (planetId === 'saturn') {
        const [saturnMap, saturnRingMap] = await Promise.all([
          loadExternalTextureSafe(NASA_SURFACE_TEXTURE_URLS.saturn.map, { srgb: true }),
          loadExternalTextureSafe(NASA_SURFACE_TEXTURE_URLS.saturn.ringMap, { srgb: true }),
        ]);
        if (textureRequestTokenRef.current !== token || !mainPlanetMeshRef.current) return;
        if (saturnMap) {
          mat.map = saturnMap;
          mat.bumpScale = 0.02;
          mat.needsUpdate = true;
        }
        if (saturnRingMap && planetaryRingMeshRef.current) {
          const rMat = planetaryRingMeshRef.current.material as THREE.MeshStandardMaterial;
          if (rMat) {
            rMat.map = saturnRingMap;
            rMat.emissiveMap = saturnRingMap;
            rMat.needsUpdate = true;
          }
        }
      }
    },
    []
  );

  // Handle Texture & Atmosphere Shader Update when planet or time slider changes
  useEffect(() => {
    if (!mainPlanetMeshRef.current) return;
    applyRealNasaSurfaceTextures(planet.id, timeSliderValue);

    // Dynamically modulate atmospheric Fresnel halo across cosmic eras
    const eras = planet.eras;
    if (eras && eras.length > 0) {
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
      const eraPressure =
        left.atmosphericPressureBar + (right.atmosphericPressureBar - left.atmosphericPressureBar) * localT;

      const baseColor = new THREE.Color(planet.atmosphereRingColor || '#00f0ff');
      const ancientColor = new THREE.Color(left.primaryColor || planet.atmosphereRingColor || '#00f0ff');
      const blendedColor = ancientColor.lerp(baseColor, localT * 0.6 + 0.4);

      if (atmosphereMeshRef.current) {
        const atmoMat = atmosphereMeshRef.current.material as THREE.ShaderMaterial;
        if (atmoMat?.uniforms?.glowColor) {
          atmoMat.uniforms.glowColor.value.copy(blendedColor);
          atmoMat.uniforms.intensity.value = Math.min(0.85, 0.25 + Math.min(1, eraPressure) * 0.5);
        }
      }
    }
  }, [planet.id, planet.eras, planet.atmosphereRingColor, timeSliderValue, applyRealNasaSurfaceTextures]);

  // Main Scene Initialization
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene with deep space backdrop (pitch black #000000 when 4-Way Holo is active)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isFourWayHoloRef.current ? 0x000000 : 0x040612);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 1000);
    camera.position.copy(DEFAULT_CAMERA_POS);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const holoCam = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
    holoCamRef.current = holoCam;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.xr.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3a. OrbitControls with Damped Free-Zoom (minDistance: 2.6, maxDistance: 14) & Mobile Pinch
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = MIN_ZOOM_DISTANCE;
    controls.maxDistance = MAX_ZOOM_DISTANCE;
    controls.rotateSpeed = 0.72;
    controls.zoomSpeed = 0.95;
    controls.target.set(0, 0, 0);
    controls.enabled = !isFourWayHoloRef.current;
    controls.update();
    controlsRef.current = controls;

    const onControlsStart = () => {
      autoRotateRef.current = false;
      setIsAutoRotating(false);
      targetFocusLocalDirRef.current = null;
    };
    controls.addEventListener('start', onControlsStart);

    // 3b. Balanced Post-Processing UnrealBloomPass (High threshold so planetary textures stay crisp & vibrant)
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      bloomStrength, // 0.18 subtle bloom
      0.24,          // tight radius
      0.85           // high threshold so beacons glow without washing out planet colors
    );
    bloomPassRef.current = bloomPass;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // 4. Vibrant Three-Point PBR Space Lighting (Normal view vs. boosted uniform lighting in 4-Way Holo)
    const SINGLE_AMBIENT_INTENSITY = 0.62;
    const SINGLE_HEMI_INTENSITY = 0.56;
    const SINGLE_SUN_INTENSITY = 2.15;
    const SINGLE_FILL_INTENSITY = 0.48;

    const ambientLight = new THREE.AmbientLight(0x50688a, SINGLE_AMBIENT_INTENSITY);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, SINGLE_HEMI_INTENSITY);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xfff8ee, SINGLE_SUN_INTENSITY);
    sunLight.position.set(10, 6, 10);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Soft cool fill light so relief, craters, and cloud bands on terminator sides retain crisp color
    const fillLight = new THREE.DirectionalLight(0x7dd3fc, SINGLE_FILL_INTENSITY);
    fillLight.position.set(-9, -4, 6);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    // Subtle sci-fi cyan rim light on back limb
    const holoRimLight = new THREE.DirectionalLight(0x38bdf8, 0.38);
    holoRimLight.position.set(-10, 5, -9);
    scene.add(holoRimLight);

    // Subtle deep purple under-glow
    const holoPurpleLight = new THREE.PointLight(0x7000ff, 0.32, 26);
    holoPurpleLight.position.set(0, -8, 2);
    scene.add(holoPurpleLight);

    // 5. Realistic Multi-Layer Glowing Circular Sprite Starfield (Zero Square Pixels)
    const starSpriteTexture = createStarSpriteTexture();
    const starFieldGroup = new THREE.Group();
    starFieldGroup.visible = !isFourWayHoloRef.current;
    starFieldGroupRef.current = starFieldGroup;
    scene.add(starFieldGroup);

    const starLayersConfig = [
      { count: 1400, size: 0.48, minR: 75, maxR: 185, opacity: 0.78 },
      { count: 480, size: 0.92, minR: 52, maxR: 140, opacity: 0.92 },
      { count: 130, size: 1.65, minR: 38, maxR: 110, opacity: 0.95 },
    ];

    const starLayers: THREE.Points[] = [];
    const starMaterials: THREE.PointsMaterial[] = [];
    const starGeometries: THREE.BufferGeometry[] = [];

    starLayersConfig.forEach((cfg) => {
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array(cfg.count * 3);
      const colors = new Float32Array(cfg.count * 3);

      for (let i = 0; i < cfg.count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = cfg.minR + Math.random() * (cfg.maxR - cfg.minR);

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // Realistic stellar spectral tints: blue-white, pure white, soft cyan, and warm gold/amber
        const roll = Math.random();
        if (roll < 0.32) {
          // O/B blue-white stars
          colors[i * 3] = 0.75;
          colors[i * 3 + 1] = 0.88;
          colors[i * 3 + 2] = 1.0;
        } else if (roll < 0.56) {
          // Pure white stars
          colors[i * 3] = 0.98;
          colors[i * 3 + 1] = 0.98;
          colors[i * 3 + 2] = 1.0;
        } else if (roll < 0.8) {
          // Warm G/K gold stars
          colors[i * 3] = 1.0;
          colors[i * 3 + 1] = 0.88;
          colors[i * 3 + 2] = 0.68;
        } else {
          // Pale ice-cyan nebula glint stars
          colors[i * 3] = 0.52;
          colors[i * 3 + 1] = 0.94;
          colors[i * 3 + 2] = 1.0;
        }
      }

      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: cfg.size,
        map: starSpriteTexture,
        vertexColors: true,
        transparent: true,
        opacity: cfg.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        alphaTest: 0.005,
        sizeAttenuation: true,
      });

      const points = new THREE.Points(geom, mat);
      starFieldGroup.add(points);
      starLayers.push(points);
      starMaterials.push(mat);
      starGeometries.push(geom);
    });

    // 6. Holographic Equatorial Orbit Rings & Solar Ray Vectors
    const orbitGridGroup = new THREE.Group();
    const ringMatCyan = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    });
    const ringGeom = new THREE.TorusGeometry(PLANET_RADIUS * 1.45, 0.012, 8, 96);
    const ring1 = new THREE.Mesh(ringGeom, ringMatCyan);
    ring1.rotation.x = Math.PI / 2;
    orbitGridGroup.add(ring1);

    const ringMatPurple = new THREE.MeshBasicMaterial({
      color: 0x7000ff,
      wireframe: true,
      transparent: true,
      opacity: 0.13,
    });
    const ring2 = new THREE.Mesh(ringGeom, ringMatPurple);
    ring2.rotation.y = Math.PI / 3;
    ring2.rotation.x = Math.PI / 4;
    orbitGridGroup.add(ring2);

    // Solar Ray Vector Beams (toggled with Orbital Grid & Solar Rays)
    const solarRayMat = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.22,
    });
    [-0.8, 0, 0.8].forEach((yOff) => {
      [-0.6, 0.6].forEach((zOff) => {
        const rayPts = [
          new THREE.Vector3(6.2, yOff * 1.1 + 1.4, zOff * 1.6 + 2.6),
          new THREE.Vector3(2.4, yOff * 0.5, zOff * 0.6),
        ];
        const rayGeom = new THREE.BufferGeometry().setFromPoints(rayPts);
        orbitGridGroup.add(new THREE.Line(rayGeom, solarRayMat));
      });
    });

    scene.add(orbitGridGroup);
    orbitGridGroupRef.current = orbitGridGroup;
    orbitGridGroup.visible = !isFourWayHoloRef.current && featureVisibilityRef.current.orbitalRadar;

    // 7. Planet Root Group
    const planetGroup = new THREE.Group();
    planetGroup.scale.setScalar(isFourWayHoloRef.current ? 0.95 : 1);
    scene.add(planetGroup);
    planetGroupRef.current = planetGroup;

    // Build Planet Meshes, Upgrade Real NASA Textures & Apply Active Render Mode
    rebuildPlanetMeshes(planet, timeSliderValue);
    applyRealNasaSurfaceTextures(planet.id, timeSliderValue);
    applySurfaceRenderMode(surfaceRenderModeRef.current);

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (composerRef.current) {
        composerRef.current.setSize(w, h);
      }
      if (bloomPassRef.current) {
        bloomPassRef.current.resolution.set(w, h);
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // 8. WebXR-Compatible Animation & Render Loop
    const clock = new THREE.Clock();
    const spherical = new THREE.Spherical();
    const offsetVec = new THREE.Vector3();
    const desiredCamPos = new THREE.Vector3();

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      explodeFactorRef.current += (targetExplodeFactorRef.current - explodeFactorRef.current) * 0.08;
      const explodeVal = explodeFactorRef.current;

      // Keyboard WASD/Arrow spherical orbit + Q/E zoom around OrbitControls target
      const keys = activeKeysRef.current;
      if (keys.size > 0 && cameraRef.current && !isFourWayHoloRef.current) {
        autoRotateRef.current = false;
        targetFocusLocalDirRef.current = null;
        offsetVec.copy(cameraRef.current.position).sub(controls.target);
        spherical.setFromVector3(offsetVec);

        const orbitStep = 1.65 * delta;
        if (keys.has('a') || keys.has('arrowleft')) spherical.theta -= orbitStep;
        if (keys.has('d') || keys.has('arrowright')) spherical.theta += orbitStep;
        if (keys.has('w') || keys.has('arrowup')) {
          spherical.phi = Math.max(0.12, spherical.phi - orbitStep);
        }
        if (keys.has('s') || keys.has('arrowdown')) {
          spherical.phi = Math.min(Math.PI - 0.12, spherical.phi + orbitStep);
        }

        const zoomStep = 5.5 * delta;
        if (keys.has('e')) {
          spherical.radius = Math.max(MIN_ZOOM_DISTANCE, spherical.radius - zoomStep);
        }
        if (keys.has('q')) {
          spherical.radius = Math.min(MAX_ZOOM_DISTANCE, spherical.radius + zoomStep);
        }

        offsetVec.setFromSpherical(spherical);
        cameraRef.current.position.copy(controls.target).add(offsetVec);
      }

      // Smoothly orbit camera onto selected surface pin
      if (targetFocusLocalDirRef.current && planetGroupRef.current && cameraRef.current && !isFourWayHoloRef.current) {
        const worldDir = targetFocusLocalDirRef.current
          .clone()
          .applyQuaternion(planetGroupRef.current.quaternion)
          .normalize();
        const currentDist = THREE.MathUtils.clamp(
          cameraRef.current.position.distanceTo(controls.target),
          MIN_ZOOM_DISTANCE,
          MAX_ZOOM_DISTANCE
        );
        desiredCamPos.copy(worldDir).multiplyScalar(currentDist).add(controls.target);
        cameraRef.current.position.lerp(desiredCamPos, Math.min(1, delta * 5.2));
        cameraRef.current.position
          .sub(controls.target)
          .setLength(currentDist)
          .add(controls.target);

        const curDir = cameraRef.current.position.clone().sub(controls.target).normalize();
        if (curDir.dot(worldDir) > 0.9994) {
          targetFocusLocalDirRef.current = null;
        }
      }

      if (autoRotateRef.current && planetGroupRef.current) {
        planetGroupRef.current.rotation.y += 0.12 * delta;
      }

      // Update OrbitControls damping cleanly in normal view
      if (!isFourWayHoloRef.current && (!renderer.xr || !renderer.xr.isPresenting)) {
        controls.update();
      }

      // Subtle multi-tier starfield depth parallax
      if (starFieldGroupRef.current && starFieldGroupRef.current.visible) {
        starLayers.forEach((layer, idx) => {
          layer.rotation.y += (0.004 + idx * 0.0045) * delta;
          layer.rotation.x += (0.0012 + idx * 0.001) * delta;
        });
      }

      orbitGridGroup.rotation.z += 0.05 * delta;
      orbitGridGroup.rotation.x = Math.sin(elapsedTime * 0.3) * 0.12;

      // Rotate Planetary Ring System (Saturn & Uranus ONLY, hidden when GLB supplies its own ring)
      const useGlbNow =
        glbLoadedRef.current &&
        surfaceRenderModeRef.current === 'nasa' &&
        explodeVal < 0.05 &&
        timeSliderValueRef.current >= 80;

      if (glbModelGroupRef.current) {
        glbModelGroupRef.current.visible = useGlbNow;
      }
      if (mainPlanetMeshRef.current) {
        mainPlanetMeshRef.current.visible = !useGlbNow;
      }

      if (cloudMeshRef.current) {
        cloudMeshRef.current.rotation.y += 0.035 * delta;
        cloudMeshRef.current.visible =
          !useGlbNow && surfaceRenderModeRef.current === 'nasa' && explodeVal < 0.3;
      }

      if (planetaryRingMeshRef.current && planetaryRingGroupRef.current) {
        planetaryRingMeshRef.current.rotation.z += 0.05 * delta;
        planetaryRingGroupRef.current.visible =
          !useGlbNow &&
          (planet.id === 'saturn' || planet.id === 'uranus') &&
          Boolean(planet.hasPlanetaryRings) &&
          featureVisibilityRef.current.planetaryRings !== false &&
          explodeVal < 0.35;
      }

      // Dynamic Sun-position lighting & nocturnal city lights opacity
      if (sunLightRef.current && !isFourWayHoloRef.current) {
        if (sunLightingModeRef.current === 'lit') {
          sunLightRef.current.position.lerp(new THREE.Vector3(10, 6, 10), delta * 4);
          if (nightLightsMeshRef.current) {
            const mat = nightLightsMeshRef.current.material as THREE.MeshBasicMaterial;
            if (mat) mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.04, delta * 3);
          }
        } else if (sunLightingModeRef.current === 'shadow') {
          sunLightRef.current.position.lerp(new THREE.Vector3(-12, -5, -11), delta * 4);
          if (nightLightsMeshRef.current) {
            const mat = nightLightsMeshRef.current.material as THREE.MeshBasicMaterial;
            if (mat) mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.92, delta * 3);
          }
        } else {
          sunAngleRef.current += 0.45 * delta;
          const sx = Math.cos(sunAngleRef.current) * 14;
          const sz = Math.sin(sunAngleRef.current) * 14;
          const sy = Math.sin(sunAngleRef.current * 0.4) * 4;
          sunLightRef.current.position.set(sx, sy, sz);
          if (nightLightsMeshRef.current) {
            const mat = nightLightsMeshRef.current.material as THREE.MeshBasicMaterial;
            if (mat) mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.65, delta * 3);
          }
        }
      }

      // Animate 3D Satellite Terrain Scanline Sweep
      if (scanSweepGroupRef.current && scanSweepActiveRef.current) {
        scanSweepProgressRef.current += delta * 0.48;
        const prog = scanSweepProgressRef.current;
        if (prog >= 1.0) {
          scanSweepProgressRef.current = 1.0;
          scanSweepActiveRef.current = false;
          setScanlineSweepData((prev) => (prev ? { ...prev, active: false, progress: 1.0 } : null));
          setTimeout(() => {
            if (scanSweepGroupRef.current) scanSweepGroupRef.current.visible = false;
          }, 900);
        } else {
          const sweepY = THREE.MathUtils.lerp(PLANET_RADIUS * 1.04, -PLANET_RADIUS * 1.04, prog);
          const ringMesh = scanSweepGroupRef.current.getObjectByName('sweepRingMesh');
          if (ringMesh) {
            ringMesh.position.y = sweepY;
            const radiusAtY = Math.sqrt(Math.max(0.03, Math.pow(PLANET_RADIUS * 1.03, 2) - Math.pow(sweepY, 2)));
            ringMesh.scale.set(radiusAtY, radiusAtY, 1);
          }
          setScanlineSweepData((prev) => (prev ? { ...prev, progress: prog } : null));
        }
      }

      // Update Layer Exploded Offsets (Proportional to PLANET_RADIUS — Zero Overlap)
      const layers = layerMeshesRef.current;
      if (layers.length > 0) {
        const count = layers.length;
        layers.forEach((mesh, index) => {
          mesh.visible = featureVisibilityRef.current.coreShells && explodeVal > 0.02;
          const targetX =
            count === 1 ? PLANET_RADIUS * 0.7 : (-0.12 + (index / (count - 1)) * 1.7) * PLANET_RADIUS;
          mesh.position.x = explodeVal * targetX;
          mesh.rotation.y += 0.05 * (index + 1) * delta;
        });

        if (planetAnchorGroupRef.current) {
          planetAnchorGroupRef.current.position.x = -explodeVal * (PLANET_RADIUS * 1.08);
        }

        if (mainPlanetMeshRef.current) {
          const mat = mainPlanetMeshRef.current.material as THREE.MeshStandardMaterial;
          if (mat) {
            mat.opacity = Math.max(0.24, 1 - explodeVal * 0.76);
            mat.transparent = true;
          }
        }

        if (atmosphereMeshRef.current) {
          atmosphereMeshRef.current.visible =
            featureVisibilityRef.current.atmosphere && explodeVal < 0.3;
        }

        if (tectonicPlatesGroupRef.current) {
          tectonicPlatesGroupRef.current.visible =
            featureVisibilityRef.current.tectonicPlates && explodeVal < 0.35;
        }

        if (magneticFieldGroupRef.current) {
          magneticFieldGroupRef.current.visible =
            featureVisibilityRef.current.magneticField && explodeVal < 0.45;
        }
      }

      // 9. Project 3D Coordinates to 2D Screen for HTML Overlay Badges
      if (isFourWayHoloRef.current) {
        setProjectedMarkers([]);
        setProjectedLayerHUDs([]);
      } else if (cameraRef.current && containerRef.current && planetGroupRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const halfW = rect.width / 2;
        const halfH = rect.height / 2;

        if (explodeVal < 0.25 && featureVisibilityRef.current.surfaceMarkers) {
          const projected: ProjectedMarker[] = [];
          const tempVec = new THREE.Vector3();

          markerObjectsRef.current.forEach((item) => {
            const markerData = planet.surfaceMarkers.find((m) => m.id === item.id);
            if (!markerData) return;

            item.group.getWorldPosition(tempVec);
            const toMarker = tempVec.clone().sub(cameraRef.current!.position);
            const anchorWorld = new THREE.Vector3();
            (planetAnchorGroupRef.current || planetGroupRef.current)!.getWorldPosition(anchorWorld);
            const centerToMarker = tempVec.clone().sub(anchorWorld);
            const isFacingCamera = toMarker.dot(centerToMarker) < 0;

            tempVec.project(cameraRef.current!);
            const screenX = tempVec.x * halfW + halfW;
            const screenY = -tempVec.y * halfH + halfH;
            const inScreen =
              tempVec.z < 1 && screenX >= 0 && screenX <= rect.width && screenY >= 0 && screenY <= rect.height;

            projected.push({
              marker: markerData,
              screenX,
              screenY,
              visible: inScreen && isFacingCamera,
            });
          });
          setProjectedMarkers(projected);
        } else {
          setProjectedMarkers([]);
        }

        if (explodeVal > 0.35 && layers.length > 0) {
          const projectedHUDs: ProjectedLayerHUD[] = [];
          const tempVec = new THREE.Vector3();

          layers.forEach((mesh, index) => {
            const layerData = planet.geologicalLayers[index];
            if (!layerData) return;

            mesh.getWorldPosition(tempVec);
            tempVec.project(cameraRef.current!);

            const anchorX = tempVec.x * halfW + halfW;
            const anchorY = -tempVec.y * halfH + halfH;
            const placement: 'above' | 'below' = index % 2 === 0 ? 'above' : 'below';

            const clampedX = Math.max(106, Math.min(rect.width - 106, anchorX));
            const rawCardY = placement === 'above' ? anchorY - 88 : anchorY + 86;
            const clampedY =
              placement === 'above'
                ? Math.max(145, Math.min(rect.height * 0.45, rawCardY))
                : Math.min(rect.height - 46, Math.max(rect.height * 0.56, rawCardY));

            projectedHUDs.push({
              layer: layerData,
              anchorX,
              anchorY,
              screenX: clampedX,
              screenY: clampedY,
              placement,
              visible: tempVec.z < 1 && anchorX > -40 && anchorX < rect.width + 40,
              distanceOffset: index,
            });
          });
          setProjectedLayerHUDs(projectedHUDs);
        } else {
          setProjectedLayerHUDs([]);
        }
      }

      if (isFourWayHoloRef.current && (!renderer.xr || !renderer.xr.isPresenting)) {
        const w = container.clientWidth || 800;
        const h = container.clientHeight || 600;
        const minDim = Math.min(w, h);
        // Large, clear 0.95-scaled planets inside 4 evenly spaced quadrants with zero edge/cross overlap
        const side = Math.max(68, Math.floor(minDim * 0.34));
        const centerHalf = Math.floor(minDim * 0.155);
        const cx = Math.floor(w / 2);
        const cy = Math.floor(h / 2);

        if (planetGroupRef.current) {
          planetGroupRef.current.scale.setScalar(0.95);
        }
        if (starFieldGroupRef.current) {
          starFieldGroupRef.current.visible = false;
        }
        orbitGridGroup.visible = false;

        // Apply uniform bright studio lighting inside 4-Way Holo so Top/Bottom/Left/Right sides never appear shadowed
        ambientLight.color.setHex(0xeaf6ff);
        ambientLight.intensity = 1.75;
        hemiLight.color.setHex(0xffffff);
        hemiLight.groundColor.setHex(0x94a3b8);
        hemiLight.intensity = 1.45;
        fillLight.intensity = 0.95;
        sunLight.intensity = 1.15;

        const holoCamDist = planet.id === 'saturn' || planet.id === 'uranus' ? 11.8 : 9.4;
        const holoCam = holoCamRef.current || camera;
        holoCam.fov = 42;
        holoCam.aspect = 1;
        holoCam.updateProjectionMatrix();

        const prevAutoClear = renderer.autoClear;
        renderer.autoClear = false;
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, w, h);
        renderer.setClearColor(0x000000, 1);
        renderer.clear(true, true, true);
        renderer.setScissorTest(true);

        // 4 Orthogonal 90-degree Sides (Front, Back, Left, Right) oriented radially around pyramid center
        const views: Array<{
          x: number;
          y: number;
          pos: [number, number, number];
          up: [number, number, number];
        }> = [
          // Top quadrant: Back (180°), inverted so north pole points to pyramid center
          {
            x: cx - Math.floor(side / 2),
            y: cy + centerHalf,
            pos: [0, 0, -holoCamDist],
            up: [0, -1, 0],
          },
          // Bottom quadrant: Front (0°), upright
          {
            x: cx - Math.floor(side / 2),
            y: cy - centerHalf - side,
            pos: [0, 0, holoCamDist],
            up: [0, 1, 0],
          },
          // Left quadrant: Left side (-90°), rotated 90° toward center
          {
            x: cx - centerHalf - side,
            y: cy - Math.floor(side / 2),
            pos: [-holoCamDist, 0, 0],
            up: [1, 0, 0],
          },
          // Right quadrant: Right side (+90°), rotated -90° toward center
          {
            x: cx + centerHalf,
            y: cy - Math.floor(side / 2),
            pos: [holoCamDist, 0, 0],
            up: [-1, 0, 0],
          },
        ];

        for (const v of views) {
          const vx = Math.max(0, Math.min(w - side, v.x));
          const vy = Math.max(0, Math.min(h - side, v.y));
          renderer.setViewport(vx, vy, side, side);
          renderer.setScissor(vx, vy, side, side);
          renderer.clear(false, true, false);
          holoCam.position.set(v.pos[0], v.pos[1], v.pos[2]);
          holoCam.up.set(v.up[0], v.up[1], v.up[2]);
          holoCam.lookAt(0, 0, 0);
          renderer.render(scene, holoCam);
        }

        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, w, h);
        renderer.autoClear = prevAutoClear;

        // Restore standard PBR space lighting intensities
        ambientLight.color.setHex(0x50688a);
        ambientLight.intensity = SINGLE_AMBIENT_INTENSITY;
        hemiLight.color.setHex(0xbae6fd);
        hemiLight.groundColor.setHex(0x1e293b);
        hemiLight.intensity = SINGLE_HEMI_INTENSITY;
        fillLight.intensity = SINGLE_FILL_INTENSITY;
        sunLight.intensity = SINGLE_SUN_INTENSITY;
      } else {
        if (planetGroupRef.current && planetGroupRef.current.scale.x !== 1) {
          planetGroupRef.current.scale.setScalar(1);
        }
        if (starFieldGroupRef.current) {
          starFieldGroupRef.current.visible = true;
        }
        orbitGridGroup.visible = featureVisibilityRef.current.orbitalRadar;

        if (bloomEnabled && composerRef.current && (!renderer.xr || !renderer.xr.isPresenting)) {
          composerRef.current.render();
        } else {
          renderer.render(scene, camera);
        }
      }
    };

    renderer.setAnimationLoop(animate);

    return () => {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlsStart);
      controls.dispose();
      controlsRef.current = null;
      starGeometries.forEach((g) => g.dispose());
      starMaterials.forEach((m) => m.dispose());
      starSpriteTexture.dispose();
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
      scene.clear();
      renderer.dispose();
      if (composerRef.current) {
        composerRef.current.dispose();
        composerRef.current = null;
      }
    };
  }, [planet.id]);

  // Rebuild Planet Meshes, GLB Preflight Loader & Concentric Geological Layers
  const rebuildPlanetMeshes = (targetPlanet: PlanetData, timeValue: number) => {
    const planetGroup = planetGroupRef.current;
    if (!planetGroup) return;

    planetGroup.name = `planetGroup_${targetPlanet.id}`;
    while (planetGroup.children.length > 0) {
      planetGroup.remove(planetGroup.children[0]);
    }
    layerMeshesRef.current = [];
    markerObjectsRef.current = [];
    planetaryRingMeshRef.current = null;
    planetaryRingGroupRef.current = null;
    atmosphericRingGroupRef.current = null;
    cloudMeshRef.current = null;
    glbModelGroupRef.current = null;
    glbLoadedRef.current = false;

    const loadToken = ++glbLoadTokenRef.current;

    // 0. Anchor Group so GLB model, procedural sphere, pins, faults & dipole lines share exact transform
    const planetAnchorGroup = new THREE.Group();
    planetAnchorGroup.name = `planetAnchor_${targetPlanet.id}`;
    planetGroup.add(planetAnchorGroup);
    planetAnchorGroupRef.current = planetAnchorGroup;

    // 1. Primary Procedural / NASA Texture Surface Sphere (Always ready immediately, zero flicker)
    const planetTexture = generateProceduralPlanetTexture(targetPlanet.id, timeValue);
    const planetBump = generateProceduralBumpTexture(targetPlanet.id);
    const planetGeometry = new THREE.SphereGeometry(PLANET_RADIUS, 64, 64);
    const isGasOrIceGiant = ['jupiter', 'saturn', 'uranus', 'neptune'].includes(targetPlanet.id);
    const planetMaterial = new THREE.MeshStandardMaterial({
      map: planetTexture,
      bumpMap: planetBump,
      bumpScale: isGasOrIceGiant ? 0.02 : 0.11,
      roughness: targetPlanet.id === 'europa' ? 0.65 : isGasOrIceGiant ? 0.78 : 0.88,
      metalness: 0.04,
      emissive: new THREE.Color(0x001a28),
      emissiveIntensity: 0.02,
    });
    const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
    planetAnchorGroup.add(planetMesh);
    mainPlanetMeshRef.current = planetMesh;

    // 1a. Optional Official NASA .glb Mesh Preflight Loader (auto-centered & normalized to PLANET_RADIUS)
    const glbUrl = NASA_GLB_MODEL_PATHS[targetPlanet.id];
    if (glbUrl) {
      checkGlbModelAvailable(glbUrl).then((exists) => {
        if (!exists || glbLoadTokenRef.current !== loadToken || !planetAnchorGroupRef.current) return;
        if (!sharedGltfLoader) {
          sharedGltfLoader = new GLTFLoader();
        }
        sharedGltfLoader.load(
          glbUrl,
          (gltf) => {
            if (glbLoadTokenRef.current !== loadToken || !planetAnchorGroupRef.current) return;
            const root = gltf.scene;
            const box = new THREE.Box3().setFromObject(root);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z) || 1;

            // Keep ringed planets' inner globes matched closely to PLANET_RADIUS
            const targetSpan =
              targetPlanet.id === 'saturn'
                ? PLANET_RADIUS * 4.4
                : targetPlanet.id === 'uranus'
                ? PLANET_RADIUS * 3.8
                : PLANET_RADIUS * 2.0;
            const scaleFactor = targetSpan / maxDim;
            root.scale.setScalar(scaleFactor);
            root.updateMatrixWorld(true);

            const scaledBox = new THREE.Box3().setFromObject(root);
            const scaledCenter = new THREE.Vector3();
            scaledBox.getCenter(scaledCenter);
            root.position.sub(scaledCenter);

            const glbWrapper = new THREE.Group();
            glbWrapper.name = `nasaGlb_${targetPlanet.id}`;
            glbWrapper.add(root);

            const shouldShowGlb =
              surfaceRenderModeRef.current === 'nasa' &&
              explodeFactorRef.current < 0.05 &&
              timeSliderValueRef.current >= 80;
            glbWrapper.visible = shouldShowGlb;
            planetAnchorGroupRef.current.add(glbWrapper);
            glbModelGroupRef.current = glbWrapper;
            glbLoadedRef.current = true;
            if (mainPlanetMeshRef.current) {
              mainPlanetMeshRef.current.visible = !shouldShowGlb;
            }
          },
          undefined,
          () => {
            // Keep procedural NASA fallback quietly if GLB decoding fails
            glbLoadedRef.current = false;
          }
        );
      });
    }

    // 1.1 Earth Translucent Cloud Layer Sphere
    if (targetPlanet.id === 'earth') {
      const cloudGeom = new THREE.SphereGeometry(PLANET_RADIUS * 1.013, 64, 64);
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.0, // Raised smoothly once earth_clouds_1024.png finishes loading
        depthWrite: false,
        roughness: 0.9,
      });
      const cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
      cloudMesh.visible = surfaceRenderModeRef.current === 'nasa';
      planetAnchorGroup.add(cloudMesh);
      cloudMeshRef.current = cloudMesh;
    }

    // 1b. Inner dark backing sphere for Hologram Wireframe mode (gives wireframe depth)
    const innerHoloGeom = new THREE.SphereGeometry(PLANET_RADIUS * 0.985, 32, 32);
    const innerHoloMat = new THREE.MeshBasicMaterial({
      color: 0x030b1a,
      transparent: true,
      opacity: 0.82,
    });
    const innerHoloMesh = new THREE.Mesh(innerHoloGeom, innerHoloMat);
    innerHoloMesh.visible = surfaceRenderModeRef.current === 'wireframe';
    planetAnchorGroup.add(innerHoloMesh);
    innerHoloCoreRef.current = innerHoloMesh;

    // 1c. Nocturnal City Lights / Colonization Luminescence Layer
    const nightLightsTexture = generateProceduralNightLightsTexture(targetPlanet.id);
    const nightLightsGeom = new THREE.SphereGeometry(PLANET_RADIUS * 1.003, 64, 64);
    const nightLightsMat = new THREE.MeshBasicMaterial({
      map: nightLightsTexture,
      transparent: true,
      opacity: sunLightingModeRef.current === 'shadow' ? 0.92 : 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nightLightsMesh = new THREE.Mesh(nightLightsGeom, nightLightsMat);
    planetAnchorGroup.add(nightLightsMesh);
    nightLightsMeshRef.current = nightLightsMesh;

    // 2. Holographic Glow Wireframe Cage around planet
    const wireframeGeom = new THREE.SphereGeometry(PLANET_RADIUS * 1.01, 32, 24);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: targetPlanet.glowColor === '#00f0ff' ? 0x00f0ff : 0x7000ff,
      wireframe: true,
      transparent: true,
      opacity: surfaceRenderModeRef.current === 'wireframe' ? 0.52 : 0.03,
    });
    const wireframeMesh = new THREE.Mesh(wireframeGeom, wireframeMat);
    planetAnchorGroup.add(wireframeMesh);
    wireframeCageMeshRef.current = wireframeMesh;

    // 3. Crisp Fresnel Atmospheric Rim Halo Shader (Hugs horizon limb without washing out NASA surface!)
    const atmosGeom = new THREE.SphereGeometry(PLANET_RADIUS * 1.065, 48, 48);
    const atmosMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(targetPlanet.atmosphereRingColor || '#00f0ff') },
        intensity: { value: targetPlanet.id === 'moon' || targetPlanet.id === 'mercury' ? 0.22 : 0.62 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mvPos.xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensity;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          float ndotv = dot(normalize(vNormal), normalize(vViewPos));
          float rim = smoothstep(0.02, -0.48, ndotv);
          gl_FragColor = vec4(glowColor, 1.0) * (rim * rim) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const atmosMesh = new THREE.Mesh(atmosGeom, atmosMat);
    atmosMesh.visible = featureVisibilityRef.current.atmosphere;
    planetAnchorGroup.add(atmosMesh);
    atmosphereMeshRef.current = atmosMesh;

    // 3c. Planetary Ring System — STRICTLY MOUNTED ONLY FOR SATURN AND URANUS
    if ((targetPlanet.id === 'saturn' || targetPlanet.id === 'uranus') && targetPlanet.hasPlanetaryRings) {
      const planetaryRingGroup = new THREE.Group();
      planetaryRingGroup.name = 'planetaryRingGroup';
      planetaryRingGroup.visible = featureVisibilityRef.current.planetaryRings !== false;

      const innerRatio = targetPlanet.ringInnerRadiusRatio || (targetPlanet.id === 'uranus' ? 1.5 : 1.35);
      const outerRatio = targetPlanet.ringOuterRadiusRatio || (targetPlanet.id === 'uranus' ? 1.98 : 2.3);
      const innerR = PLANET_RADIUS * innerRatio;
      const outerR = PLANET_RADIUS * outerRatio;

      const ringGeom = new THREE.RingGeometry(innerR, outerR, 128, 8);
      const posAttr = ringGeom.attributes.position;
      const uvAttr = ringGeom.attributes.uv;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const r = Math.sqrt(vx * vx + vy * vy);
        const u = Math.max(0, Math.min(1, (r - innerR) / (outerR - innerR)));
        const angle = (Math.atan2(vy, vx) + Math.PI) / (Math.PI * 2);
        uvAttr.setXY(i, u, angle);
      }
      uvAttr.needsUpdate = true;

      const ringTexture = generateProceduralRingTexture(targetPlanet.ringColor || '#d6be96');
      const isUranus = targetPlanet.id === 'uranus';
      const ringMat = new THREE.MeshStandardMaterial({
        map: ringTexture,
        color: isUranus ? new THREE.Color('#7dd3fc') : new THREE.Color('#ffffff'),
        emissive: new THREE.Color(isUranus ? '#164e63' : '#7a6242'),
        emissiveMap: ringTexture,
        emissiveIntensity: 0.08,
        roughness: 0.72,
        metalness: 0.04,
        transparent: true,
        opacity: isUranus ? 0.56 : 0.94,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      planetaryRingGroup.add(ringMesh);
      planetaryRingMeshRef.current = ringMesh;

      planetaryRingGroup.rotation.x = THREE.MathUtils.degToRad(targetPlanet.ringTiltDeg || 26.73);
      planetaryRingGroup.rotation.z = THREE.MathUtils.degToRad(isUranus ? 12 : 8);

      planetAnchorGroup.add(planetaryRingGroup);
      planetaryRingGroupRef.current = planetaryRingGroup;
    }

    // 3d. Satellite Terrain Lidar Scanline Sweep Group
    const scanSweepGroup = new THREE.Group();
    scanSweepGroup.name = 'scanSweepGroup';
    scanSweepGroup.visible = false;

    const sweepRingGeom = new THREE.RingGeometry(0.96, 1.04, 64);
    const sweepRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sweepRingMesh = new THREE.Mesh(sweepRingGeom, sweepRingMat);
    sweepRingMesh.name = 'sweepRingMesh';
    sweepRingMesh.rotation.x = Math.PI / 2;
    scanSweepGroup.add(sweepRingMesh);

    planetAnchorGroup.add(scanSweepGroup);
    scanSweepGroupRef.current = scanSweepGroup;

    // 4. Concentric Geological Core Layers for Exploded View (Strictly Monotonic Radii + PolygonOffset = Zero Z-Fighting)
    const layers = targetPlanet.geologicalLayers;
    const totalLayers = layers.length;
    const layerMeshes: THREE.Mesh[] = [];

    layers.forEach((layer, index) => {
      // Scale cleanly from 0.72 (outermost crust/envelope) down to 0.24 (innermost core)
      const radiusFraction =
        totalLayers <= 1 ? 0.55 : 0.72 - (index / (totalLayers - 1)) * 0.46;
      const normalizedRadius = PLANET_RADIUS * radiusFraction;
      const layerGeom = new THREE.SphereGeometry(normalizedRadius, 48, 48);

      const layerMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(layer.color),
        emissive: new THREE.Color(layer.emissiveColor),
        emissiveIntensity: 0.35,
        roughness: 0.45,
        metalness: 0.35,
        polygonOffset: true,
        polygonOffsetFactor: index + 1,
        polygonOffsetUnits: index + 1,
        transparent: false,
        depthWrite: true,
      });

      const layerMesh = new THREE.Mesh(layerGeom, layerMat);
      layerMesh.visible = false;
      layerMesh.renderOrder = index + 2;

      const layerWireGeom = new THREE.SphereGeometry(normalizedRadius * 1.012, 24, 18);
      const layerWireMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(layer.wireframeColor),
        wireframe: true,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      });
      const layerWireMesh = new THREE.Mesh(layerWireGeom, layerWireMat);
      layerMesh.add(layerWireMesh);

      planetGroup.add(layerMesh);
      layerMeshes.push(layerMesh);
    });

    layerMeshesRef.current = layerMeshes;

    // 5. Pin Markers (Rovers, Landers, Observatories & Habitats)
    const markerObjects: { id: string; group: THREE.Group; worldPos: THREE.Vector3 }[] = [];

    targetPlanet.surfaceMarkers.forEach((marker) => {
      const pos = latLonToVector3(marker.lat, marker.lon, PLANET_RADIUS * 1.015);
      const markerGroup = new THREE.Group();
      markerGroup.position.set(pos.x, pos.y, pos.z);
      markerGroup.lookAt(pos.x * 2, pos.y * 2, pos.z * 2);
      markerGroup.visible = featureVisibilityRef.current.surfaceMarkers;

      const beaconGeom = new THREE.CylinderGeometry(0.024, 0.024, 0.22, 8);
      const isHabitat = marker.type === 'habitat_candidate';
      const isObs = marker.type === 'observatory';
      const beaconMat = new THREE.MeshBasicMaterial({
        color: isHabitat ? 0x00ff88 : isObs ? 0xa855f7 : 0x00f0ff,
      });
      const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
      beaconMesh.rotation.x = Math.PI / 2;
      markerGroup.add(beaconMesh);

      const capGeom = new THREE.SphereGeometry(0.056, 12, 12);
      const capMat = new THREE.MeshBasicMaterial({
        color: isHabitat ? 0x00ff88 : isObs ? 0xd8b4fe : 0xffaa00,
      });
      const capMesh = new THREE.Mesh(capGeom, capMat);
      capMesh.position.z = 0.12;
      markerGroup.add(capMesh);

      planetAnchorGroup.add(markerGroup);

      markerObjects.push({
        id: marker.id,
        group: markerGroup,
        worldPos: new THREE.Vector3(pos.x, pos.y, pos.z),
      });
    });

    markerObjectsRef.current = markerObjects;

    // 6. Tectonic Faults and Crustal Plates Group
    const tectonicGroup = new THREE.Group();
    tectonicGroup.name = 'tectonicGroup';
    tectonicGroup.visible = featureVisibilityRef.current.tectonicPlates;

    const faultMaterial = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
    });

    const riftPoints: THREE.Vector3[] = [];
    for (let lon = -75; lon <= 75; lon += 2.5) {
      const lat = Math.sin(lon * 0.07) * 7.5 + Math.cos(lon * 0.14) * 3.5;
      const p = latLonToVector3(lat, lon, PLANET_RADIUS * 1.008);
      riftPoints.push(new THREE.Vector3(p.x, p.y, p.z));
    }
    const riftGeom = new THREE.BufferGeometry().setFromPoints(riftPoints);
    tectonicGroup.add(new THREE.Line(riftGeom, faultMaterial));

    [-40, 18, 55].forEach((baseLat, idx) => {
      const ringPts: THREE.Vector3[] = [];
      for (let lon = -180; lon <= 180; lon += 5) {
        const lat = baseLat + Math.sin(lon * 0.05 + idx * 1.6) * 12;
        const p = latLonToVector3(lat, lon, PLANET_RADIUS * 1.006);
        ringPts.push(new THREE.Vector3(p.x, p.y, p.z));
      }
      const ringGeom = new THREE.BufferGeometry().setFromPoints(ringPts);
      tectonicGroup.add(new THREE.Line(ringGeom, faultMaterial));
    });

    planetAnchorGroup.add(tectonicGroup);
    tectonicPlatesGroupRef.current = tectonicGroup;

    // 7. Planetary Magnetic Field Dipole Loops Group
    const magnetGroup = new THREE.Group();
    magnetGroup.name = 'magnetGroup';
    magnetGroup.visible = featureVisibilityRef.current.magneticField;

    const magnetMaterial = new THREE.LineBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });

    const L_shells = [1.6, 2.2, 2.9];
    const azimuthAngles = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];

    azimuthAngles.forEach((phi) => {
      L_shells.forEach((L) => {
        const loopPts: THREE.Vector3[] = [];
        const numSteps = 42;
        for (let i = 0; i <= numSteps; i++) {
          const theta = 0.16 + (i / numSteps) * (Math.PI - 0.32);
          const r = PLANET_RADIUS * L * Math.sin(theta) * Math.sin(theta);
          const x = r * Math.sin(theta) * Math.cos(phi);
          const y = r * Math.cos(theta);
          const z = r * Math.sin(theta) * Math.sin(phi);
          loopPts.push(new THREE.Vector3(x, y, z));
        }
        const loopGeom = new THREE.BufferGeometry().setFromPoints(loopPts);
        magnetGroup.add(new THREE.Line(loopGeom, magnetMaterial));
      });
    });

    planetAnchorGroup.add(magnetGroup);
    magneticFieldGroupRef.current = magnetGroup;
  };

  // Helper to programmatically adjust camera distance within OrbitControls bounds [2.6, 14]
  const adjustCameraZoom = useCallback((delta: number) => {
    const cam = cameraRef.current;
    const controls = controlsRef.current;
    if (!cam || !controls) return;
    const offset = cam.position.clone().sub(controls.target);
    const nextDist = THREE.MathUtils.clamp(offset.length() + delta, MIN_ZOOM_DISTANCE, MAX_ZOOM_DISTANCE);
    offset.setLength(nextDist);
    cam.position.copy(controls.target).add(offset);
    controls.update();
  }, []);

  // Reset Camera View
  const handleResetCamera = useCallback(() => {
    if (cameraRef.current && planetGroupRef.current && controlsRef.current) {
      targetFocusLocalDirRef.current = null;
      controlsRef.current.target.set(0, 0, 0);
      cameraRef.current.position.copy(DEFAULT_CAMERA_POS);
      cameraRef.current.lookAt(0, 0, 0);
      planetGroupRef.current.rotation.set(0, 0, 0);
      controlsRef.current.update();
      autoRotateRef.current = true;
      setIsAutoRotating(true);
    }
  }, []);

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const validKeys = [
        'w',
        'a',
        's',
        'd',
        'q',
        'e',
        'r',
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
        ' ',
      ];

      if (validKeys.includes(key)) {
        if (key === ' ' || key.startsWith('arrow')) {
          e.preventDefault();
        }
        activeKeysRef.current.add(key);
        setPressedKeys(Array.from(activeKeysRef.current));

        if (key === 'r') {
          handleResetCamera();
        } else if (key === ' ') {
          setIsAutoRotating((prev) => !prev);
        } else {
          autoRotateRef.current = false;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      activeKeysRef.current.delete(key);
      setPressedKeys(Array.from(activeKeysRef.current));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleResetCamera]);

  // WebXR and 1:1 Scale Inspection Toggle
  const handleToggleVR = async () => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (renderer.xr && renderer.xr.isPresenting) {
      const session = renderer.xr.getSession();
      if (session) await session.end();
      setIsVRActive(false);
      return;
    }

    if (typeof navigator !== 'undefined' && 'xr' in navigator && (navigator as any).xr) {
      try {
        const supported = await (navigator as any).xr.isSessionSupported('immersive-vr');
        if (supported) {
          const session = await (navigator as any).xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
          });
          session.addEventListener('end', () => setIsVRActive(false));
          await renderer.xr.setSession(session);
          setIsVRActive(true);
          return;
        }
      } catch (err) {
        console.warn('WebXR session request not supported or denied:', err);
      }
    }

    if (!isScaleInspectionActive) {
      setIsScaleInspectionActive(true);
      if (cameraRef.current && controlsRef.current) {
        const offset = cameraRef.current.position.clone().sub(controlsRef.current.target);
        offset.setLength(3.6);
        cameraRef.current.position.copy(controlsRef.current.target).add(offset);
        controlsRef.current.update();
      }
    } else {
      setIsScaleInspectionActive(false);
      if (cameraRef.current && controlsRef.current) {
        const offset = cameraRef.current.position.clone().sub(controlsRef.current.target);
        offset.setLength(DEFAULT_CAMERA_DISTANCE);
        cameraRef.current.position.copy(controlsRef.current.target).add(offset);
        controlsRef.current.update();
      }
    }
  };

  const cycleSunMode = () => {
    holoAudio.playBlip(860, 0.05);
    setSunLightingMode((prev) => (prev === 'lit' ? 'shadow' : prev === 'shadow' ? 'orbit' : 'lit'));
  };

  return (
    <div className="relative w-full h-full select-none cursor-grab active:cursor-grabbing overflow-hidden">
      {/* 3D WebGL Canvas Container (OrbitControls handles drag, scroll-wheel zoom, and two-finger pinch) */}
      <div ref={containerRef} className="w-full h-full touch-none" />

      {/* UNIFIED NON-OVERLAPPING TOP VIEWPORT HUD BAR + FEATURE LEGEND (Hidden during 4-Way Pyramid Hologram Mode) */}
      {!isFourWayHolo && (
        <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-3 sm:left-3 sm:right-3 z-20 flex flex-col gap-1.5 sm:gap-2 pointer-events-none min-w-0">
        {/* Row 1: Short Title Badge + Horizontally Scrollable Toolbar on Mobile / Wrapped on Desktop */}
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-between gap-1.5 sm:gap-2 w-full min-w-0">
          {/* Shortened Clean Viewport Title */}
          <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
            <div className="holo-panel px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2 border border-cyan-500/40 shrink-0">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
              <span className="text-[11px] sm:text-xs font-orbitron font-bold tracking-wider text-cyan-200 whitespace-nowrap">
                3D VIEW // {planet.name.toUpperCase()}
              </span>
            </div>

            {showRing && (
              <div className="holo-panel px-2 py-1.5 rounded-lg hidden 2xl:flex items-center gap-1.5 border border-cyan-500/25 text-[11px] font-mono text-cyan-200 shrink-0 whitespace-nowrap">
                <span
                  className="w-2 h-2 rounded-full animate-pulse shrink-0"
                  style={{ backgroundColor: planet.atmosphereRingColor || '#00f0ff' }}
                />
                <span>ATMO: {planet.atmosphericDensityKgM3.toExponential(1)} kg/m³</span>
              </div>
            )}
          </div>

          {/* Controls HUD Toolbar (Single Horizontal Scrollable Row on Mobile, Flex-Wrap on Desktop) */}
          <div className="flex flex-nowrap md:flex-wrap overflow-x-auto no-scrollbar items-center gap-1.5 w-full md:w-auto min-w-0 md:justify-end pointer-events-auto pb-0.5 touch-pan-x">
            {/* Segmented Surface Render Mode Toggle: REALISTIC NASA SURFACE | HOLOGRAM WIREFRAME */}
            <div
              className="flex items-center bg-[#030714]/90 p-0.5 rounded-lg border border-cyan-500/40 shrink-0"
              role="group"
              aria-label="3D Surface Render Mode"
            >
              <button
                type="button"
                onClick={() => {
                  holoAudio.playBlip(920, 0.05);
                  onChangeSurfaceRenderMode('nasa');
                }}
                className={`px-2 py-1 rounded text-[11px] font-mono tracking-wide transition-all flex items-center gap-1 shrink-0 whitespace-nowrap ${
                  surfaceRenderMode === 'nasa'
                    ? 'bg-cyan-500/30 text-cyan-100 border border-cyan-400 font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'text-slate-400 hover:text-cyan-200 border border-transparent'
                }`}
                title="Render realistic high-detail NASA planetary surface textures"
              >
                <Globe className="w-3 h-3 text-cyan-300 shrink-0" />
                <span>REALISTIC NASA</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  holoAudio.playBlip(760, 0.05);
                  onChangeSurfaceRenderMode('wireframe');
                }}
                className={`px-2 py-1 rounded text-[11px] font-mono tracking-wide transition-all flex items-center gap-1 shrink-0 whitespace-nowrap ${
                  surfaceRenderMode === 'wireframe'
                    ? 'bg-purple-500/35 text-purple-100 border border-purple-400 font-bold shadow-[0_0_10px_rgba(168,85,247,0.35)]'
                    : 'text-slate-400 hover:text-purple-200 border border-transparent'
                }`}
                title="Render holographic wireframe structural mesh"
              >
                <Grid3x3 className="w-3 h-3 text-purple-300 shrink-0" />
                <span>HOLO WIREFRAME</span>
              </button>
            </div>

            {/* 4-Way Symmetrical Pyramid Hologram Toggle */}
            <button
              type="button"
              onClick={() => {
                holoAudio.playBlip(isFourWayHolo ? 700 : 1040, 0.06);
                setIsFourWayHolo((prev) => !prev);
              }}
              aria-pressed={isFourWayHolo}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono tracking-wider transition-all flex items-center gap-1.5 border shrink-0 whitespace-nowrap ${
                isFourWayHolo
                  ? 'bg-cyan-500/35 text-cyan-100 border-cyan-300 font-bold shadow-[0_0_14px_rgba(0,240,255,0.45)]'
                  : 'holo-panel text-cyan-200 border-cyan-500/40 hover:border-cyan-300'
              }`}
              title="Toggle 4-Way Symmetrical Pyramid Hologram Split-Screen Mode"
            >
              <svg
                viewBox="0 0 16 16"
                className="w-3.5 h-3.5 text-cyan-300 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polygon points="8,1 10.5,5.5 5.5,5.5" />
                <polygon points="8,15 10.5,10.5 5.5,10.5" />
                <polygon points="1,8 5.5,5.5 5.5,10.5" />
                <polygon points="15,8 10.5,5.5 10.5,10.5" />
              </svg>
              <span>4-WAY HOLO</span>
            </button>

            {/* WebXR VR Button */}
            <TechTooltip term="webxr-vr" position="bottom">
              <button
                type="button"
                onClick={handleToggleVR}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono tracking-wider transition-all flex items-center gap-1 border shrink-0 whitespace-nowrap ${
                  isVRActive || isScaleInspectionActive
                    ? 'bg-purple-600/40 text-purple-100 border-purple-400'
                    : 'holo-panel text-purple-200 border-purple-500/40 hover:border-purple-300'
                }`}
                title="Enter WebXR VR or 1:1 Orbital Scale Mode"
              >
                <Headset className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <span>{isVRActive ? 'VR ON' : isScaleInspectionActive ? '1:1 ON' : 'VR'}</span>
              </button>
            </TechTooltip>

            {/* Dynamic Sun Lighting Mode Toggle */}
            <button
              type="button"
              onClick={cycleSunMode}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono tracking-wider transition-all flex items-center gap-1.5 border shrink-0 whitespace-nowrap ${
                sunLightingMode === 'shadow'
                  ? 'bg-indigo-600/35 text-indigo-100 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                  : sunLightingMode === 'orbit'
                  ? 'bg-amber-500/25 text-amber-100 border-amber-400'
                  : 'holo-panel text-amber-200 border-amber-500/40 hover:border-amber-300'
              }`}
              title="Toggle Sun Position: Lit Hemisphere / Shadow Night Lights / Orbital Sun Cycle"
            >
              {sunLightingMode === 'lit' ? (
                <Sun className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              ) : sunLightingMode === 'shadow' ? (
                <Moon className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              ) : (
                <Orbit className="w-3.5 h-3.5 text-amber-300 animate-spin [animation-duration:8s] shrink-0" />
              )}
              <span>
                {sunLightingMode === 'lit' ? 'LIT SIDE' : sunLightingMode === 'shadow' ? 'SHADOW SIDE' : 'SUN ORBIT'}
              </span>
            </button>

            {/* Auto-Rotate Button */}
            <TechTooltip term="auto-rotate" position="bottom">
              <button
                type="button"
                onClick={handleToggleAutoRotate}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono tracking-wider transition-all flex items-center gap-1.5 border shrink-0 whitespace-nowrap ${
                  isAutoRotating
                    ? 'bg-cyan-500/25 text-cyan-100 border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'holo-panel text-slate-300 border-slate-700 hover:border-cyan-500/40'
                }`}
                title="Toggle Continuous Auto-Rotation (Spacebar)"
              >
                <RotateCw
                  className={`w-3.5 h-3.5 text-cyan-300 shrink-0 ${
                    isAutoRotating ? 'animate-spin [animation-duration:6s]' : ''
                  }`}
                />
                <span>{isAutoRotating ? 'AUTO' : 'PAUSED'}</span>
              </button>
            </TechTooltip>

            {/* Balanced Bloom Toggle */}
            <button
              type="button"
              onClick={() => setBloomEnabled((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono tracking-wider transition-all flex items-center gap-1 border shrink-0 whitespace-nowrap ${
                bloomEnabled
                  ? 'bg-amber-500/20 text-amber-200 border-amber-400/70'
                  : 'holo-panel text-slate-400 border-slate-700 hover:border-amber-500/40'
              }`}
              title="Toggle Subtle Holographic Bloom Radiance"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>{bloomEnabled ? 'BLOOM' : 'NO BLOOM'}</span>
            </button>

            {/* Atmospheric Rim Glow Toggle Button */}
            <TechTooltip term="scale-height" position="bottom">
              <button
                type="button"
                onClick={() => handleToggleFeature('atmosphere')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono tracking-wider transition-all flex items-center gap-1 border shrink-0 whitespace-nowrap ${
                  featureVisibility.atmosphere
                    ? 'bg-cyan-500/20 text-cyan-100 border-cyan-400/70'
                    : 'holo-panel text-slate-400 border-slate-700 hover:border-cyan-500/40'
                }`}
                title="Toggle Atmospheric Rim Glow"
              >
                <Wind className="w-3.5 h-3.5 shrink-0" style={{ color: planet.atmosphereRingColor || '#00f0ff' }} />
                <span>ATMO</span>
              </button>
            </TechTooltip>

            {/* Explode Core Button */}
            <button
              type="button"
              onClick={onToggleExplodedView}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono tracking-wider transition-all flex items-center gap-1.5 border shrink-0 whitespace-nowrap ${
                explodedView
                  ? 'bg-purple-600/40 text-purple-100 border-purple-400 shadow-[0_0_12px_rgba(112,0,255,0.4)]'
                  : 'holo-panel text-cyan-200 border-cyan-500/40 hover:border-cyan-300'
              }`}
              title="Toggle Exploded Core View"
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>{explodedView ? 'ASSEMBLE' : 'EXPLODE CORE'}</span>
            </button>

            {/* Zoom & Reset */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => adjustCameraZoom(-1.0)}
                className="holo-panel p-1.5 rounded-lg text-xs text-cyan-200 border-cyan-500/40 hover:border-cyan-300 transition-all shrink-0"
                title="Zoom In Closely (Keyboard: E)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => adjustCameraZoom(1.0)}
                className="holo-panel p-1.5 rounded-lg text-xs text-cyan-200 border-cyan-500/40 hover:border-cyan-300 transition-all shrink-0"
                title="Zoom Out (Keyboard: Q)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetCamera}
                className="holo-panel p-1.5 rounded-lg text-xs text-cyan-200 border-cyan-500/40 hover:border-cyan-300 transition-all shrink-0"
                title="Reset Camera View (Keyboard: R)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Floating Feature Layers Window (Naturally sits below Row 1, zero overlap!) */}
        <div className="self-start pointer-events-auto">
          <HoloFeatureLegend
            visibility={featureVisibility}
            onToggleFeature={handleToggleFeature}
            onToggleAll={handleToggleAllFeatures}
            planetName={planet.name}
            hasRings={planet.hasPlanetaryRings}
          />
        </div>
      </div>
      )}

      {/* Satellite Terrain Scanline Sweep HUD Readout */}
      {scanlineSweepData && (
        <div className="absolute bottom-12 left-4 z-20 pointer-events-none holo-panel px-3 py-2 rounded-lg border border-cyan-400/60 bg-[#040a1a]/90 text-xs font-mono space-y-1 shadow-[0_0_20px_rgba(0,240,255,0.25)]">
          <div className="flex items-center gap-2 text-cyan-200 font-bold">
            <Scan className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>TERRAIN LIDAR SWEEP // {scanlineSweepData.markerName.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-200">
            <span>ELEV: <strong className="text-cyan-300">{scanlineSweepData.elevationM} m</strong></span>
            <span>SLOPE: <strong className="text-emerald-300">{scanlineSweepData.slopeDeg}°</strong></span>
            <span>SCAN: <strong className="text-amber-300">{Math.round(scanlineSweepData.progress * 100)}%</strong></span>
          </div>
        </div>
      )}

      {/* PNG Snapshot Saved Toast */}
      {snapshotToast && (
        <div className="absolute bottom-14 right-4 z-30 holo-panel px-3 py-1.5 rounded-lg border border-emerald-400/70 bg-emerald-950/90 text-xs font-mono text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
          ✓ {snapshotToast}
        </div>
      )}

      {/* Projected 2D HTML Markers */}
      {projectedMarkers.map(({ marker, screenX, screenY, visible }) => {
        if (!visible) return null;
        const isSelected = selectedMarker?.id === marker.id;
        const isHabitat = marker.type === 'habitat_candidate';
        const isObs = marker.type === 'observatory';

        return (
          <div
            key={marker.id}
            style={{
              transform: `translate(${screenX}px, ${screenY}px) translate(-50%, -100%)`,
              willChange: 'transform',
            }}
            className="absolute top-0 left-0 z-10 pointer-events-auto"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectMarker(marker);
              }}
              className={`group flex flex-col items-center cursor-pointer transition-all duration-200 ${
                isSelected ? 'scale-110' : 'scale-95 hover:scale-105'
              }`}
            >
              <div
                className={`px-2 py-0.5 rounded text-[11px] font-mono tracking-tight whitespace-nowrap backdrop-blur-md border transition-all ${
                  isSelected
                    ? 'bg-cyan-500/35 text-cyan-100 border-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.5)]'
                    : isHabitat
                    ? 'bg-emerald-950/85 text-emerald-200 border-emerald-500/60 group-hover:border-emerald-300'
                    : isObs
                    ? 'bg-purple-950/85 text-purple-200 border-purple-500/60 group-hover:border-purple-300'
                    : 'bg-slate-950/85 text-cyan-200 border-cyan-500/50 group-hover:border-cyan-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isHabitat ? 'bg-emerald-400' : isObs ? 'bg-purple-400' : 'bg-cyan-400'
                    } ${isSelected ? 'animate-ping' : ''}`}
                  />
                  <span>{marker.name}</span>
                </div>
              </div>

              <div
                className={`w-0.5 h-5 my-0.5 ${
                  isSelected
                    ? 'bg-gradient-to-b from-cyan-300 to-transparent'
                    : 'bg-gradient-to-b from-cyan-500/50 to-transparent'
                }`}
              />
            </button>
          </div>
        );
      })}

      {/* SVG Leader Lines Connecting Each Separated 3D Core Sphere to Its Callout Card */}
      {projectedLayerHUDs.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          {projectedLayerHUDs.map(({ layer, anchorX, anchorY, screenX, screenY, visible }) => {
            if (!visible) return null;
            const isSelected = selectedLayer?.id === layer.id;
            return (
              <g key={`leader-${layer.id}`}>
                <line
                  x1={anchorX}
                  y1={anchorY}
                  x2={screenX}
                  y2={screenY}
                  stroke={isSelected ? '#c084fc' : 'rgba(0, 240, 255, 0.7)'}
                  strokeWidth={isSelected ? 2 : 1.3}
                  strokeDasharray="4 3"
                />
                <circle
                  cx={anchorX}
                  cy={anchorY}
                  r={isSelected ? 5 : 3.5}
                  fill={isSelected ? '#c084fc' : '#00f0ff'}
                  stroke="#050816"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* Projected Floating HUD Panels for Exploded Core Layers (Alternating Above / Below Lanes) */}
      {projectedLayerHUDs.map(({ layer, screenX, screenY, placement, visible }) => {
        if (!visible) return null;
        const isSelected = selectedLayer?.id === layer.id;

        return (
          <div
            key={layer.id}
            style={{
              transform: `translate(${screenX}px, ${screenY}px) translate(-50%, ${
                placement === 'above' ? '-100%' : '0%'
              })`,
              willChange: 'transform',
            }}
            className="absolute top-0 left-0 z-20 pointer-events-auto"
          >
            <div
              onClick={() => onSelectLayer(layer)}
              className={`holo-panel cursor-pointer p-2 rounded-lg border text-left w-[196px] sm:w-[210px] transition-all backdrop-blur-md ${
                isSelected
                  ? 'border-purple-400 shadow-[0_0_20px_rgba(112,0,255,0.6)] bg-purple-950/90'
                  : 'border-cyan-500/45 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] bg-slate-950/90'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 border-b border-cyan-500/20 pb-1 mb-1">
                <span className="text-[11px] font-bold font-orbitron text-cyan-200 tracking-wide truncate">
                  {layer.name.toUpperCase()}
                </span>
                <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-100 shrink-0">
                  {layer.depthRange}
                </span>
              </div>

              <div className="space-y-0.5 text-[10.5px] font-mono text-slate-200">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-300 shrink-0">{layer.densityKgM3 !== null ? 'Density:' : 'Thick:'}</span>
                  <span className="text-cyan-300 text-right truncate">
                    {layer.densityKgM3 !== null
                      ? `${layer.densityKgM3} kg/m³`
                      : layer.thicknessLabel || `${layer.thicknessKm} km`}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-300 shrink-0">Pressure:</span>
                  <span className="text-purple-300 text-right truncate">
                    {layer.pressureGpa !== null ? `${layer.pressureGpa} GPa` : 'N/A (Model Dependent)'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-300 shrink-0">Temp:</span>
                  <span className="text-amber-300 text-right truncate">
                    {layer.temperatureK !== null ? `${layer.temperatureK} K` : 'N/A (Model Dependent)'}
                  </span>
                </div>
              </div>

              {isSelected && (
                <p className="mt-1.5 text-[10px] font-sans text-slate-200 leading-tight border-t border-purple-500/30 pt-1">
                  {layer.composition}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* 4-Way Pyramid Hologram Mode: Pure Pitch-Black Field + Single Floating Exit Pill */}
      {isFourWayHolo && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              holoAudio.playBlip(700, 0.06);
              setIsFourWayHolo(false);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute top-3 right-3 z-30 px-3.5 py-1.5 rounded-full bg-cyan-950/90 hover:bg-cyan-900 text-cyan-100 border border-cyan-400/80 shadow-[0_0_20px_rgba(0,240,255,0.45)] text-[11px] font-orbitron font-bold tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Minimize2 className="w-3.5 h-3.5 text-cyan-300" />
            <span>EXIT 4-WAY HOLO</span>
          </button>

          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <div className="w-8 h-8 border border-cyan-400/35 rotate-45 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-300/80 shadow-[0_0_8px_#00f0ff]" />
            </div>
          </div>
        </>
      )}

      {/* Target Reticle in Center */}
      {!isFourWayHolo && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 pointer-events-none rounded-full border border-cyan-500/10 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border border-dashed border-cyan-400/15 animate-spin [animation-duration:40s]" />
        </div>
      )}

      {/* Bottom Status Ticker (Hidden during 4-Way Holo) */}
      {!isFourWayHolo && (
        <div className="absolute bottom-2.5 left-3 sm:bottom-3 sm:left-4 z-10 pointer-events-none flex items-center gap-2.5 sm:gap-4 text-[10px] sm:text-xs font-mono text-cyan-300/90">
          <div>
            RADIUS: <span className="text-white font-semibold">{planet.radiusKm.toLocaleString()} km</span>
          </div>
          <div className="hidden sm:block">
            MASS: <span className="text-white font-semibold">{planet.massKg}</span>
          </div>
          <div>
            GRAVITY: <span className="text-cyan-200 font-semibold">{planet.gravity} m/s²</span>
          </div>
        </div>
      )}

      {/* Tactile Keyboard Shortcut Telemetry Guide (Hidden during 4-Way Holo) */}
      {!isFourWayHolo && (
        <div className="absolute bottom-3 right-4 z-10 hidden xl:flex items-center gap-1.5 text-[11px] font-mono bg-[#04091a]/85 px-2.5 py-1 rounded-lg border border-cyan-500/25 text-slate-300 backdrop-blur-md">
          <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
          <span
            className={`px-1.5 py-0.5 rounded border transition-colors ${
              ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some((k) =>
                pressedKeys.includes(k)
              )
                ? 'bg-cyan-500/30 text-cyan-100 border-cyan-300'
                : 'border-slate-700 text-slate-300'
            }`}
          >
            WASD: ROTATE
          </span>
          <span
            className={`px-1.5 py-0.5 rounded border transition-colors ${
              ['q', 'e'].some((k) => pressedKeys.includes(k))
                ? 'bg-cyan-500/30 text-cyan-100 border-cyan-300'
                : 'border-slate-700 text-slate-300'
            }`}
          >
            Q/E: ZOOM
          </span>
          <span
            className={`px-1.5 py-0.5 rounded border transition-colors ${
              pressedKeys.includes('r')
                ? 'bg-cyan-500/30 text-cyan-100 border-cyan-300'
                : 'border-slate-700 text-slate-300'
            }`}
          >
            R: RESET
          </span>
        </div>
      )}

      {/* WebXR & 1:1 Scale Inspection HUD Overlay */}
      {(isScaleInspectionActive || isVRActive) && (
        <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 sm:p-6">
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="holo-panel px-4 py-2.5 rounded-xl border border-purple-500/60 bg-slate-950/90 backdrop-blur-md shadow-[0_0_25px_rgba(168,85,247,0.35)]">
              <div className="flex items-center gap-2">
                <Headset className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="text-xs font-orbitron font-bold text-purple-200 tracking-wider">
                  {isVRActive ? 'WEBXR IMMERSIVE VR ACTIVE' : '1:1 PLANETARY SCALE INSPECTION MODE'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/90 text-purple-200 border border-purple-600/70">
                  {isVRSupported ? 'HARDWARE TRACKING READY' : 'STEREO HUD ACTIVE'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-purple-200/90 mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                <span>TARGET: {planet.name.toUpperCase()}</span>
                <span>•</span>
                <span>RADIUS: {planet.radiusKm.toLocaleString()} KM</span>
                <span>•</span>
                <span>ESCAPE VELOCITY: {planet.escapeVelocityKmS} KM/S</span>
                <span>•</span>
                <span>GRAVITY: {planet.gravity} M/S²</span>
              </div>
            </div>

            <button
              onClick={handleToggleVR}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-purple-950/90 text-purple-100 border border-purple-400 hover:bg-purple-900 transition-all flex items-center gap-1.5"
            >
              <Minimize2 className="w-4 h-4" />
              <span>EXIT VR</span>
            </button>
          </div>

          <div className="self-center flex items-center justify-center opacity-60">
            <div className="w-28 h-28 rounded-full border border-purple-400/40 border-dashed animate-spin [animation-duration:25s] flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border border-cyan-400/60 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#00f0ff]" />
              </div>
            </div>
          </div>

          <div className="self-center holo-panel px-4 py-1.5 rounded-full border border-purple-500/40 bg-slate-950/85 text-[11px] font-mono text-purple-200 flex items-center gap-3">
            <span>W/A/S/D: PITCH & YAW</span>
            <span>•</span>
            <span>Q/E: ZOOM</span>
            <span>•</span>
            <span>SPACE: ROTATE</span>
          </div>
        </div>
      )}
    </div>
  );
};
