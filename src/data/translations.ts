export type SupportedLanguage = 'en' | 'ar';

export interface TranslationDict {
  // Top Navbar
  appTitle: string;
  appSubtitle: string;
  captureRender: string;
  captureSuccess: string;
  audioOn: string;
  audioOff: string;
  checklistBtn: string;
  advisorBtn: string;
  universeHub: string;
  solarSystem: string;

  // 3D HUD & Controls
  sunIllumination: string;
  litSide: string;
  shadowSide: string;
  orbitSun: string;
  autoRotateOn: string;
  autoRotateOff: string;
  scanlineSweepActive: string;
  elevationScanResult: string;
  planetaryRings: string;
  resetView: string;
  coreExplodeToggle: string;
  coreCollapseToggle: string;

  // Feature Legend
  legendTitle: string;
  atmosphereLayer: string;
  tectonicPlates: string;
  magneticDipole: string;
  archaeologyMarkers: string;
  orbitalRadar: string;
  coreStratigraphy: string;

  // Modules
  modCoreTitle: string;
  modCoreSub: string;
  modTimeTitle: string;
  modTimeSub: string;
  modGravityTitle: string;
  modGravitySub: string;
  modArchaeologyTitle: string;
  modArchaeologySub: string;
  modBaseLocatorTitle: string;
  modBaseLocatorSub: string;
  modChecklistTitle: string;
  modChecklistSub: string;
  modTelemetryTitle: string;
  modTelemetrySub: string;

  // Gravity
  userMass: string;
  jumpDisplacement: string;
  flightAirtime: string;
  earthEquivalent: string;
  weightOnPlanet: string;

  // Time Machine
  primordialEpoch: string;
  presentEpoch: string;
  surfaceWater: string;
  atmosphericDensity: string;

  // AI Advisor
  advisorTitle: string;
  advisorStatus: string;
  voiceInput: string;
  inputPlaceholder: string;
  sendCommand: string;
  missionSuccessProb: string;
  threatLevel: string;
  downloadSnapshotTooltip: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDict> = {
  en: {
    appTitle: 'ORBIT-X',
    appSubtitle: 'NASA SPACE APPS // HOLOGRAPHIC MISSION SIMULATION',
    captureRender: 'CAPTURE HUD',
    captureSuccess: 'MISSION HUD CAPTURED // SAVED TO PNG',
    audioOn: 'AUDIO: ACTIVE',
    audioOff: 'AUDIO: MUTED',
    checklistBtn: 'FLIGHT CHECKLIST',
    advisorBtn: 'COMMANDER X AI',
    universeHub: 'COSMIC HUB',
    solarSystem: 'SOLAR SYSTEM',

    sunIllumination: 'SUN LIGHTING',
    litSide: 'LIT SIDE (DAY)',
    shadowSide: 'SHADOW SIDE (NIGHT)',
    orbitSun: 'ORBITING SUN',
    autoRotateOn: 'ROTATION: ON',
    autoRotateOff: 'ROTATION: OFF',
    scanlineSweepActive: 'LIDAR SCANLINE SWEEP ACTIVE',
    elevationScanResult: 'TERRAIN ELEVATION PROFILED',
    planetaryRings: 'PLANETARY RINGS',
    resetView: 'RESET ORBIT',
    coreExplodeToggle: 'EXPLODE CORE',
    coreCollapseToggle: 'COLLAPSE CORE',

    legendTitle: 'HOLOGRAPHIC LAYERS',
    atmosphereLayer: 'Atmospheric Envelope',
    tectonicPlates: 'Tectonic Plates & Rifts',
    magneticDipole: 'Magnetic Dipole Flux',
    archaeologyMarkers: 'Surface NASA Markers',
    orbitalRadar: 'Orbital Radar Ring',
    coreStratigraphy: 'Core Stratigraphy',

    modCoreTitle: 'PLANETARY CORE STRATIGRAPHY',
    modCoreSub: 'NASA InSight & Apollo Seismic Structural Model',
    modTimeTitle: 'COSMIC TIME MACHINE',
    modTimeSub: 'Geological Epoch & Ocean-Atmosphere Interpolation',
    modGravityTitle: 'DYNAMIC GRAVITY SIMULATOR',
    modGravitySub: 'Real-Time Kinematic Flight Path & Mobility Physics',
    modArchaeologyTitle: 'SPACE ARCHAEOLOGY // NASA TRACKER',
    modArchaeologySub: 'Holographic Ground Telemetry of Discarded Landers & Rovers',
    modBaseLocatorTitle: 'HABITAT BASE LOCATOR GUIDE',
    modBaseLocatorSub: 'Radiation Shielding & Thermal Habitation Zones',
    modChecklistTitle: 'MISSION READINESS CHECKLIST',
    modChecklistSub: 'Flight Certification & Go/No-Go Probability Engine',
    modTelemetryTitle: 'ENVIRONMENTAL TIME-SERIES TELEMETRY',
    modTelemetrySub: 'Atmospheric Pressure & Cosmic Radiation Across Geological Time',

    userMass: 'Astronaut Mass (kg)',
    jumpDisplacement: 'Earth Reference Jump (m)',
    flightAirtime: 'Estimated Airtime',
    earthEquivalent: 'Surface Gravity Ratio',
    weightOnPlanet: 'Effective Weight',

    primordialEpoch: 'Primordial Epoch',
    presentEpoch: 'Present Day',
    surfaceWater: 'Hydrosphere Coverage',
    atmosphericDensity: 'Atmospheric Density',

    advisorTitle: 'COMMANDER X // AI ADVISOR',
    advisorStatus: 'NEURAL LINK SYNCHRONIZED',
    voiceInput: 'Voice Comm',
    inputPlaceholder: 'Transmit technical query or tactical directive to Commander X...',
    sendCommand: 'TRANSMIT',
    missionSuccessProb: 'MISSION READINESS',
    threatLevel: 'THREAT INDEX',
    downloadSnapshotTooltip: 'Capture and download high-resolution holographic render with mission telemetry documentation (.PNG)',
  },
  ar: {
    appTitle: 'كوزموهولو 3D',
    appSubtitle: 'أوربيت-إكس // مختبر مهمات الفضاء لتحدي ناسا',
    captureRender: 'التقاط الشاشة',
    captureSuccess: 'تم التقاط بيانات المهمة // تم الحفظ بصيغة PNG',
    audioOn: 'الصوت: نشط',
    audioOff: 'الصوت: صامت',
    checklistBtn: 'قائمة الجاهزية',
    advisorBtn: 'المستشار الذكي X',
    universeHub: 'مركز الكون',
    solarSystem: 'المجموعة الشمسية',

    sunIllumination: 'إضاءة الشمس',
    litSide: 'الجانب المضاء (النهار)',
    shadowSide: 'جانب الظل (الليل)',
    orbitSun: 'دوران الشمس',
    autoRotateOn: 'الدوران: مفعّل',
    autoRotateOff: 'الدوران: متوقف',
    scanlineSweepActive: 'المسح الطوبوغرافي بالليزر قيد التشغيل',
    elevationScanResult: 'تم تحليل الارتفاع والتضاريس',
    planetaryRings: 'حلقات الكوكب',
    resetView: 'إعادة ضبط المدار',
    coreExplodeToggle: 'تفكيك النواة',
    coreCollapseToggle: 'إغلاق النواة',

    legendTitle: 'الطبقات الهولوغرافية',
    atmosphereLayer: 'الغلاف الجوي',
    tectonicPlates: 'الصفائح التكتونية والصدوع',
    magneticDipole: 'تدفق المجال المغناطيسي',
    archaeologyMarkers: 'معالم ومعدات ناسا',
    orbitalRadar: 'رادار المدار الفضائي',
    coreStratigraphy: 'طبقات النواة والوشاح',

    modCoreTitle: 'طبقات باطن الكوكب والجيولوجيا',
    modCoreSub: 'النموذج الزلزالي الداخلي استناداً لبيانات ناسا',
    modTimeTitle: 'آلة الزمن الكونية',
    modTimeSub: 'تطور الغلاف الجوي والمسطحات المائية عبر العصور',
    modGravityTitle: 'محاكي الجاذبية الديناميكي',
    modGravitySub: 'حساب مسار القفز والحركة الفيزيائية للطاقم',
    modArchaeologyTitle: 'علم الآثار الفضائية // متتبع معدات ناسا',
    modArchaeologySub: 'مواقع الهبوط التاريخية للمركبات والمسبارات الفضائية',
    modBaseLocatorTitle: 'دليل تحديد مواقع المستعمرات الآمنة',
    modBaseLocatorSub: 'تحليل دروع الحماية من الإشعاع والأنفاق البركانية',
    modChecklistTitle: 'قائمة الجاهزية للإطلاق الفضائي',
    modChecklistSub: 'مؤشر احتمالية نجاح المهمة واعتماد أنظمة الطيران',
    modTelemetryTitle: 'القياسات البيئية عبر العصور',
    modTelemetrySub: 'الضغط الجوي ومعدلات الإشعاع الكوني عبر الزمن',

    userMass: 'كتلة رائد الفضاء (كجم)',
    jumpDisplacement: 'ارتفاع القفزة المرجعية (م)',
    flightAirtime: 'زمن التحليق في الهواء',
    earthEquivalent: 'نسبة الجاذبية إلى الأرض',
    weightOnPlanet: 'الوزن الفعلي على الكوكب',

    primordialEpoch: 'العصر البدائي السحيق',
    presentEpoch: 'الوقت الحاضر',
    surfaceWater: 'نسبة المياه السطحية',
    atmosphericDensity: 'كثافة الغلاف الجوي',

    advisorTitle: 'القائد X // المستشار الذكي',
    advisorStatus: 'الرابط العصبي متزامن بنجاح',
    voiceInput: 'أوامر صوتية',
    inputPlaceholder: 'أرسل استفساراً تقنياً أو توجيهاً تكتيكياً للقائد X...',
    sendCommand: 'إرسال',
    missionSuccessProb: 'جاهزية المهمة',
    threatLevel: 'مؤشر الخطر',
    downloadSnapshotTooltip: 'تحميل لقطة هولوغرافية فائقة الجودة مع توثيق بيانات المهمة بصيغة PNG',
  },
};
