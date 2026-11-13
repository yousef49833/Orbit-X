import * as THREE from 'three';

// Deterministic pseudo-random generator so textures remain crisp and consistent across time-slider scrubbing
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Verified CORS-friendly equirectangular NASA / planetary surface texture URLs
 */
export const NASA_SURFACE_TEXTURE_URLS = {
  earth: {
    map: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
    normalMap: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg',
    specularMap: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg',
    cloudsMap: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png',
  },
  moon: {
    map: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg',
  },
  mars: {
    map: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Solarsystemscope_texture_2k_mars.jpg',
  },
  europa: {
    map: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Europa_Voyager_GalileoSSI_global_mosaic.jpg',
  },
  saturn: {
    map: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Solarsystemscope_texture_2k_saturn.jpg',
    ringMap: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Solarsystemscope_texture_2k_saturn_ring_alpha.png',
  },
} as const;

const externalTextureCache = new Map<string, THREE.Texture>();
let sharedLoader: THREE.TextureLoader | null = null;

function getSafeTextureLoader(): THREE.TextureLoader {
  if (!sharedLoader) {
    sharedLoader = new THREE.TextureLoader();
    sharedLoader.setCrossOrigin('anonymous');
  }
  return sharedLoader;
}

/**
 * Loads an external CORS-safe equirectangular texture safely without ever crashing WebGL on failure.
 */
export function loadExternalTextureSafe(
  url: string,
  options: { srgb?: boolean; anisotropy?: number; clampT?: boolean } = {}
): Promise<THREE.Texture | null> {
  const { srgb = true, anisotropy = 8, clampT = true } = options;

  if (externalTextureCache.has(url)) {
    return Promise.resolve(externalTextureCache.get(url)!);
  }

  return new Promise((resolve) => {
    try {
      const loader = getSafeTextureLoader();
      loader.load(
        url,
        (tex) => {
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = clampT ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
          tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          tex.anisotropy = anisotropy;
          tex.needsUpdate = true;
          externalTextureCache.set(url, tex);
          resolve(tex);
        },
        undefined,
        () => {
          // Graceful fallback to procedural NASA albedo/bump texture without unhandled console errors
          resolve(null);
        }
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Converts a bright-ocean specular map into a PBR roughnessMap (oceans smooth ~0.26, continents matte ~0.88).
 */
export function buildEarthRoughnessMapFromSpecular(specTex: THREE.Texture): THREE.Texture | null {
  try {
    const img = specTex.image as HTMLImageElement | HTMLCanvasElement | undefined;
    if (!img || !img.width || !img.height) return null;

    const w = Math.min(1024, img.width);
    const h = Math.min(512, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const lum = data[i]; // 255 on oceans, ~0 on continents
      const rough = Math.round(224 - (lum / 255) * 155); // Land ~224 (0.88), Ocean ~69 (0.27)
      data[i] = rough;
      data[i + 1] = rough;
      data[i + 2] = rough;
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const roughTex = new THREE.CanvasTexture(canvas);
    roughTex.wrapS = THREE.RepeatWrapping;
    roughTex.wrapT = THREE.ClampToEdgeWrapping;
    roughTex.colorSpace = THREE.NoColorSpace;
    roughTex.anisotropy = 8;
    roughTex.needsUpdate = true;
    return roughTex;
  } catch {
    return null;
  }
}

/**
 * Generates crisp grayscale elevation bump relief matching each planet's canyons, craters, ridges, or continents.
 */
export function generateProceduralBumpTexture(planetId: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const w = canvas.width;
  const h = canvas.height;
  const rng = mulberry32(planetId.charCodeAt(0) * 1337 + 7);

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);

  if (planetId === 'mars') {
    // Valles Marineris deep trench
    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.27, h * 0.53);
    ctx.bezierCurveTo(w * 0.34, h * 0.51, w * 0.42, h * 0.55, w * 0.49, h * 0.53);
    ctx.stroke();

    // Olympus Mons high volcanic dome
    const olyGrad = ctx.createRadialGradient(w * 0.16, h * 0.42, 2, w * 0.16, h * 0.42, w * 0.042);
    olyGrad.addColorStop(0, '#f5f5f5');
    olyGrad.addColorStop(0.5, '#c4c4c4');
    olyGrad.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = olyGrad;
    ctx.beginPath();
    ctx.arc(w * 0.16, h * 0.42, w * 0.042, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 65; i++) {
      const cx = rng() * w;
      const cy = h * 0.12 + rng() * h * 0.76;
      const cr = 3 + rng() * 14;
      drawImpactCrater(ctx, cx, cy, cr, 'rgba(220,220,220,0.55)', 'rgba(55,55,55,0.65)');
    }
  } else if (planetId === 'moon') {
    for (let i = 0; i < 120; i++) {
      const cx = rng() * w;
      const cy = h * 0.05 + rng() * h * 0.9;
      const cr = 2.5 + Math.pow(rng(), 1.9) * 22;
      drawImpactCrater(ctx, cx, cy, cr, 'rgba(235,235,235,0.65)', 'rgba(42,42,42,0.75)');
    }
  } else if (planetId === 'europa') {
    for (let i = 0; i < 32; i++) {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(215,215,215,0.55)' : 'rgba(65,65,65,0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const sx = rng() * w;
      const sy = rng() * h * 0.3;
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(
        sx + (rng() - 0.5) * 240,
        h * 0.35,
        sx + (rng() - 0.5) * 240,
        h * 0.7,
        (sx + (rng() - 0.5) * 220 + w) % w,
        h * (0.7 + rng() * 0.3)
      );
      ctx.stroke();
    }
  } else if (planetId === 'saturn' || planetId === 'jupiter' || planetId === 'uranus' || planetId === 'neptune') {
    for (let i = 0; i < 48; i++) {
      const y = (i / 48) * h;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(165,165,165,0.2)' : 'rgba(95,95,95,0.2)';
      ctx.fillRect(0, y, w, 4);
    }
  } else if (planetId === 'mercury') {
    for (let i = 0; i < 140; i++) {
      const cx = rng() * w;
      const cy = h * 0.05 + rng() * h * 0.9;
      const cr = 2 + Math.pow(rng(), 2) * 20;
      drawImpactCrater(ctx, cx, cy, cr, 'rgba(230,230,230,0.65)', 'rgba(48,48,48,0.75)');
    }
  } else if (planetId === 'venus') {
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(195,195,195,0.25)' : 'rgba(70,70,70,0.25)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const y0 = rng() * h;
      ctx.moveTo(0, y0);
      ctx.bezierCurveTo(w * 0.35, y0 - 25, w * 0.65, y0 + 25, w, y0);
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 55; i++) {
      ctx.fillStyle = rng() > 0.5 ? 'rgba(180,180,180,0.22)' : 'rgba(90,90,90,0.22)';
      ctx.beginPath();
      ctx.ellipse(rng() * w, rng() * h, 14 + rng() * 35, 8 + rng() * 18, rng(), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates crisp procedural NASA-inspired planet texture mapped according to the Cosmic Time Machine slider (0 = Ancient, 100 = Present Day)
 */
export function generateProceduralPlanetTexture(
  planetId: string,
  timeSliderValue: number // 0 (Ancient) to 100 (Present)
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const fallbackCanvas = document.createElement('canvas');
    return new THREE.CanvasTexture(fallbackCanvas);
  }

  const t = Math.max(0, Math.min(100, timeSliderValue)) / 100; // 0 = ancient, 1 = modern

  if (planetId === 'mercury') {
    renderMercuryTexture(ctx, canvas.width, canvas.height, t);
  } else if (planetId === 'venus') {
    renderVenusTexture(ctx, canvas.width, canvas.height, t);
  } else if (planetId === 'earth') {
    renderEarthTexture(ctx, canvas.width, canvas.height, t);
  } else if (planetId === 'moon') {
    renderMoonTexture(ctx, canvas.width, canvas.height, t);
  } else if (planetId === 'mars') {
    renderMarsTexture(ctx, canvas.width, canvas.height, t);
  } else if (planetId === 'jupiter') {
    renderJupiterTexture(ctx, canvas.width, canvas.height, t);
  } else if (planetId === 'europa') {
    renderEuropaTexture(ctx, canvas.width, canvas.height, t);
  } else if (planetId === 'saturn') {
    renderSaturnTexture(ctx, canvas.width, canvas.height, t);
  } else if (planetId === 'uranus') {
    renderUranusTexture(ctx, canvas.width, canvas.height, t);
  } else if (planetId === 'neptune') {
    renderNeptuneTexture(ctx, canvas.width, canvas.height, t);
  } else {
    renderGenericPlanet(ctx, canvas.width, canvas.height, t);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a high-contrast banded ring texture for Saturn (mapped radially from inner C-ring to outer F-ring)
 * Balanced luminance so UnrealBloomPass never washes out ring divisions.
 */
export function generateProceduralRingTexture(_ringColorHex: string = '#d6be96'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const w = canvas.width;
  const h = canvas.height;
  const rng = mulberry32(6006);

  ctx.clearRect(0, 0, w, h);

  // Radial band gradient along X (0 = inner C-ring, 1 = outer F-ring)
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  // Inner edge fade
  grad.addColorStop(0.0, 'rgba(130, 112, 86, 0.0)');
  // C-Ring (translucent dusky crepe ring)
  grad.addColorStop(0.06, 'rgba(155, 132, 98, 0.28)');
  grad.addColorStop(0.20, 'rgba(180, 152, 114, 0.42)');

  // B-Ring (dense, rich golden-amber ice ringlets)
  grad.addColorStop(0.24, 'rgba(218, 190, 142, 0.88)');
  grad.addColorStop(0.36, 'rgba(235, 208, 160, 0.94)');
  grad.addColorStop(0.49, 'rgba(208, 180, 132, 0.90)');
  grad.addColorStop(0.58, 'rgba(224, 196, 148, 0.88)');

  // Cassini Division (distinct dark 4,800 km gap)
  grad.addColorStop(0.605, 'rgba(72, 58, 42, 0.25)');
  grad.addColorStop(0.62, 'rgba(10, 8, 12, 0.03)');
  grad.addColorStop(0.665, 'rgba(10, 8, 12, 0.04)');
  grad.addColorStop(0.68, 'rgba(118, 98, 72, 0.38)');

  // A-Ring (outer warm ivory-ochre ring with Encke Gap)
  grad.addColorStop(0.71, 'rgba(204, 178, 138, 0.82)');
  grad.addColorStop(0.81, 'rgba(216, 192, 150, 0.76)');
  grad.addColorStop(0.855, 'rgba(16, 14, 18, 0.07)'); // Encke Gap
  grad.addColorStop(0.875, 'rgba(200, 174, 134, 0.72)');
  grad.addColorStop(0.92, 'rgba(182, 158, 122, 0.5)');

  // Narrow F-Ring
  grad.addColorStop(0.955, 'rgba(14, 12, 16, 0.05)');
  grad.addColorStop(0.97, 'rgba(218, 194, 152, 0.65)');
  grad.addColorStop(1.0, 'rgba(130, 115, 92, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Fine concentric ice-particle ringlets
  for (let i = 0; i < 120; i++) {
    const x = rng() * w;
    if (x > w * 0.615 && x < w * 0.67) continue;
    const isDark = rng() > 0.45;
    const alpha = 0.07 + rng() * 0.15;
    ctx.fillStyle = isDark ? `rgba(58, 42, 24, ${alpha})` : `rgba(242, 222, 182, ${alpha})`;
    ctx.fillRect(x, 0, 1 + rng() * 2, h);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates nocturnal city lights & scientific colony illumination texture
 * Revealed when in 'Shadow side' mode or dark terminator regions
 */
export function generateProceduralNightLightsTexture(planetId: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(planetId.charCodeAt(0) * 997);

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (planetId === 'earth') {
    const drawCityCluster = (cx: number, cy: number, radius: number, density: number) => {
      for (let i = 0; i < density; i++) {
        const ang = rng() * Math.PI * 2;
        const dist = Math.pow(rng(), 1.5) * radius;
        const x = cx + Math.cos(ang) * dist;
        const y = cy + Math.sin(ang) * dist;
        const isCore = dist < radius * 0.3;
        ctx.fillStyle = isCore ? '#ffe8a3' : rng() > 0.3 ? '#ffb703' : '#00f0ff';
        ctx.beginPath();
        ctx.arc(x, y, isCore ? 1.8 : 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawCityCluster(w * 0.26, h * 0.36, w * 0.06, 95);
    drawCityCluster(w * 0.18, h * 0.38, w * 0.04, 55);
    drawCityCluster(w * 0.52, h * 0.28, w * 0.07, 125);
    drawCityCluster(w * 0.78, h * 0.34, w * 0.06, 115);
    drawCityCluster(w * 0.68, h * 0.44, w * 0.05, 85);
    drawCityCluster(w * 0.33, h * 0.68, w * 0.04, 48);
  } else {
    const drawColonyOutpost = (cx: number, cy: number, color: string) => {
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const dist = 6 + rng() * 8;
        ctx.fillRect(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, 1.6, 1.6);
      }
      ctx.shadowBlur = 0;
    };

    drawColonyOutpost(w * 0.35, h * 0.48, '#00f0ff');
    drawColonyOutpost(w * 0.62, h * 0.42, '#00ff88');
    drawColonyOutpost(w * 0.78, h * 0.58, '#ffb703');
    drawColonyOutpost(w * 0.22, h * 0.32, '#00f0ff');
    drawColonyOutpost(w * 0.48, h * 0.65, '#a855f7');
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function drawImpactCrater(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rimColor: string,
  floorColor: string
) {
  // Rim highlight
  ctx.fillStyle = rimColor;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Inner shadow crescent
  ctx.fillStyle = 'rgba(10, 12, 18, 0.38)';
  ctx.beginPath();
  ctx.arc(x + r * 0.08, y + r * 0.08, r * 0.84, 0, Math.PI * 2);
  ctx.fill();

  // Crater floor
  ctx.fillStyle = floorColor;
  ctx.beginPath();
  ctx.arc(x + r * 0.14, y + r * 0.14, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
}

function renderSaturnTexture(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const rng = mulberry32(601);

  // Rich Cassini-accurate golden-butterscotch/amber cloud zones & darker ochre belts
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#456f6c'); // North polar bluish-teal hexagonal vortex region
  grad.addColorStop(0.08, '#6c7c66');
  grad.addColorStop(0.16, '#9c8356');
  grad.addColorStop(0.25, '#d4b176'); // North Temperate Zone
  grad.addColorStop(0.34, '#a67f48'); // North Temperate Belt
  grad.addColorStop(0.43, '#dec085'); // North Tropical Zone
  grad.addColorStop(0.50, '#ead099'); // Bright Equatorial Zone
  grad.addColorStop(0.57, '#ae864e'); // South Equatorial Belt
  grad.addColorStop(0.67, '#cfb078'); // South Temperate Zone
  grad.addColorStop(0.77, '#997546'); // South Temperate Belt
  grad.addColorStop(0.88, '#756142');
  grad.addColorStop(1.0, '#444e4b'); // South Polar region

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Fine atmospheric zonal jet-stream bands (sharp horizontal definition)
  for (let i = 0; i < 64; i++) {
    const y = (i / 64) * h;
    const bandThickness = 1.5 + rng() * 5;
    const isBright = i % 2 === 0;
    ctx.fillStyle = isBright ? 'rgba(242, 216, 166, 0.16)' : 'rgba(78, 52, 22, 0.2)';
    ctx.fillRect(0, y, w, bandThickness);
  }

  // Subtle oval ammonia storm eddies along temperate belts
  for (let i = 0; i < 14; i++) {
    const sx = rng() * w;
    const sy = h * (0.22 + rng() * 0.56);
    const rx = 10 + rng() * 24;
    const ry = 3 + rng() * 5;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(236, 208, 158, 0.28)' : 'rgba(92, 64, 30, 0.28)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // North polar hexagonal jet stream accent
  ctx.fillStyle = 'rgba(54, 112, 110, 0.55)';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.04, w * 0.24, h * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  // Slight primordial warmer tint when t=0
  if (t < 0.9) {
    ctx.fillStyle = `rgba(140, 70, 20, ${(1 - t) * 0.16})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function renderMarsTexture(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const rng = mulberry32(404);

  // 1. Ancient Noachian Mars (Northern Oceanus Borealis + greenish-ochre continents)
  const ancientGrad = ctx.createLinearGradient(0, 0, 0, h);
  ancientGrad.addColorStop(0.0, '#d8e6f0');
  ancientGrad.addColorStop(0.12, '#104476');
  ancientGrad.addColorStop(0.42, '#1b649c');
  ancientGrad.addColorStop(0.52, '#3d7854');
  ancientGrad.addColorStop(0.78, '#965e34');
  ancientGrad.addColorStop(1.0, '#be9366');
  ctx.fillStyle = ancientGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Modern Vibrant Iron-Oxide Mars (Blended smoothly via t)
  const modernGrad = ctx.createLinearGradient(0, 0, 0, h);
  modernGrad.addColorStop(0.0, '#e6eef6'); // North Polar Ice Cap
  modernGrad.addColorStop(0.09, '#9e3e1c');
  modernGrad.addColorStop(0.32, '#cf511b');
  modernGrad.addColorStop(0.52, '#df5c24');
  modernGrad.addColorStop(0.76, '#a63814');
  modernGrad.addColorStop(0.92, '#872c10');
  modernGrad.addColorStop(1.0, '#eaf1f7'); // South Polar Ice Cap

  ctx.globalAlpha = t;
  ctx.fillStyle = modernGrad;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1.0;

  // Dark Basaltic Regions (Syrtis Major, Acidalia Planitia, Mare Erythraeum)
  ctx.fillStyle = t > 0.4 ? 'rgba(78, 28, 14, 0.55)' : 'rgba(22, 65, 92, 0.5)';
  ctx.beginPath();
  ctx.ellipse(w * 0.62, h * 0.45, w * 0.11, h * 0.14, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(w * 0.25, h * 0.34, w * 0.13, h * 0.11, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Valles Marineris Grand Canyon Scar
  ctx.strokeStyle = t > 0.4 ? '#4d1808' : '#123e5e';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.27, h * 0.53);
  ctx.bezierCurveTo(w * 0.34, h * 0.51, w * 0.42, h * 0.55, w * 0.49, h * 0.53);
  ctx.stroke();

  // Olympus Mons & Tharsis Shield Volcanoes
  ctx.fillStyle = 'rgba(155, 65, 30, 0.65)';
  ctx.beginPath();
  ctx.arc(w * 0.16, h * 0.42, w * 0.038, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(65, 20, 10, 0.75)';
  ctx.beginPath();
  ctx.arc(w * 0.16, h * 0.42, w * 0.012, 0, Math.PI * 2);
  ctx.fill();

  // Dust streaks & regolith texture speckle
  for (let i = 0; i < 220; i++) {
    const x = rng() * w;
    const y = h * 0.12 + rng() * h * 0.76;
    const r = 1 + rng() * 3.5;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(218, 118, 64, 0.22)' : 'rgba(84, 28, 12, 0.22)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crisp Martian Impact Craters (Gale, Jezero, Hellas)
  for (let i = 0; i < 45; i++) {
    const cx = rng() * w;
    const cy = h * 0.14 + rng() * h * 0.72;
    const cr = 3 + rng() * 12;
    drawImpactCrater(
      ctx,
      cx,
      cy,
      cr,
      'rgba(214, 120, 72, 0.42)',
      t > 0.4 ? 'rgba(128, 46, 18, 0.65)' : 'rgba(28, 86, 115, 0.6)'
    );
  }
}

function renderMoonTexture(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const rng = mulberry32(101);

  // Lunar Anorthositic Highlands base
  const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
  baseGrad.addColorStop(0, '#6a7078');
  baseGrad.addColorStop(0.5, '#969ca4');
  baseGrad.addColorStop(1, '#5e646c');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  // Dark Basaltic Maria (Mare Imbrium, Mare Tranquillitatis, Oceanus Procellarum)
  const maria = [
    { x: 0.34, y: 0.35, rx: 0.13, ry: 0.11, rot: 0.1 },
    { x: 0.58, y: 0.42, rx: 0.14, ry: 0.12, rot: 0.25 },
    { x: 0.46, y: 0.30, rx: 0.10, ry: 0.08, rot: -0.2 },
    { x: 0.24, y: 0.52, rx: 0.09, ry: 0.11, rot: 0.4 },
    { x: 0.70, y: 0.56, rx: 0.08, ry: 0.07, rot: -0.1 },
  ];
  maria.forEach((m) => {
    ctx.fillStyle = 'rgba(42, 46, 56, 0.75)';
    ctx.beginPath();
    ctx.ellipse(w * m.x, h * m.y, w * m.rx, h * m.ry, m.rot, 0, Math.PI * 2);
    ctx.fill();
  });

  // High-resolution multi-scale Lunar Craters (Tycho, Copernicus, Aristarchus)
  for (let i = 0; i < 95; i++) {
    const cx = rng() * w;
    const cy = h * 0.06 + rng() * h * 0.88;
    const cr = 2.5 + Math.pow(rng(), 2) * 20;
    drawImpactCrater(
      ctx,
      cx,
      cy,
      cr,
      'rgba(195, 202, 212, 0.55)',
      'rgba(78, 84, 94, 0.7)'
    );
  }

  // Tycho bright ejecta ray streaks
  ctx.strokeStyle = 'rgba(210, 216, 226, 0.25)';
  ctx.lineWidth = 1.5;
  const tychoX = w * 0.44;
  const tychoY = h * 0.74;
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + 0.2;
    ctx.beginPath();
    ctx.moveTo(tychoX, tychoY);
    ctx.lineTo(tychoX + Math.cos(ang) * 75, tychoY + Math.sin(ang) * 55);
    ctx.stroke();
  }

  // Lunar Magma Ocean glowing cracks when timeSlider is in ancient epoch (t < 0.4)
  if (t < 0.4) {
    const magmaAlpha = (0.4 - t) / 0.4;
    ctx.strokeStyle = `rgba(255, 95, 20, ${magmaAlpha * 0.8})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      const sx = rng() * w;
      const sy = rng() * h;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (rng() - 0.5) * 140, sy + (rng() - 0.5) * 90);
      ctx.stroke();
    }
  }
}

function renderEuropaTexture(ctx: CanvasRenderingContext2D, w: number, h: number, _t: number) {
  const rng = mulberry32(202);

  // Clean icy water-crust (slightly moderated brightness so it doesn't blow out)
  const iceGrad = ctx.createLinearGradient(0, 0, 0, h);
  iceGrad.addColorStop(0.0, '#c8d8e6');
  iceGrad.addColorStop(0.5, '#dbe6f0');
  iceGrad.addColorStop(1.0, '#b8cadb');
  ctx.fillStyle = iceGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle icy mottled patches (chaos terrain regions)
  for (let i = 0; i < 35; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(155, 118, 92, 0.18)' : 'rgba(180, 205, 226, 0.25)';
    ctx.beginPath();
    ctx.ellipse(rng() * w, rng() * h, 18 + rng() * 35, 10 + rng() * 20, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Iconic reddish-brown hydrated salt tidal lineae fractures
  for (let i = 0; i < 28; i++) {
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(138, 82, 52, 0.72)' : 'rgba(162, 108, 76, 0.48)';
    ctx.lineWidth = i % 4 === 0 ? 2.6 : 1.4;
    ctx.beginPath();
    const startX = rng() * w;
    const startY = rng() * h * 0.3;
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(
      startX + (rng() - 0.5) * 260,
      h * 0.35,
      startX + (rng() - 0.5) * 280,
      h * 0.72,
      (startX + (rng() - 0.5) * 240 + w) % w,
      h * (0.7 + rng() * 0.3)
    );
    ctx.stroke();
  }

  // Transverse cycloid ridges
  for (let i = 0; i < 16; i++) {
    ctx.strokeStyle = 'rgba(118, 72, 48, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const y0 = rng() * h;
    ctx.moveTo(0, y0);
    ctx.bezierCurveTo(w * 0.33, y0 + (rng() - 0.5) * 90, w * 0.66, y0 + (rng() - 0.5) * 90, w, y0);
    ctx.stroke();
  }
}

function renderEarthTexture(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const rng = mulberry32(303);

  // Vivid Sapphire Bathymetric Ocean Gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
  oceanGrad.addColorStop(0.0, '#dce8f2'); // Arctic sea ice
  oceanGrad.addColorStop(0.11, '#0f4c8a');
  oceanGrad.addColorStop(0.50, '#0a3366');
  oceanGrad.addColorStop(0.89, '#0f4c8a');
  oceanGrad.addColorStop(1.0, '#e3edf5'); // Antarctic ice sheet
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, w, h);

  // Hadean volcanic Earth tint when t < 0.3
  if (t < 0.3) {
    ctx.fillStyle = `rgba(145, 38, 14, ${(0.3 - t) * 2.2})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Shallow continental shelves & lush biophilic continents
  const continents = [
    { x: 0.22, y: 0.33, rx: 0.11, ry: 0.13, rot: 0.35, color: '#2e845a' },
    { x: 0.30, y: 0.64, rx: 0.07, ry: 0.16, rot: -0.22, color: '#246e4c' },
    { x: 0.52, y: 0.28, rx: 0.07, ry: 0.08, rot: 0.1, color: '#3f9160' },
    { x: 0.54, y: 0.51, rx: 0.085, ry: 0.16, rot: 0.08, color: '#ad8954' },
    { x: 0.69, y: 0.33, rx: 0.15, ry: 0.13, rot: -0.1, color: '#40925f' },
    { x: 0.68, y: 0.46, rx: 0.04, ry: 0.06, rot: 0.1, color: '#539e66' },
    { x: 0.82, y: 0.67, rx: 0.065, ry: 0.07, rot: 0.05, color: '#c4834e' },
  ];

  continents.forEach((c) => {
    // Turquoise coastal shelf glow
    ctx.fillStyle = 'rgba(20, 168, 198, 0.52)';
    ctx.beginPath();
    ctx.ellipse(w * c.x, h * c.y, w * (c.rx + 0.014), h * (c.ry + 0.018), c.rot, 0, Math.PI * 2);
    ctx.fill();

    // Landmass
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.ellipse(w * c.x, h * c.y, w * c.rx, h * c.ry, c.rot, 0, Math.PI * 2);
    ctx.fill();
  });

  // Sahara / Arabian desert belt detail
  ctx.fillStyle = 'rgba(212, 168, 102, 0.78)';
  ctx.beginPath();
  ctx.ellipse(w * 0.55, h * 0.42, w * 0.09, h * 0.045, 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Wispy translucent cloud systems
  ctx.fillStyle = 'rgba(235, 245, 255, 0.28)';
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    const cx = rng() * w;
    const cy = h * (0.14 + rng() * 0.72);
    ctx.ellipse(cx, cy, w * (0.06 + rng() * 0.09), h * (0.015 + rng() * 0.018), (rng() - 0.5) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderMercuryTexture(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const rng = mulberry32(1010);

  // Basaltic/anorthositic charcoal-taupe Mercury crust
  const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
  baseGrad.addColorStop(0.0, '#6a6864');
  baseGrad.addColorStop(0.5, '#8e8b85');
  baseGrad.addColorStop(1.0, '#63615d');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  // Caloris Basin & smooth volcanic plains
  const basins = [
    { x: 0.38, y: 0.42, rx: 0.13, ry: 0.12 },
    { x: 0.72, y: 0.35, rx: 0.1, ry: 0.08 },
    { x: 0.18, y: 0.62, rx: 0.09, ry: 0.08 },
  ];
  basins.forEach((b) => {
    ctx.fillStyle = 'rgba(72, 69, 64, 0.55)';
    ctx.beginPath();
    ctx.ellipse(w * b.x, h * b.y, w * b.rx, h * b.ry, 0.15, 0, Math.PI * 2);
    ctx.fill();
  });

  // Dense multi-scale impact cratering + bright Kuiper/Hokusai ray craters
  for (let i = 0; i < 130; i++) {
    const cx = rng() * w;
    const cy = h * 0.06 + rng() * h * 0.88;
    const cr = 2 + Math.pow(rng(), 2) * 18;
    drawImpactCrater(ctx, cx, cy, cr, 'rgba(205, 202, 196, 0.52)', 'rgba(76, 74, 70, 0.7)');
  }

  // Bright ray streaks from young impact craters
  ctx.strokeStyle = 'rgba(224, 222, 216, 0.22)';
  ctx.lineWidth = 1.2;
  const rx0 = w * 0.61;
  const ry0 = h * 0.48;
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(rx0, ry0);
    ctx.lineTo(rx0 + Math.cos(ang) * 65, ry0 + Math.sin(ang) * 45);
    ctx.stroke();
  }

  // Primordial magma-rich early Mercury tint when t < 0.35
  if (t < 0.35) {
    const glow = (0.35 - t) / 0.35;
    ctx.fillStyle = `rgba(220, 88, 22, ${glow * 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function renderVenusTexture(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const rng = mulberry32(2020);

  // Ancient pre-runaway blue-amber surface tint if t < 0.35
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (t < 0.35) {
    grad.addColorStop(0.0, '#6e7f88');
    grad.addColorStop(0.5, '#a89268');
    grad.addColorStop(1.0, '#62737c');
  } else {
    grad.addColorStop(0.0, '#b5843e');
    grad.addColorStop(0.25, '#d6a45c');
    grad.addColorStop(0.5, '#e4ba78');
    grad.addColorStop(0.75, '#cf9b52');
    grad.addColorStop(1.0, '#a67634');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Super-rotating Y/chevron sulfuric acid cloud streaks
  for (let i = 0; i < 42; i++) {
    const y0 = (i / 42) * h;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(246, 222, 174, 0.24)' : 'rgba(130, 82, 28, 0.24)';
    ctx.lineWidth = 4 + rng() * 8;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    const dir = y0 < h * 0.5 ? 1 : -1;
    ctx.bezierCurveTo(
      w * 0.33,
      y0 + dir * 24,
      w * 0.66,
      y0 - dir * 18,
      w,
      y0
    );
    ctx.stroke();
  }

  // Subtle dark UV-absorber cloud swirls
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = 'rgba(145, 96, 38, 0.18)';
    ctx.beginPath();
    ctx.ellipse(rng() * w, h * (0.2 + rng() * 0.6), 40 + rng() * 80, 8 + rng() * 14, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderJupiterTexture(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const rng = mulberry32(5050);

  // Vibrant Juno/Cassini ammonia zones & rich rust-ochre equatorial belts
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#6e6a64'); // North Polar Blue-Grey Haze
  grad.addColorStop(0.12, '#a88966');
  grad.addColorStop(0.22, '#ebe0cc'); // N. Temperate Zone
  grad.addColorStop(0.30, '#b85c2e'); // N. Equatorial Belt
  grad.addColorStop(0.45, '#f2e6d2'); // Equatorial Zone
  grad.addColorStop(0.58, '#ab481f'); // S. Equatorial Belt
  grad.addColorStop(0.68, '#e8d6bc'); // S. Tropical Zone
  grad.addColorStop(0.77, '#c47c48'); // S. Temperate Belt
  grad.addColorStop(0.88, '#a38768');
  grad.addColorStop(1.0, '#666058'); // South Polar Region
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Fine high-velocity zonal cloud bands
  for (let i = 0; i < 72; i++) {
    const y = (i / 72) * h;
    const thick = 1.5 + rng() * 4.5;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(248, 236, 214, 0.2)' : 'rgba(118, 52, 20, 0.22)';
    ctx.fillRect(0, y, w, thick);
  }

  // Great Red Spot (Vibrant Southern Tropical Anticyclone)
  const grsX = w * 0.62;
  const grsY = h * 0.62;
  const grsGrad = ctx.createRadialGradient(grsX, grsY, 4, grsX, grsY, w * 0.068);
  grsGrad.addColorStop(0.0, '#b02e14');
  grsGrad.addColorStop(0.55, '#da4c22');
  grsGrad.addColorStop(0.82, '#eb8c54');
  grsGrad.addColorStop(1.0, 'rgba(220, 188, 152, 0)');
  ctx.fillStyle = grsGrad;
  ctx.beginPath();
  ctx.ellipse(grsX, grsY, w * 0.068, h * 0.052, 0, 0, Math.PI * 2);
  ctx.fill();

  // White oval storm vortices & turbulent festoons
  for (let i = 0; i < 20; i++) {
    const sx = rng() * w;
    const sy = h * (0.2 + rng() * 0.6);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(252, 244, 232, 0.38)' : 'rgba(136, 66, 32, 0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 8 + rng() * 18, 3 + rng() * 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (t < 0.7) {
    ctx.fillStyle = `rgba(170, 72, 22, ${(0.7 - t) * 0.25})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function renderUranusTexture(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const rng = mulberry32(7070);

  // Luminous ice-cyan/turquoise methane-haze atmosphere
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#b6f8ff'); // Bright polar haze cap
  grad.addColorStop(0.22, '#7cebf7');
  grad.addColorStop(0.50, '#3fd4ea'); // Smooth equatorial methane band
  grad.addColorStop(0.78, '#6ce2f0');
  grad.addColorStop(1.0, '#a8f2fb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle translucent zonal banding
  for (let i = 0; i < 24; i++) {
    const y = (i / 24) * h;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(215, 252, 255, 0.12)' : 'rgba(14, 116, 144, 0.10)';
    ctx.fillRect(0, y, w, 6 + rng() * 8);
  }

  if (t < 0.5) {
    ctx.fillStyle = `rgba(14, 74, 110, ${(0.5 - t) * 0.28})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function renderNeptuneTexture(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const rng = mulberry32(8080);

  // Vivid Deep Azure-Cobalt Methane Ice Giant
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#1e40af');
  grad.addColorStop(0.22, '#2563eb');
  grad.addColorStop(0.50, '#1d4ed8');
  grad.addColorStop(0.78, '#3b82f6');
  grad.addColorStop(1.0, '#172554');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // High-speed zonal cobalt belts
  for (let i = 0; i < 36; i++) {
    const y = (i / 36) * h;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(125, 185, 255, 0.2)' : 'rgba(15, 23, 92, 0.22)';
    ctx.fillRect(0, y, w, 3 + rng() * 6);
  }

  // Great Dark Spot anticyclone
  const gdsX = w * 0.42;
  const gdsY = h * 0.58;
  const gdsGrad = ctx.createRadialGradient(gdsX, gdsY, 3, gdsX, gdsY, w * 0.06);
  gdsGrad.addColorStop(0.0, '#0a1954');
  gdsGrad.addColorStop(0.7, '#162c78');
  gdsGrad.addColorStop(1.0, 'rgba(29, 78, 216, 0)');
  ctx.fillStyle = gdsGrad;
  ctx.beginPath();
  ctx.ellipse(gdsX, gdsY, w * 0.06, h * 0.044, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // Bright white high-altitude methane-ice cirrus clouds
  ctx.fillStyle = 'rgba(232, 246, 255, 0.62)';
  for (let i = 0; i < 18; i++) {
    const cx = rng() * w;
    const cy = h * (0.2 + rng() * 0.6);
    ctx.beginPath();
    ctx.ellipse(cx, cy, 18 + rng() * 35, 2 + rng() * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (t < 0.5) {
    ctx.fillStyle = `rgba(30, 27, 75, ${(0.5 - t) * 0.25})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function renderGenericPlanet(ctx: CanvasRenderingContext2D, w: number, h: number, _t: number) {
  ctx.fillStyle = '#112233';
  ctx.fillRect(0, 0, w, h);
}
