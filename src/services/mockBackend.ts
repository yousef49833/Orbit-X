import {
  AdvisorMessage,
  MissionTelemetryState,
  PlanetaryFeatureVisibility,
  SessionMissionLogEntry,
} from '../types';

export type HabitatModuleType = 'HAB_DOME' | 'SOLAR_ARRAY' | 'ISRU_O2' | 'SHIELD_BUNKER';

export interface DeployedHabitatBase {
  id: string;
  planetId: string;
  siteId: string;
  cell: string; // e.g., "C3", "B2" in 5x5 grid A1-E5
  moduleType: HabitatModuleType;
  label: string;
  deployedAt: string;
}

export interface PersistedMissionState {
  version: number;
  selectedPlanetId: string;
  userWeight: number;
  jumpHeight: number;
  surfaceRenderMode: 'nasa' | 'wireframe';
  featureVisibility: PlanetaryFeatureVisibility;
  selectedGridCells: Record<string, string>; // key: `${planetId}:${siteId}` -> cell label e.g. "C3"
  deployedBases: DeployedHabitatBase[];
  chatMessages: AdvisorMessage[];
  missionLogs: SessionMissionLogEntry[];
  lastSyncedAt: string;
}

const STORAGE_KEY = 'orbitx_mission_state_v2';
const STATE_VERSION = 2;

export const DEFAULT_FEATURE_VISIBILITY: PlanetaryFeatureVisibility = {
  atmosphere: true,
  tectonicPlates: false,
  magneticField: false,
  surfaceMarkers: true,
  orbitalRadar: false,
  coreShells: true,
  planetaryRings: true,
};

export const DEFAULT_MISSION_LOGS: SessionMissionLogEntry[] = [
  {
    id: 'log-init-mars',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    planetId: 'mars',
    planetName: 'Mars',
    query: 'Jezero Crater Site Screening & Surface Radiation Baseline',
    recommendation: `[TACTICAL SITE SCREENING // MARS]
1. Verified Landing Baseline: Jezero Crater (18.44463°N, 77.45088°E) — Suitability Index 41.25% (comparative screening metric).
2. Surface Gravity: 3.73 m/s² (~0.38x Earth 9.81 m/s²), lowering crew weight W = m·g while requiring EVA gait damping.
3. GCR Baseline: ~234 mSv/yr (~0.64 mSv/day) recorded on Mars surface; engineered regolith or modular shielding required for extended stays.`,
    threatLevel: 'NOMINAL',
    successRate: 41,
    targetSite: 'Jezero Crater — Perseverance',
    tags: ['MARS', 'JEZERO', 'GCR'],
  },
];

function createDefaultState(): PersistedMissionState {
  return {
    version: STATE_VERSION,
    selectedPlanetId: 'mars',
    userWeight: 75,
    jumpHeight: 0.6,
    surfaceRenderMode: 'nasa',
    featureVisibility: { ...DEFAULT_FEATURE_VISIBILITY },
    selectedGridCells: {
      'mars:MARS_JEZERO_PERSEVERANCE': 'C3',
      'moon:MOON_SHACKLETON_CRATER': 'C3',
    },
    deployedBases: [
      {
        id: 'base-jezero-c3',
        planetId: 'mars',
        siteId: 'MARS_JEZERO_PERSEVERANCE',
        cell: 'C3',
        moduleType: 'HAB_DOME',
        label: 'Ares Alpha Hub (1 km grid visualization)',
        deployedAt: new Date().toISOString(),
      },
    ],
    chatMessages: [],
    missionLogs: [...DEFAULT_MISSION_LOGS],
    lastSyncedAt: new Date().toISOString(),
  };
}

class MockBackendService {
  private memoryFallback: PersistedMissionState = createDefaultState();

  private isStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const testKey = '__orbitx_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  public loadState(): PersistedMissionState {
    if (!this.isStorageAvailable()) {
      return this.memoryFallback;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const fresh = createDefaultState();
        this.saveFullState(fresh);
        return fresh;
      }
      const parsed = JSON.parse(raw) as Partial<PersistedMissionState>;
      const base = createDefaultState();
      return {
        ...base,
        ...parsed,
        featureVisibility: {
          ...DEFAULT_FEATURE_VISIBILITY,
          ...(parsed.featureVisibility || {}),
        },
        selectedGridCells: parsed.selectedGridCells || base.selectedGridCells,
        deployedBases: Array.isArray(parsed.deployedBases) ? parsed.deployedBases : base.deployedBases,
        chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
        missionLogs:
          Array.isArray(parsed.missionLogs) && parsed.missionLogs.length > 0
            ? parsed.missionLogs
            : base.missionLogs,
        lastSyncedAt: parsed.lastSyncedAt || new Date().toISOString(),
      };
    } catch {
      return createDefaultState();
    }
  }

  private saveFullState(state: PersistedMissionState): PersistedMissionState {
    const stamped: PersistedMissionState = {
      ...state,
      version: STATE_VERSION,
      lastSyncedAt: new Date().toISOString(),
    };
    this.memoryFallback = stamped;
    if (this.isStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
      } catch {
        // Ignore quota exceeded
      }
    }
    return stamped;
  }

  public patchState(partial: Partial<PersistedMissionState>): PersistedMissionState {
    const current = this.loadState();
    const next: PersistedMissionState = {
      ...current,
      ...partial,
      featureVisibility: partial.featureVisibility
        ? { ...current.featureVisibility, ...partial.featureVisibility }
        : current.featureVisibility,
    };
    return this.saveFullState(next);
  }

  public resetState(): PersistedMissionState {
    const fresh = createDefaultState();
    if (this.isStorageAvailable()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
    return this.saveFullState(fresh);
  }
}

export const mockBackend = new MockBackendService();

/**
 * Client-side deterministic NASA Flight Director fallback engine
 * Ensures Commander X always works seamlessly on Vercel or offline without server secrets.
 */
export function generateClientCommanderBriefing(
  state: MissionTelemetryState,
  rawQuery?: string
): string {
  const planet = state.planet || 'Mars';
  const planetId = (state.planetId || planet).toLowerCase();
  const score = state.missionViabilityScore ?? 80;
  const readiness = state.flightReadinessScore ?? 85;
  const marker = state.selectedMarker;
  const isOrbitalOnly = ['mercury', 'venus', 'jupiter', 'europa', 'saturn', 'uranus', 'neptune'].includes(planetId);
  const siteName = marker
    ? `${marker.name} (Suitability Index ${marker.safetyScore}%)`
    : planetId === 'europa'
    ? 'Excluded from Human Landing (Scientific Comparison Only)'
    : isOrbitalOnly
    ? 'Orbital / Probe Mission Only'
    : 'Global Orbital Survey';
  const gravity = state.gravity ?? 3.73;
  const mass = state.userWeight ?? 75;
  const weightN = Math.round(mass * gravity);
  const era = state.era || 'Present Day';
  const activeLayers = state.activeFeatureLayers || [];
  const unchecked = state.uncheckedCriticalSystems || [];
  const q = (rawQuery || '').toLowerCase();

  const statusTag =
    score >= 85
      ? 'GO FOR MISSION INSERTION'
      : score >= 70
      ? 'NOMINAL // OPTIMIZATIONS RECOMMENDED'
      : 'CAUTION // HIGH-RISK PARAMETERS DETECTED';

  const notes: Record<string, { hazard: string; physics: string; bestSite: string; core: string }> = {
    mercury: {
      hazard:
        'ORBITAL / PROBE MISSION ONLY: Ultra-thin exosphere, extreme -180°C to +430°C thermal swings, and high solar radiation flux prevent crewed surface habitats.',
      physics: `W = m·g = ${mass} kg × 3.70 m/s² = ${weightN} N (${(9.81 / 3.7).toFixed(2)}x Earth idealized jump apex).`,
      bestSite: 'MESSENGER & BepiColombo polar shadowed orbital reconnaissance (no human landing candidate).',
      core: 'Silicate crust ~100–200 km, thin ~400 km mantle, and oversized iron-rich core (~1,800 km radius / ~74% radius; P/T profiles N/A Model Dependent).',
    },
    venus: {
      hazard:
        'ORBITAL / PROBE MISSION ONLY: Crushing 92 bar supercritical CO₂ surface pressure, +462°C heat, and sulfuric acid cloud decks preclude crewed surface habitats.',
      physics: `W = m·g = ${mass} kg × 8.87 m/s² = ${weightN} N (~90% Earth weight).`,
      bestSite: 'NASA DAVINCI atmospheric descent probe to Alpha Regio & VERITAS radar mapping orbit.',
      core: 'Basaltic crust ~20–50 km (surface 737 K), ~2,800 km silicate mantle, ~3,200 km iron-nickel core (deep P/T N/A Model Dependent).',
    },
    mars: {
      hazard:
        'Mars atmospheric pressure is ~6.1 mbar (0.020 kg/m³), surface temperature spans -153°C to +20°C, and Curiosity RAD measured ~210 µGy/day (~0.64 ± 0.12 mSv/day GCR).',
      physics: `W = m·g = ${mass} kg × 3.73 m/s² = ${weightN} N (vs ${Math.round(mass * 9.81)} N Earth). Idealized jump h = v²/(2g) reaches ${state.calcJump} m.`,
      bestSite: 'Jezero Crater (18.44463°N, 77.45088°E) or Meridiani Planum (Suitability Index: 41.25%).',
      core: 'InSight constrains crust to ~25–40 km and molten core radius ~1,800 km (mantle discontinuity ~1,605 ± 100 K at 1,006 km; deep P/T otherwise N/A Model Dependent).',
    },
    moon: {
      hazard:
        'Vacuum exosphere without global magnetic shielding; polar PSR floors drop to -203°C. Engineered regolith shielding is mandatory—craters alone do not block cosmic radiation.',
      physics: `W = m·g = ${mass} kg × 1.62 m/s² = ${weightN} N. Idealized h = v²/(2g) yields ${(9.81 / 1.62).toFixed(2)}x Earth jump apex.`,
      bestSite: 'Shackleton Crater candidate region (-89.67°S, 129.78°E; Suitability Index 23.75%) or Apollo 17 Taurus-Littrow (21.25%).',
      core: 'Near-side crust ~40 km (far-side ~60 km), solid Fe-rich inner core 240 km + 90 km liquid iron shell; deep P/T profiles are N/A (Model Dependent).',
    },
    jupiter: {
      hazard:
        'ORBITAL / PROBE MISSION ONLY: Gas giant with no solid surface, crushing internal pressures, and lethal synchrotron magnetospheric radiation.',
      physics: `1-bar reference gravity g = 24.79 m/s² (2.53× Earth) yields W = m·g = ${weightN} N.`,
      bestSite: 'Juno polar orbit remote sensing & Galileo atmospheric probe entry trajectory (no solid surface).',
      core: '~20,000 km gaseous H/He envelope, ~40,000 km liquid metallic hydrogen, and dilute heavy-element core (Juno model-dependent P/T).',
    },
    europa: {
      hazard:
        'ORBITAL / PROBE MISSION ONLY (EXCLUDED FROM HUMAN LANDING): Severe Jovian magnetospheric radiation and cryogenic surface (50–140 K). Water exists as a subsurface ocean beneath ice—NOT an exposed surface sea.',
      physics: `JPL gravity g = 1.315 m/s² gives W = m·g = ${weightN} N (${(9.81 / 1.315).toFixed(2)}x Earth jump factor, scientific comparison only).`,
      bestSite: 'Remote flyby observation only (Europa Clipper) — no surface landing candidate.',
      core: 'Juno MWR (Jan 2026) estimates ~29 km regional ice shell above a 60–150 km global subsurface saltwater ocean; deep P/T are N/A (Model Dependent).',
    },
    earth: {
      hazard: '101.3 kPa N₂/O₂ atmosphere and magnetosphere protect surface crew (~3.1–5.2 mSv/yr).',
      physics: `1.0x Reference Baseline: W = m·g = ${mass} kg × 9.81 m/s² = ${weightN} N; escape velocity 11.19 km/s.`,
      bestSite: 'Kennedy Space Center LC-39A (28.5721°N, -80.6480°W) & Houston Mission Control JSC.',
      core: '40 km crust, 2,850 km silicate mantle, 2,260 km liquid Fe-Ni outer dynamo core, 1,221 km crystalline inner core.',
    },
    saturn: {
      hazard: 'ORBITAL / PROBE MISSION ONLY: Gas giant with no solid surface; intense inner magnetospheric radiation and ring-plane particle hazards.',
      physics: `1-bar reference gravity g = 10.44 m/s² yields W = m·g = ${weightN} N (1.06x Earth).`,
      bestSite: 'Cassini Grand Finale orbital survey & Titan-Enceladus outer staging trajectories.',
      core: 'Diffuse rock-ice core (~12,000 km radius) beneath ~30,000 km metallic hydrogen mantle (deep P/T N/A Model Dependent).',
    },
    uranus: {
      hazard:
        'ORBITAL / PROBE MISSION ONLY: Ice giant tilted 97.77° sideways with -224°C cloud tops, vertical rings, and no solid surface.',
      physics: `1-bar reference gravity g = 8.69 m/s² yields W = m·g = ${weightN} N (0.89x Earth).`,
      bestSite: 'Uranus Orbiter & Probe flyby / atmospheric entry corridor.',
      core: '~5,000 km H₂/He/CH₄ atmosphere, ~15,000 km hot supercritical water-ammonia-methane ionic mantle, ~5,362 km rocky core (P/T N/A Model Dependent).',
    },
    neptune: {
      hazard:
        'ORBITAL / PROBE MISSION ONLY: Outermost ice giant with 2,100 km/h supersonic methane winds, -218°C clouds, and no solid surface.',
      physics: `1-bar reference gravity g = 11.15 m/s² yields W = m·g = ${weightN} N (1.14x Earth).`,
      bestSite: 'Voyager 2 Great Dark Spot survey & future Neptune Odyssey orbiter.',
      core: '~5,000 km supersonic methane atmosphere, ~14,000 km hot ionic H₂O/NH₃/CH₄ mantle, ~5,622 km iron-silicate core (P/T N/A Model Dependent).',
    },
  };

  const n = notes[planetId] || notes.mars;
  let directAnswer = '';
  if (q.includes('improve') || q.includes('score') || q.includes('viability')) {
    directAnswer = `To raise viability above ${score}/100 on ${planet}: (1) Pin ${n.bestSite}; ${
      unchecked.length > 0
        ? `(2) Complete remaining critical checklist items (${unchecked.slice(0, 2).join(', ')}); `
        : `(2) Maintain ${readiness}% Flight Hardware Readiness; `
    }${state.explodedView ? '(3) Collapse Core view to restore nominal shielding margin.' : '(3) Keep Landing Sites & Magnetic Dipole overlays active.'}`;
  } else if (q.includes('land') || q.includes('site') || q.includes('safe') || q.includes('suitab')) {
    directAnswer = `Site Screening [${siteName}]: ${
      marker
        ? `Suitability Index ${marker.safetyScore}% (${marker.terrainRoughness}; ${marker.radiationLevel}). Illustrative screening score only.`
        : `No pin locked. Reference target: ${n.bestSite}`
    } ${n.hazard}`;
  } else if (q.includes('core') || q.includes('geolog') || q.includes('layer')) {
    directAnswer = `Geological Stratigraphy (${planet}): ${n.core}`;
  } else if (q.includes('grav') || q.includes('jump') || q.includes('weight')) {
    directAnswer = `Gravity Kinematics vs Earth (9.81 m/s²): ${n.physics}`;
  } else {
    directAnswer = `Telemetry brief (${planet}, ${era}): ${n.hazard} ${n.physics}`;
  }

  return `[COMMANDER X // NASA FLIGHT DIRECTOR]
Target: ${planet.toUpperCase()} | Viability: ${score}/100 (${statusTag})
Active Site: ${siteName} | Hardware Readiness: ${readiness}%
Active 3D Layers (${activeLayers.length}): ${activeLayers.length > 0 ? activeLayers.join(', ') : 'None'}

[TACTICAL ASSESSMENT]
${directAnswer}

[IMPROVEMENT DIRECTIVES]
• Reference Target: ${n.bestSite}
${unchecked.length > 0 ? `• Checklist Action: Verify [${unchecked.join(', ')}] to raise readiness.` : '• Hardware Status: All critical flight readiness checks verified GO.'}`;
}
