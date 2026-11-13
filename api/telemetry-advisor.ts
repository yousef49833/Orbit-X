import { GoogleGenAI } from '@google/genai';

const COMMANDER_X_SYSTEM_PROMPT = `You are Commander X, an elite holographic NASA Flight Director assisting Team Orbit-X in the Orbit-X Space Mission Design Lab.
Ground every scientific answer in verified NASA data across all 10 Solar System targets:
- Surface gravity: Mercury = 3.7 m/s², Venus = 8.87 m/s², Earth = 9.81 m/s² (baseline), Moon = 1.62 m/s², Mars = 3.73 m/s², Jupiter = 24.79 m/s², Europa = 1.315 m/s², Saturn = 10.44 m/s², Uranus = 8.69 m/s², Neptune = 11.15 m/s².
- Physics equations: Weight W = m * g (Newtons) and idealized jump height h = v^2 / (2 * g).
- Core Stratigraphy: Mars crust ~25-40 km, core ~1,800 km radius (deep P/T mostly N/A Model Dependent except ~1,605±100 K mantle discontinuity at 1,006 km); Moon near-side crust ~40 km, solid inner core 240 km + 90 km liquid Fe shell; Europa ice shell ~29 km (Juno Jan 2026 regional), subsurface ocean ~60-150 km; Mercury ~1,800 km iron core; Venus ~20-50 km crust; Jupiter/Saturn metallic H mantles; Uranus/Neptune ionic H2O-NH3-CH4 mantles.
- Mission Classifications: Mars & Moon = Human Surface Candidates; Earth = Launch & DSN Baseline; Mercury, Venus, Jupiter, Europa, Saturn, Uranus, Neptune = Orbital / Probe Mission Only.

Directly reference the user's live simulation parameters in every response (selected planet, era, active 3D feature layers, viability score XX/100, and selected landing site). Keep the tone authoritative, concise, and technically accurate.`;

interface VercelReq extends AsyncIterable<Uint8Array | string> {
  method?: string;
  body?: any;
}

interface VercelRes {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  write: (chunk: string) => void;
  end: (chunk?: string) => void;
}

async function readJsonBody(req: VercelReq): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  const decoder = new TextDecoder();
  let raw = '';
  for await (const chunk of req) {
    raw += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
  }
  raw += decoder.decode();
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body: any = {};
  try {
    body = await readJsonBody(req);
  } catch {
    body = {};
  }

  const { missionState, userQuery } = body;
  const apiKey = process.env.GEMINI_API_KEY;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.write(
      `data: ${JSON.stringify({
        text: '',
        isFinished: true,
        offlineMode: true,
        useClientFallback: true,
      })}\n\n`
    );
    res.end();
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const activeLayers = Array.isArray(missionState?.activeFeatureLayers)
      ? missionState.activeFeatureLayers.join(', ')
      : 'Atmospheric Rim, Tectonic Plates, Magnetic Field, Landing Sites, Orbital Grid';
    const uncheckedCritical =
      Array.isArray(missionState?.uncheckedCriticalSystems) &&
      missionState.uncheckedCriticalSystems.length > 0
        ? missionState.uncheckedCriticalSystems.join(', ')
        : 'None (All critical flight hardware verified)';

    const telemetryContext = `
LIVE ORBIT-X TELEMETRY MATRIX:
- Target Celestial Body: ${missionState?.planet || 'Mars'} (Render Mode: ${missionState?.surfaceRenderMode?.toUpperCase() || 'NASA'})
- Mission Viability Score: ${missionState?.missionViabilityScore ?? 80}/100
- Flight Hardware Readiness: ${missionState?.flightReadinessScore ?? 85}%
- Unchecked Critical Subsystems: ${uncheckedCritical}
- Active 3D Feature Layers: ${activeLayers}
- Temporal Era: ${missionState?.era || 'Present Day'}
- Geological Core State: ${missionState?.explodedView ? 'Exploded Core Active' : 'Nominal Solid Sphere'}
- Selected Site / Beacon: ${
      missionState?.selectedMarker
        ? `${missionState.selectedMarker.name} (Lat ${missionState.selectedMarker.lat}°, Lon ${missionState.selectedMarker.lon}°, Suitability Index: ${missionState.selectedMarker.safetyScore}%)`
        : 'Global Survey Orbit'
    }
- Surface Gravity: ${missionState?.gravity || 3.73} m/s² | Crew Mass: ${missionState?.userWeight || 75} kg | Ideal Jump Apex: ${missionState?.calcJump || 1.58} m

USER FLIGHT ENGINEER QUESTION:
${userQuery || 'Provide a Flight Director viability review and concrete steps to improve our mission score.'}
`;

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-4-hydrogen',
      config: {
        systemInstruction: COMMANDER_X_SYSTEM_PROMPT,
      },
      contents: telemetryContext,
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text, isFinished: false })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ text: '', isFinished: true })}\n\n`);
    res.end();
  } catch {
    res.write(
      `data: ${JSON.stringify({
        text: '',
        isFinished: true,
        offlineMode: true,
        useClientFallback: true,
      })}\n\n`
    );
    res.end();
  }
}
