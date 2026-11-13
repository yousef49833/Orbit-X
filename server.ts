import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client with a clean Orbit-X mission control identity.
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "orbitx-flight-control",
        },
      },
    });
  }
  return genAIClient;
}

// NASA Flight Director System Prompt for Commander X
const COMMANDER_X_SYSTEM_PROMPT = `You are Commander X, an elite holographic NASA Flight Director assisting Team Orbit-X in the Orbit-X Space Mission Design Lab.
Ground every scientific answer in verified NASA data across all 10 Solar System targets:
- Surface gravity: Mercury = 3.7 m/s², Venus = 8.87 m/s², Earth = 9.81 m/s² (baseline), Moon = 1.62 m/s², Mars = 3.73 m/s², Jupiter = 24.79 m/s², Europa = 1.315 m/s², Saturn = 10.44 m/s², Uranus = 8.69 m/s², Neptune = 11.15 m/s².
- Physics equations: Weight W = m * g (Newtons) and idealized jump height h = v^2 / (2 * g).
- Core Stratigraphy: Mars crust ~25-40 km, core ~1,800 km radius (deep P/T mostly N/A Model Dependent except ~1,605±100 K mantle discontinuity at 1,006 km); Moon near-side crust ~40 km, solid inner core 240 km + 90 km liquid Fe shell; Europa ice shell ~29 km (Juno Jan 2026 regional), subsurface ocean ~60-150 km; Mercury ~1,800 km oversized iron core; Venus ~20-50 km crust, ~2,800 km mantle; Jupiter/Saturn metallic H mantles; Uranus/Neptune H2O-NH3-CH4 ionic ice mantles.
- Mission Classifications: Mars & Moon = Human Surface Candidates (with 5x5 planning grid; Mars Jezero/Gale/Gusev/Meridiani = 41.25% Relative Site Suitability Index; Moon Shackleton Crater = 23.75% requiring engineered regolith shielding). Earth = Launch & DSN Observation Baseline. Mercury, Venus, Jupiter, Europa, Saturn, Uranus, and Neptune = Orbital / Probe Mission Only (no human surface base).

You MUST directly reference the user's live simulation parameters in every response (selected planet, era, active 3D feature layers, viability score XX/100, and selected landing site). Keep the tone authoritative, futuristic, concise, and technically accurate using clean HUD tags ([FLIGHT DIRECTOR ASSESSMENT], [ACTIVE TELEMETRY], [IMPROVEMENT DIRECTIVES]).`;

// API Health
app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    system: "Orbit-X Flight Terminal",
    geminiConfigured: !!getGenAI(),
    timestamp: new Date().toISOString(),
  });
});

// Stream Flight Director response while preserving compatibility with legacy route aliases.
app.post(["/api/gemini/advisor", "/api/advisor", "/api/telemetry-advisor"], async (req, res) => {
  const { missionState, userQuery } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const ai = getGenAI();

  if (!ai) {
    const fallbackText = generateContextAwareFlightDirectorBriefing(missionState, userQuery);
    const words = fallbackText.split(" ");

    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(" ") + " ";
      res.write(`data: ${JSON.stringify({ text: chunk, isFinished: false })}\n\n`);
      await new Promise((r) => setTimeout(r, 28));
    }
    res.write(`data: ${JSON.stringify({ text: "", isFinished: true, offlineMode: true })}\n\n`);
    res.end();
    return;
  }

  try {
    const activeLayers = Array.isArray(missionState?.activeFeatureLayers)
      ? missionState.activeFeatureLayers.join(", ")
      : "Atmospheric Ring, Tectonic Plates, Magnetic Field, Landing Sites, Orbital Grid";

    const uncheckedCritical =
      Array.isArray(missionState?.uncheckedCriticalSystems) &&
      missionState.uncheckedCriticalSystems.length > 0
        ? missionState.uncheckedCriticalSystems.join(", ")
        : "None (All critical flight hardware verified)";

    const telemetryContext = `
LIVE ORBIT-X TELEMETRY MATRIX:
- Target Celestial Body: ${missionState?.planet || "Mars"} (Render Mode: ${missionState?.surfaceRenderMode?.toUpperCase() || "NASA"})
- Mission Viability Score: ${missionState?.missionViabilityScore ?? 80}/100
- Flight Hardware Readiness: ${missionState?.flightReadinessScore ?? 85}%
- Unchecked Critical Subsystems: ${uncheckedCritical}
- Active 3D Feature Layers: ${activeLayers}
- Temporal Era: ${missionState?.era || "Present Day"} (Exposed Surface Water: ${missionState?.waterCoverage || "0%"})
- Geological Core State: ${missionState?.explodedView ? "Core Exploded View Active (Crust-Mantle-Core Delaminated)" : "Nominal Solid Sphere"}
- Selected Site / Beacon: ${
      missionState?.selectedMarker
        ? `${missionState.selectedMarker.name} (Lat ${missionState.selectedMarker.lat}°, Lon ${missionState.selectedMarker.lon}°, Relative Suitability Index: ${missionState.selectedMarker.safetyScore}%, Radiation: ${missionState.selectedMarker.radiationLevel})`
        : missionState?.planetId === "europa"
        ? "Excluded from Human Landing (Scientific Comparison Only — Severe Jovian Radiation)"
        : "Global Survey Orbit (No specific site pinned)"
    }
- Surface Gravity: ${missionState?.gravity || 3.73} m/s² | Crew Mass: ${missionState?.userWeight || 75} kg | Weight: ${Math.round((missionState?.userWeight || 75) * (missionState?.gravity || 3.73))} N | Ideal Jump Apex: ${missionState?.calcJump || 1.58} m (Airtime: ${missionState?.hangTime || 1.15} s)

USER FLIGHT ENGINEER QUESTION:
${userQuery || "Provide a Flight Director viability review and concrete steps to improve our mission score."}
`;

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-4-hydrogen",
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

    res.write(`data: ${JSON.stringify({ text: "", isFinished: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error("Gemini API stream error:", error);
    const fallbackText = generateContextAwareFlightDirectorBriefing(missionState, userQuery);
    res.write(
      `data: ${JSON.stringify({
        text: fallbackText,
        isFinished: true,
        offlineMode: true,
      })}\n\n`
    );
    res.end();
  }
});

function generateContextAwareFlightDirectorBriefing(state: any, rawQuery?: string): string {
  const planet = state?.planet || "Mars";
  const planetId = (state?.planetId || planet).toLowerCase();
  const score = state?.missionViabilityScore ?? 80;
  const readiness = state?.flightReadinessScore ?? 85;
  const marker = state?.selectedMarker;
  const isOrbitalOnly = ["mercury", "venus", "jupiter", "europa", "saturn", "uranus", "neptune"].includes(planetId);
  const siteName = marker
    ? `${marker.name} (Suitability Index ${marker.safetyScore}%)`
    : planetId === "europa"
    ? "Excluded from Human Landing (Scientific Comparison Only)"
    : isOrbitalOnly
    ? "Orbital / Probe Mission Only"
    : "Global Orbital Survey";
  const gravity = state?.gravity ?? 3.73;
  const mass = state?.userWeight ?? 75;
  const weightN = Math.round(mass * gravity);
  const era = state?.era || "Present Day";
  const activeLayers: string[] = Array.isArray(state?.activeFeatureLayers)
    ? state.activeFeatureLayers
    : ["Atmospheric Rim & Glow", "Landing Sites & Beacons"];
  const unchecked: string[] = Array.isArray(state?.uncheckedCriticalSystems)
    ? state.uncheckedCriticalSystems
    : [];
  const q = (rawQuery || "").toLowerCase();

  const statusTag =
    score >= 85
      ? "GO FOR MISSION INSERTION"
      : score >= 70
      ? "NOMINAL // OPTIMIZATIONS RECOMMENDED"
      : "CAUTION // HIGH-RISK PARAMETERS DETECTED";

  const planetNotes: Record<string, { hazard: string; physics: string; bestSite: string; coreNote: string }> = {
    mercury: {
      hazard:
        "ORBITAL / PROBE MISSION ONLY: Ultra-thin exosphere, extreme -180°C to +430°C thermal swings, and intense solar flux preclude human habitats.",
      physics: `W = m·g = ${mass} kg × 3.70 m/s² = ${weightN} N (${(9.81 / 3.7).toFixed(2)}x Earth idealized jump apex).`,
      bestSite: "MESSENGER & BepiColombo polar shadowed orbital reconnaissance (no human landing candidate).",
      coreNote: "Silicate crust ~100–200 km, thin ~400 km mantle, and oversized iron-rich core (~1,800 km radius / ~74% radius; P/T profiles N/A Model Dependent).",
    },
    venus: {
      hazard:
        "ORBITAL / PROBE MISSION ONLY: Crushing 92 bar supercritical CO₂ surface pressure, +462°C heat, and sulfuric acid clouds preclude crewed habitats.",
      physics: `W = m·g = ${mass} kg × 8.87 m/s² = ${weightN} N (~90% Earth weight).`,
      bestSite: "NASA DAVINCI atmospheric descent probe to Alpha Regio & VERITAS orbital radar mapping.",
      coreNote: "Basaltic crust ~20–50 km (surface 737 K), ~2,800 km silicate mantle, ~3,200 km iron-nickel core (deep P/T N/A Model Dependent).",
    },
    mars: {
      hazard:
        "Mars atmospheric pressure is ~6.1 mbar (0.020 kg/m³), surface temperature spans -153°C to +20°C, and Curiosity RAD measured ~210 µGy/day (~0.64 ± 0.12 mSv/day GCR).",
      physics: `W = m·g = ${mass} kg × 3.73 m/s² = ${weightN} N (vs ${Math.round(mass * 9.81)} N on Earth). Idealized jump h = v²/(2g) scales 2.63x higher (${state?.calcJump || 1.58} m).`,
      bestSite: "Jezero Crater (18.44463°N, 77.45088°E) or Meridiani Planum (Suitability Index: 41.25%, illustrative screening score).",
      coreNote: "InSight constrains crust to ~25–40 km (3 layers) and molten core radius ~1,800 km; mantle discontinuity at ~1,006 km has model temp ~1,605 ± 100 K (deep P/T otherwise N/A Model Dependent).",
    },
    moon: {
      hazard:
        "No substantial atmosphere or global magnetic field; extreme diurnal & polar PSR temperatures (-203°C in permanent shadow). Engineered regolith shielding is mandatory—craters alone do not block radiation.",
      physics: `W = m·g = ${mass} kg × 1.62 m/s² = ${weightN} N. Idealized h = v²/(2g) yields ${(9.81 / 1.62).toFixed(2)}x Earth jump height.`,
      bestSite: "Shackleton Crater candidate region (-89.67°S, 129.78°E; Suitability Index 23.75%) or historic Taurus-Littrow Apollo 17 (21.25%).",
      coreNote: "Near-side crust ~40 km (far-side ~60 km), solid Fe-rich inner core 240 km + 90 km liquid iron shell; layer P/T profiles are N/A (Model Dependent).",
    },
    jupiter: {
      hazard:
        "ORBITAL / PROBE MISSION ONLY: Gas giant with no solid surface, 2.53x Earth gravity well, and lethal synchrotron radiation belts.",
      physics: `1-bar reference gravity g = 24.79 m/s² yields W = m·g = ${weightN} N (2.53x Earth).`,
      bestSite: "Juno polar orbit remote sensing & Galileo atmospheric probe entry trajectory.",
      coreNote: "~20,000 km gaseous H/He envelope, ~40,000 km liquid metallic hydrogen mantle, dilute core (P/T N/A Model Dependent).",
    },
    europa: {
      hazard:
        "EXCLUDED FROM HUMAN LANDING CANDIDATES: Severe Jovian magnetospheric radiation and cryogenic surface (50–140 K). Water exists only as a subsurface ocean beneath ice—never an exposed surface sea.",
      physics: `Derived JPL gravity g = 1.315 m/s² yields W = m·g = ${weightN} N and ${(9.81 / 1.315).toFixed(2)}x Earth idealized jump factor (for robotic/scientific comparison only).`,
      bestSite: "Orbital / flyby remote sensing only (Europa Clipper) — no surface landing site established.",
      coreNote: "Juno (Jan 2026) estimates ~29 km regional ice shell (older general 15–25 km) above a 60–150 km global subsurface saltwater ocean; deep P/T are N/A (Model Dependent).",
    },
    earth: {
      hazard:
        "101.3 kPa nitrogen-oxygen atmosphere protects surface (~3.1–5.2 mSv/yr) and drives ascent Max-Q structural loads.",
      physics: `1.0x Reference Baseline: W = m·g = ${mass} kg × 9.81 m/s² = ${weightN} N; escape velocity 11.19 km/s.`,
      bestSite: "Kennedy Space Center LC-39A (28.5721°N, -80.6480°W) & Houston Mission Control JSC.",
      coreNote: "40 km crust, 2,850 km silicate mantle, 2,260 km liquid Fe-Ni outer dynamo core, 1,221 km solid inner core.",
    },
    saturn: {
      hazard: "ORBITAL / PROBE MISSION ONLY: No solid surface; intense inner magnetospheric radiation and Roche-limit ring particle debris hazards.",
      physics: `1-bar reference gravity g = 10.44 m/s² yields W = m·g = ${weightN} N (1.06x Earth) with 35.5 km/s escape velocity.`,
      bestSite: "Cassini Grand Finale orbital survey & outer Titan-Enceladus trajectories.",
      coreNote: "Diffuse rock-ice core (~12,000 km radius) beneath ~30,000 km metallic hydrogen mantle (deep P/T N/A Model Dependent).",
    },
    uranus: {
      hazard: "ORBITAL / PROBE MISSION ONLY: Ice giant tilted 97.77° sideways with -224°C cloud tops, vertical rings, and no solid surface.",
      physics: `1-bar reference gravity g = 8.69 m/s² yields W = m·g = ${weightN} N (0.89x Earth).`,
      bestSite: "Uranus Orbiter & Probe flyby / atmospheric entry corridor.",
      coreNote: "~5,000 km H₂/He/CH₄ atmosphere, ~15,000 km supercritical H₂O/NH₃/CH₄ ionic mantle, ~5,362 km rocky core (P/T N/A Model Dependent).",
    },
    neptune: {
      hazard: "ORBITAL / PROBE MISSION ONLY: Outermost ice giant with 2,100 km/h supersonic methane winds, -218°C clouds, and no solid surface.",
      physics: `1-bar reference gravity g = 11.15 m/s² yields W = m·g = ${weightN} N (1.14x Earth).`,
      bestSite: "Voyager 2 Great Dark Spot survey & Neptune Odyssey orbiter trajectory.",
      coreNote: "~5,000 km supersonic methane atmosphere, ~14,000 km hot ionic H₂O/NH₃/CH₄ mantle, ~5,622 km iron-silicate core (P/T N/A Model Dependent).",
    },
  };

  const note = planetNotes[planetId] || planetNotes.mars;

  let directAnswer = "";
  if (q.includes("improve") || q.includes("score") || q.includes("viability")) {
    directAnswer = `To raise your Mission Viability Score above ${score}/100 on ${planet}: (1) Focus evaluation on ${note.bestSite}; ${
      unchecked.length > 0
        ? `(2) Verify remaining critical checklist items (${unchecked.slice(0, 2).join(", ")}); `
        : `(2) Maintain 100% Flight Hardware Readiness (${readiness}%); `
    }${state?.explodedView ? "(3) Collapse Exploded Core layers to restore nominal thermal/dynamo baseline." : "(3) Enable Landing Sites, Tectonic Faults & Magnetic Field Dipole overlays for corridor verification."}`;
  } else if (q.includes("land") || q.includes("site") || q.includes("analyz") || q.includes("safe") || q.includes("suitab")) {
    directAnswer = `Site analysis for [${siteName}] on ${planet}: ${
      marker
        ? `${marker.name} has a Relative Site Suitability Index of ${marker.safetyScore}% (${marker.terrainRoughness}; ${marker.radiationLevel}). Remember: this index is a qualitative project screening score, not a NASA safety guarantee.`
        : `No site pin locked yet. Reference target: ${note.bestSite}`
    } ${note.hazard}`;
  } else if (q.includes("core") || q.includes("geolog") || q.includes("layer")) {
    directAnswer = `Geological core briefing for ${planet}: ${note.coreNote} ${
      state?.explodedView
        ? "Core Exploded View is currently ACTIVE in 3D."
        : "Use 'Explode Core' to inspect concentric shells directly."
    }`;
  } else if (q.includes("grav") || q.includes("jump") || q.includes("weight") || q.includes("compar")) {
    directAnswer = `Gravity & Kinematics vs Earth (9.81 m/s²): ${note.physics}`;
  } else {
    directAnswer = `Telemetry brief for ${planet} (${era}): ${note.hazard} ${note.physics}`;
  }

  return `[COMMANDER X // NASA FLIGHT DIRECTOR]
Target: ${planet.toUpperCase()} | Viability: ${score}/100 (${statusTag})
Active Site: ${siteName} | Hardware Readiness: ${readiness}%
Active 3D Layers (${activeLayers.length}): ${activeLayers.length > 0 ? activeLayers.join(", ") : "None"}

[TACTICAL ASSESSMENT]
${directAnswer}

[IMPROVEMENT DIRECTIVES]
• Reference Target: ${note.bestSite}
${unchecked.length > 0 ? `• Checklist Action: Verify [${unchecked.join(", ")}] to raise readiness.` : "• Hardware Status: All critical flight readiness checks verified GO."}`;
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CosmoHolo 3D Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
