/**
 * CosmoHolo 3D - Type Definitions
 * Team Orbit-X // NASA Space Apps Challenge
 */

export interface GeologicalLayer {
  id: string;
  name: string;
  depthRange: string;
  thicknessKm: number;
  thicknessLabel?: string;
  composition: string;
  densityKgM3: number | null;
  pressureGpa: number | null;
  pressureNote?: string;
  temperatureK: number | null;
  temperatureNote?: string;
  color: string;
  emissiveColor: string;
  wireframeColor: string;
  description: string;
}

export interface SurfaceMarker {
  id: string;
  name: string;
  type: 'rover' | 'lander' | 'habitat_candidate' | 'natural_anomaly' | 'observatory';
  lat: number;
  lon: number;
  year?: string;
  landingDateUtc?: string;
  status: string;
  description: string;
  radiationLevel: string; // e.g. "0.64 ± 0.12 mSv/day GCR"
  terrainRoughness: string;
  instruments?: string[];
  safetyScore: number; // Relative Site Suitability Index (0 - 100)
  riskScore?: number; // Quantitative 1-5 weighted screening score
  hazardRatings?: {
    radiation: number;
    thermal: number;
    terrain: number;
  };
  confidenceNote?: string;
  scientificCorrection?: string;
}

export interface ChronologyEra {
  id: string;
  label: string;
  shortLabel: string;
  yearsAgo: string;
  sliderValue: number; // 0 to 100 (0 = 4.0 Bya, 100 = Present)
  waterCoveragePercent: number;
  atmosphericPressureBar: number;
  averageTempC: number;
  epochName: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface PlanetData {
  id: string;
  name: string;
  designation: string;
  category: string;
  radiusKm: number;
  massKg: string;
  gravity: number; // m/s^2
  escapeVelocityKmS: number;
  atmosphericComposition: string;
  surfacePressure: string;
  tempRangeC: string;
  orbitPeriodDays: number;
  geologicalLayers: GeologicalLayer[];
  surfaceMarkers: SurfaceMarker[];
  eras: ChronologyEra[];
  summary: string;
  baseColor: string;
  glowColor: string;
  atmosphericDensityKgM3: number; // Surface atmospheric density in kg/m³
  atmosphericDensityLabel: string; // e.g. "0.020 kg/m³ (~1.6% Earth)"
  atmosphereRingColor: string; // Hex color for the atmospheric ring
  atmosphericScaleHeightKm?: number; // Atmosphere scale height in km
  hasPlanetaryRings?: boolean; // Gas giant ring system flag
  ringInnerRadiusRatio?: number; // e.g. 1.35
  ringOuterRadiusRatio?: number; // e.g. 2.45
  ringColor?: string; // Hex color for ring particles
  ringTiltDeg?: number; // Axial tilt of rings in degrees
  excludeFromHumanLanding?: boolean;
  landingExclusionNote?: string;
  missionStatusMode?: 'human_candidate' | 'earth_observation' | 'orbital_probe_only';
}

export interface GravityCalcResult {
  weightEarthKg: number;
  weightPlanetKg: number;
  weightEarthNewtons: number;
  weightPlanetNewtons: number;
  jumpHeightEarthM: number;
  jumpHeightPlanetM: number;
  hangTimeEarthS: number;
  hangTimePlanetS: number;
  takeoffVelocityMs: number;
  kineticWorkJoules: number;
  gravityRatio: number;
}

export interface MissionTelemetryState {
  planet: string;
  planetId: string;
  era: string;
  waterCoverage: string;
  explodedView: boolean;
  selectedMarker: SurfaceMarker | null;
  gravity: number;
  userWeight: number;
  jumpHeight: number;
  hangTime: number;
  calcJump: number;
  missionViabilityScore: number;
  flightReadinessScore: number;
  activeFeatureLayers: string[];
  surfaceRenderMode: 'nasa' | 'wireframe';
  uncheckedCriticalSystems: string[];
}

export interface AdvisorMessage {
  id: string;
  sender: 'commander-x' | 'user' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  offlineMode?: boolean;
}

export interface SessionMissionLogEntry {
  id: string;
  timestamp: string;
  planetId: string;
  planetName: string;
  query: string;
  recommendation: string;
  threatLevel: 'NOMINAL' | 'MODERATE' | 'CRITICAL';
  successRate: number;
  targetSite?: string;
  tags: string[];
}

export interface FlightChecklistItem {
  id: string;
  label: string;
  system: 'LIFE_SUPPORT' | 'AVIONICS' | 'PROPULSION' | 'POWER_THERMAL' | 'SURFACE_ISRU';
  description: string;
  weightImpactPercent: number; // Percentage contribution to mission readiness
  requiredForGo: boolean;
  checked: boolean;
  techGlossaryKey?: string;
}

export interface PlanetaryFeatureVisibility {
  atmosphere: boolean;
  tectonicPlates: boolean;
  magneticField: boolean;
  surfaceMarkers: boolean;
  orbitalRadar: boolean;
  coreShells: boolean;
  planetaryRings?: boolean;
}

export interface SpaceGlossaryEntry {
  term: string;
  title: string;
  category:
    | 'ASTRODYNAMICS'
    | 'ATMOSPHERE'
    | 'GEOLOGY'
    | 'AVIONICS'
    | 'LIFE_SUPPORT'
    | 'RADIATION'
    | 'OPTICS'
    | 'PROPULSION';
  definition: string;
  formulaOrMetric?: string;
  missionRelevance: string;
}
