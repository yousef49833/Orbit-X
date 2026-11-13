/**
 * Grounded NASA research dataset for the Orbit-X mission lab.
 * Directly synchronized with /assets/orbitx/planetary_research_dataset_v3.json
 */

export interface ResearchDataSource {
  id: string;
  title: string;
  organization: string;
  url: string;
  purpose: string;
}

export interface PlanetaryVisualAsset {
  assetId: 'EARTH_3D' | 'MARS_3D' | 'EUROPA_3D';
  planetId: 'earth' | 'mars' | 'europa';
  displayOrder: number;
  name: string;
  commonName: string;
  objectType: string;
  parentBody?: string;
  roleInProject: string;
  previewImage: {
    title: string;
    url: string;
    sourcePageUrl: string;
    altText: string;
    credit: string;
    imageNote: string;
  };
  nasa3dModel: {
    title: string;
    pageUrl: string;
    providerCredit: string;
    availableDownloadFormats: string[];
    downloadNote: string;
    interactionNote: string;
  };
  sharedViewerUrl: string;
}

export const NASA_RESEARCH_METADATA = {
  title: 'Planetary Exploration Research: Mars, Earth\'s Moon, and Europa',
  preparedDate: '2026-11-13',
  attachmentPath: '/assets/orbitx/planetary_research_dataset_v3.json',
  scopeNote:
    'The landing-site locator covers Mars and the Moon (Jezero, Gale, Gusev, Meridiani, Shackleton, Taurus-Littrow, Descartes). Europa is included for scientific comparison only—no human surface landing site has been established due to severe Jovian magnetospheric radiation.',
  importantScientificCorrections: [
    'Shackleton Crater may contain water ice in permanently shadowed regions, but usable ice quantities require verification. The crater does not automatically shield a habitat from radiation—engineered shielding such as regolith cover is required.',
    'Ancient Mars (4.0–3.5 Bya) shows evidence of episodic flowing surface liquid water and a thicker past atmosphere. Europa\'s liquid water is a subsurface ocean beneath an icy crust, NOT an exposed surface sea or thick Earth-like atmosphere.',
    'Relative Site Suitability Index (%) values are illustrative screening indices derived from qualitative 1–5 hazard ratings—they are NOT NASA ratings, measured probabilities of survival, or engineering certifications.',
  ],
};

export const VERIFIED_GRAVITY_EQUATIONS = {
  weightEquation: 'W = m · g',
  weightDescription:
    'Weight in newtons (N) equals mass (kg) multiplied by local surface gravitational acceleration (m/s²). Mass remains invariant across worlds.',
  jumpEquation: 'h = v² / (2 · g)',
  jumpAssumptions: [
    'Identical vertical take-off speed v across compared worlds (derived from 1g Earth leap)',
    'Neglects atmospheric drag and spacesuit mass/traction constraints',
  ],
};

export const COSMIC_TIME_MACHINE_TEXTS = {
  intervalLabel: '4.0 to 3.5 Billion Years Ago',
  marsReadyToUseExplanation:
    'About 4.0 to 3.5 billion years ago, during the Late Noachian, Mars experienced periods when liquid water flowed across the surface and collected in valleys, lakes, and river deltas. Its atmosphere was likely more substantial than today\'s very thin atmosphere, although the exact climate and atmospheric pressure are still being investigated.',
  europaReadyToUseExplanation:
    'Between about 4.0 and 3.5 billion years ago, Europa may already have contained a salty ocean beneath its icy crust. Unlike ancient Mars, Europa\'s water is believed to remain underground, protected by ice, while Jupiter\'s radiation environment affects the surface.',
  comparisonNote:
    'Mars has geological evidence for ancient episodic surface rivers and lakes, whereas Europa is studied for a persistent subsurface saltwater ocean beneath an ice shell.',
};

export const BASE_GRID_SPECIFICATION = {
  purpose:
    'Preliminary 5×5 planning and visualization grid (A1–E5, C3 centre) around each reference coordinate. Visualization only—not a certified NASA landing or construction plan.',
  rows: 5,
  columns: 5,
  cellLabels: 'A1 through E5 (C3 = Centre)',
  nominalCellWidthM: 1000,
  warning: '1 km cell width is a planning visualization scale, not a NASA-certified habitat footprint.',
};

export const SITE_SUITABILITY_SCREENING = {
  displayLabel: 'Relative Site Suitability Index (%)',
  disclaimer:
    'Illustrative comparative screening scores based on broad environmental evidence and qualitative 1–5 hazard ratings (Radiation 40%, Thermal 35%, Terrain 25%). These are NOT NASA ratings, NOT survival probabilities, and NOT location-specific dosimetry. Real human safety depends on engineered shielding, mission duration, thermal control, and local topography.',
  weights: {
    radiationHazard: 0.4,
    thermalHazard: 0.35,
    terrainHazard: 0.25,
  },
  formula: 'Risk = 0.40·Rad + 0.35·Thermal + 0.25·Terrain  |  Index = 100 · (5 - Risk) / 4',
};

export const NASA_VISUAL_GALLERY = {
  sectionTitle: 'NASA 3D Planetary Visual Gallery',
  purpose:
    'NASA-sourced spacecraft/visualization preview imagery and official 3D model resources for Earth, Mars, and Europa.',
  sharedInteractiveViewer: {
    title: 'NASA Eyes on the Solar System',
    url: 'https://eyes.nasa.gov/apps/solar-system/',
    provider: 'NASA/JPL-Caltech',
    format: 'Browser-based interactive 3D solar-system visualization',
    description:
      'Explore planets, moons, and spacecraft in an interactive 3D solar-system environment using NASA mission data and imagery.',
  },
  implementationNotes: [
    'Still preview images are labeled "NASA Visualization / Spacecraft Imagery" and are separate from the interactive 3D model pages.',
    'Official NASA 3D Model links open NASA resource pages listing downloadable glTF and USDZ files; NASA Eyes launches the shared browser 3D viewer.',
  ],
  assets: [
    {
      assetId: 'EARTH_3D',
      planetId: 'earth',
      displayOrder: 1,
      name: 'Earth',
      commonName: 'Planet Earth',
      objectType: 'Planet',
      roleInProject:
        'Reference world for comparing planetary environments, gravity (9.81 m/s²), habitability, and exploration conditions.',
      previewImage: {
        title: 'NASA Blue Marble Earth',
        url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/climate/2023/12/ImageWall5_1920x1200-80.jpg',
        sourcePageUrl: 'https://science.nasa.gov/resource/blue-marble/',
        altText:
          'A full-globe view of Earth showing oceans, continents, and cloud systems against a dark background.',
        credit: 'NASA Goddard Space Flight Center; image by Reto Stöckli, with enhancements by Robert Simmon.',
        imageNote:
          'Static preview image (NASA Earth visualization, separate from the interactive 3D model file).',
      },
      nasa3dModel: {
        title: 'Earth 3D Model Interactive',
        pageUrl: 'https://science.nasa.gov/learn/heat/resource/earth-3d-model/',
        providerCredit: 'NASA/JPL-Caltech',
        availableDownloadFormats: ['glTF', 'USDZ'],
        downloadNote: 'Official NASA model page listing glTF and USDZ 3D model downloads.',
        interactionNote: 'Use the official NASA Earth 3D model page or launch NASA Eyes 3D.',
      },
      sharedViewerUrl: 'https://eyes.nasa.gov/apps/solar-system/',
    },
    {
      assetId: 'MARS_3D',
      planetId: 'mars',
      displayOrder: 2,
      name: 'Mars',
      commonName: 'The Red Planet',
      objectType: 'Planet',
      roleInProject:
        'Main exploration target for gravity comparison (3.73 m/s²), internal-structure research, rover landing records, and landing-site locator.',
      previewImage: {
        title: 'Mars True-Color Globe',
        url: 'https://svs.gsfc.nasa.gov/vis/a000000/a000600/a000659/mars_tc_globe3.jpg',
        sourcePageUrl: 'https://svs.gsfc.nasa.gov/659/',
        altText:
          'A global view of Mars in natural reddish-brown tones, showing major surface features and topography.',
        credit:
          'NASA Goddard Space Flight Center Scientific Visualization Studio; Viking imagery and MOLA topographic data.',
        imageNote:
          'Static preview image reused in the Mars Landing Site Locator overview.',
      },
      nasa3dModel: {
        title: 'Planet Mars 3D Model',
        pageUrl: 'https://science.nasa.gov/resource/planet-mars-3d-model/',
        providerCredit: 'NASA/JPL-Caltech',
        availableDownloadFormats: ['glTF', 'USDZ'],
        downloadNote: 'Official NASA model page listing glTF and USDZ 3D model downloads.',
        interactionNote: 'Interactive Mars model can be rotated by dragging on the NASA page.',
      },
      sharedViewerUrl: 'https://eyes.nasa.gov/apps/solar-system/',
    },
    {
      assetId: 'EUROPA_3D',
      planetId: 'europa',
      displayOrder: 3,
      name: 'Europa',
      commonName: "Jupiter's Moon Europa",
      objectType: 'Natural satellite',
      parentBody: 'Jupiter',
      roleInProject:
        'Icy-moon comparison target for Cosmic Time Machine and internal-structure research (excluded from human landing candidates).',
      previewImage: {
        title: 'A JunoCam View of Europa',
        url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia26/pia26331/PIA26331.jpg',
        sourcePageUrl: 'https://science.nasa.gov/photojournal/a-junocam-view-of-europa/',
        altText:
          "Jupiter's moon Europa shown as an icy world with long fractures, ridges, and bands across its surface.",
        credit: 'Image data: NASA/JPL-Caltech/SwRI/MSSS; image processing: Björn Jónsson (CC BY 3.0).',
        imageNote:
          'Spacecraft imagery reused in the Cosmic Time Machine Europa comparison context.',
      },
      nasa3dModel: {
        title: 'Europa 3D Model',
        pageUrl: 'https://science.nasa.gov/resource/europa-3d-model/',
        providerCredit: 'NASA Visualization Technology Applications and Development (VTAD)',
        availableDownloadFormats: ['glTF', 'USDZ'],
        downloadNote: 'Official NASA model page listing glTF and USDZ 3D model downloads.',
        interactionNote: 'Official NASA Europa 3D model resource or NASA Eyes 3D viewer.',
      },
      sharedViewerUrl: 'https://eyes.nasa.gov/apps/solar-system/',
    },
  ] as PlanetaryVisualAsset[],
};

export const MARS_PREVIEW_ASSET = NASA_VISUAL_GALLERY.assets.find((a) => a.assetId === 'MARS_3D')!;
export const EUROPA_PREVIEW_ASSET = NASA_VISUAL_GALLERY.assets.find((a) => a.assetId === 'EUROPA_3D')!;

export const KEY_NASA_DATA_SOURCES: ResearchDataSource[] = [
  {
    id: 'MARS_FACT_SHEET',
    title: 'NASA NSSDC Mars Fact Sheet (g = 3.73 m/s²)',
    organization: 'NASA NSSDC',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html?level=1',
    purpose: 'Reference Mars mean radius (3,389.5 km) and surface gravity (3.73 m/s²).',
  },
  {
    id: 'MOON_GRAVITY',
    title: 'NASA Glenn Moon Guide (g = 1.62 m/s²)',
    organization: 'NASA GRC',
    url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/moon/',
    purpose: 'Moon mean surface gravitational acceleration (~1.62 m/s²).',
  },
  {
    id: 'JPL_SATELLITE_PARAMETERS',
    title: 'JPL Planetary Satellite Parameters (Europa g = 1.315 m/s²)',
    organization: 'NASA JPL',
    url: 'https://ssd.jpl.nasa.gov/sats/phys_par/',
    purpose: 'GM = 3202.7121 km³/s² and mean radius = 1560.8 km for Europa gravity calculation.',
  },
  {
    id: 'INSIGHT_STRUCTURE_HIGHLIGHTS',
    title: 'InSight Science Highlights: Mars Crust, Mantle & Core',
    organization: 'NASA Science',
    url: 'https://science.nasa.gov/mission/insight/science-highlights/',
    purpose: 'Mars crust ~25–40 km thick beneath InSight and molten core radius ~1,800 km.',
  },
  {
    id: 'JUNO_EUROPA_ICE_2026',
    title: 'NASA Juno Measures Thickness of Europa\'s Ice Shell (Jan 2026)',
    organization: 'NASA / JPL',
    url: 'https://www.nasa.gov/missions/juno/nasas-juno-measures-thickness-of-europas-ice-shell/',
    purpose: 'Juno MWR regional estimate averaging ~29 km for Europa ice shell.',
  },
  {
    id: 'MOON_FACTS',
    title: 'NASA Moon Facts: Crust, Mantle & Core',
    organization: 'NASA Science',
    url: 'https://science.nasa.gov/moon/facts/',
    purpose: 'Moon near-side crust ~40 km (far-side up to ~60 km), solid inner core 240 km, liquid iron shell 90 km.',
  },
  {
    id: 'JEZERO_TOUCHDOWN_COORDINATES',
    title: 'Mars 2020 EDL Assessment (Perseverance 18.44463°N, 77.45088°E)',
    organization: 'NASA NTRS',
    url: 'https://ntrs.nasa.gov/citations/20210024644',
    purpose: 'Confirmed Perseverance touchdown coordinates and 2021-02-18 landing record.',
  },
  {
    id: 'OPPORTUNITY_MISSION',
    title: 'Mars Exploration Rover Opportunity (Meridiani Planum)',
    organization: 'NASA Science',
    url: 'https://science.nasa.gov/mission/mer-opportunity/',
    purpose: 'Opportunity touchdown coordinates (-1.9483°S, 354.47417°E) and 2004-01-25 UTC landing record.',
  },
  {
    id: 'NASA_EYES_SOLAR_SYSTEM',
    title: 'NASA Eyes on the Solar System',
    organization: 'NASA/JPL-Caltech',
    url: 'https://eyes.nasa.gov/apps/solar-system/',
    purpose: 'Browser-based interactive 3D solar-system visualization for Earth, Mars, and Europa.',
  },
];
