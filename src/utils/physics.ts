import { GravityCalcResult } from '../types';

export const EARTH_GRAVITY = 9.81; // m/s² (NASA reference baseline)

/**
 * Calculates dynamic gravity and jump mechanics
 * Formulas:
 *   Weight: W = m * g (Newtons)
 *   Idealized vertical jump height: h = v^2 / (2 * g)
 */
export function calculateGravityMetrics(
  weightEarthKg: number,
  jumpHeightEarthM: number,
  planetGravity: number
): GravityCalcResult {
  const safeMassKg = Math.max(1, weightEarthKg || 75);
  const safeJump = Math.max(0.05, jumpHeightEarthM || 0.5);
  const safeGravity = Math.max(0.1, planetGravity || 3.73);

  // Takeoff velocity derived from 1g Earth leap: v = sqrt(2 * g_earth * h_earth)
  const takeoffVelocityMs = Math.sqrt(2 * EARTH_GRAVITY * safeJump);

  // Idealized vertical jump height on target world: h = v^2 / (2 * g)
  const jumpHeightPlanetM = (takeoffVelocityMs * takeoffVelocityMs) / (2 * safeGravity);

  // Airtime (Hang Time): t = 2 * v / g
  const hangTimeEarthS = (2 * takeoffVelocityMs) / EARTH_GRAVITY;
  const hangTimePlanetS = (2 * takeoffVelocityMs) / safeGravity;

  // Weight in Newtons: W = m * g
  const weightEarthNewtons = safeMassKg * EARTH_GRAVITY;
  const weightPlanetNewtons = safeMassKg * safeGravity;

  // Earth-equivalent apparent weight (kgf)
  const weightPlanetKg = safeMassKg * (safeGravity / EARTH_GRAVITY);

  // Kinetic takeoff work: W_k = 0.5 * m * v^2 = m * g_earth * h_earth
  const kineticWorkJoules = safeMassKg * EARTH_GRAVITY * safeJump;

  const gravityRatio = safeGravity / EARTH_GRAVITY;

  return {
    weightEarthKg: Number(safeMassKg.toFixed(1)),
    weightPlanetKg: Number(weightPlanetKg.toFixed(1)),
    weightEarthNewtons: Math.round(weightEarthNewtons),
    weightPlanetNewtons: Math.round(weightPlanetNewtons),
    jumpHeightEarthM: Number(safeJump.toFixed(2)),
    jumpHeightPlanetM: Number(jumpHeightPlanetM.toFixed(2)),
    hangTimeEarthS: Number(hangTimeEarthS.toFixed(2)),
    hangTimePlanetS: Number(hangTimePlanetS.toFixed(2)),
    takeoffVelocityMs: Number(takeoffVelocityMs.toFixed(2)),
    kineticWorkJoules: Math.round(kineticWorkJoules),
    gravityRatio: Number(gravityRatio.toFixed(3)),
  };
}

/**
 * Maps latitude and longitude coordinates onto a 3D Sphere of given radius
 * @param lat Latitude in degrees (-90 to +90)
 * @param lon Longitude in degrees (-180 to +180 or 0 to 360)
 * @param radius Sphere radius
 */
export function latLonToVector3(lat: number, lon: number, radius: number): { x: number; y: number; z: number } {
  let normLon = lon;
  while (normLon > 180) normLon -= 360;
  while (normLon < -180) normLon += 360;

  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (normLon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return { x, y, z };
}

export interface MissionViabilityBreakdown {
  compositeScore: number;
  radiationScore: number;
  terrainScore: number;
  atmosphereScore: number;
  gravityMarginScore: number;
  thermalScore: number;
}

export function computeMissionViabilityScore(
  planet: {
    id: string;
    gravity: number;
    atmosphericDensityKgM3: number;
    surfaceMarkers: { id: string; safetyScore: number; hazardRatings?: { radiation: number; thermal: number; terrain: number } }[];
  },
  selectedMarker: {
    id: string;
    safetyScore: number;
    hazardRatings?: { radiation: number; thermal: number; terrain: number };
  } | null,
  timeSliderValue: number,
  explodedView: boolean,
  flightReadinessScore?: number
): MissionViabilityBreakdown {
  let radiationScore = 70;
  let terrainScore = 72;
  let atmosphereScore = 70;
  let gravityMarginScore = 82;
  let thermalScore = 70;

  if (planet.id === 'earth') {
    radiationScore = selectedMarker?.id === 'mauna-loa-observatory' ? 94 : 98;
    terrainScore = selectedMarker ? Math.round(selectedMarker.safetyScore) : 98;
    atmosphereScore = selectedMarker?.id === 'mauna-loa-observatory' ? 88 : 96;
    gravityMarginScore = selectedMarker?.id === 'kennedy-space-center' ? 92 : 84;
    thermalScore = 96;
  } else if (planet.id === 'mars') {
    const ancientBonus = Math.round(((100 - timeSliderValue) / 100) * 18);
    atmosphereScore = Math.min(92, 68 + ancientBonus);
    gravityMarginScore = 82;

    if (selectedMarker?.id === 'MARS_JEZERO_PERSEVERANCE') {
      radiationScore = 62; // Surface GCR (~0.64 mSv/day ambient)
      terrainScore = 78;   // River delta + ancient lake bed (slopes/boulders require hazard avoidance)
      thermalScore = Math.min(88, 60 + ancientBonus);
    } else if (selectedMarker?.id === 'MARS_GALE_CURIOSITY') {
      radiationScore = 62;
      terrainScore = 73;   // Alluvial fan near steep Mount Sharp layered slopes
      thermalScore = Math.min(88, 62 + ancientBonus);
    } else if (selectedMarker?.id === 'MARS_GUSEV_SPIRIT') {
      radiationScore = 61;
      terrainScore = 80;   // Flatter volcanic/impact basin plains
      thermalScore = Math.min(86, 59 + ancientBonus);
    } else if (selectedMarker?.id === 'MARS_MERIDIANI_OPPORTUNITY') {
      radiationScore = 60;
      terrainScore = 86;   // Smooth hematite plains
      thermalScore = Math.min(87, 61 + ancientBonus);
    } else {
      radiationScore = 61;
      terrainScore = 77;
      thermalScore = Math.min(87, 60 + ancientBonus);
    }
  } else if (planet.id === 'moon') {
    atmosphereScore = 32; // Airless exosphere (zero aerobraking)
    gravityMarginScore = 94;

    if (selectedMarker?.id === 'MOON_SHACKLETON_CRATER') {
      radiationScore = 44; // No global magnetic field; engineered regolith shielding required
      terrainScore = 64;   // Steep crater rim + permanent shadow access challenges
      thermalScore = 68;   // Near-constant rim sunlight vs ultra-cold crater floor
    } else if (selectedMarker?.id === 'MOON_TAURUS_LITTROW_APOLLO17') {
      radiationScore = 42;
      terrainScore = 76;   // Valley floor between massifs
      thermalScore = 54;   // Severe 300°C diurnal swing
    } else if (selectedMarker?.id === 'MOON_DESCARTES_APOLLO16') {
      radiationScore = 42;
      terrainScore = 60;   // Hilly grooved highlands terrain
      thermalScore = 52;
    } else {
      radiationScore = 43;
      terrainScore = 67;
      thermalScore = 56;
    }
  } else if (planet.id === 'mercury') {
    radiationScore = 18; // Intense solar particle & unshielded X-ray flux
    terrainScore = 52;
    atmosphereScore = 12; // Negligible exosphere
    gravityMarginScore = 84;
    thermalScore = 16; // -180°C to +430°C extreme diurnal swing
  } else if (planet.id === 'venus') {
    radiationScore = 58; // Cloud-top / orbital shielding, crushed surface
    terrainScore = 24;
    atmosphereScore = 15; // 92 bar supercritical CO2 & H2SO4 clouds
    gravityMarginScore = 62;
    thermalScore = 12; // +462°C surface
  } else if (planet.id === 'jupiter') {
    radiationScore = 12; // Lethal Jovian synchrotron radiation belts
    terrainScore = 30;
    atmosphereScore = 35;
    gravityMarginScore = 24; // 24.79 m/s² deep gravity well
    thermalScore = 30;
  } else if (planet.id === 'europa') {
    // Excluded from human landing; intense Jovian radiation belts
    radiationScore = 15;
    terrainScore = 38;
    atmosphereScore = 24;
    gravityMarginScore = 88;
    thermalScore = 34;
  } else if (planet.id === 'saturn') {
    if (selectedMarker?.id === 'titan-relay-staging') {
      radiationScore = 86;
      terrainScore = 91;
      atmosphereScore = 88;
      gravityMarginScore = 68;
      thermalScore = 82;
    } else {
      radiationScore = 44;
      terrainScore = 60;
      atmosphereScore = 54;
      gravityMarginScore = 52;
      thermalScore = 48;
    }
  } else if (planet.id === 'uranus') {
    radiationScore = 62;
    terrainScore = 45;
    atmosphereScore = 38;
    gravityMarginScore = 64;
    thermalScore = 22; // -224°C atmospheric minimum
  } else if (planet.id === 'neptune') {
    radiationScore = 60;
    terrainScore = 40;
    atmosphereScore = 34;
    gravityMarginScore = 50;
    thermalScore = 20; // Supersonic methane winds & cryogenic cloud decks
  }

  if (explodedView) {
    radiationScore = Math.max(12, radiationScore - 22);
    thermalScore = Math.max(15, thermalScore - 25);
  }

  const baseScore =
    radiationScore * 0.25 +
    terrainScore * 0.25 +
    atmosphereScore * 0.2 +
    gravityMarginScore * 0.15 +
    thermalScore * 0.15;

  const readinessMultiplier =
    flightReadinessScore !== undefined ? 0.72 + (flightReadinessScore / 100) * 0.36 : 1.0;

  const clampedScore = Math.max(10, Math.min(99, Math.round(baseScore * readinessMultiplier)));

  return {
    compositeScore: clampedScore,
    radiationScore,
    terrainScore,
    atmosphereScore,
    gravityMarginScore,
    thermalScore,
  };
}
