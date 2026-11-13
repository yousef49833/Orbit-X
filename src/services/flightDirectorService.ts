import type { MissionTelemetryState } from '../types';

export async function requestFlightDirectorBriefing(
  missionState: MissionTelemetryState,
  userQuery: string
) {
  return fetch('/api/telemetry-advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      missionState,
      userQuery,
    }),
  });
}
