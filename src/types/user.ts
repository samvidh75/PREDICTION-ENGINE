export interface UserProfile {
  uid: string;
  tier: 'free' | 'elite';
  telemetryLimit: number; // Max parameters processed per session
  entitlements: {
    predictiveEngine: boolean;
    volumetricTelemetry: boolean;
  };
}

export default UserProfile;
