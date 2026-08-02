/**
 * Research Profile Store
 *
 * Local-first user research profile management with optional remote sync.
 * Mirrors watchlistStore.ts pattern: localStorage primary, Bearer token remote sync.
 * Never stores PII (no email, phone, passport). Research preferences only.
 */
import { loadAuthSession } from '../auth/sessionStore';
import { authenticatedFetchOnlyIfSignedIn } from '../auth/authenticatedFetch';
import type {
  UserResearchProfile,
  ResearchExperienceLevel,
  ResearchTimeHorizon,
  SectorPreference,
  RiskLevel,
} from '../../research/contracts/productContracts';

const STORAGE_KEY = 'stockstory_research_profile_v1';
const PROFILE_CHANGE_EVENT = 'researchprofilechange';

function dispatchProfileChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
}

export function subscribeProfile(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(PROFILE_CHANGE_EVENT, fn);
  return () => window.removeEventListener(PROFILE_CHANGE_EVENT, fn);
}

function resolveStorageKey(): string {
  const uid = loadAuthSession().uid || 'anonymous';
  return `${STORAGE_KEY}_${uid}`;
}

export function createDefaultProfile(uid?: string | null): UserResearchProfile {
  const now = new Date().toISOString();
  return {
    uid: uid ?? null,
    displayName: null,
    experienceLevel: 'beginner',
    timeHorizon: 'medium_term',
    sectorPreferences: [],
    maxRiskLevel: 'High',
    researchTopics: [],
    onboardingComplete: false,
    updatedAt: now,
    createdAt: now,
  };
}

let isInitialSyncStarted = false;

function syncProfileWithBackend(): void {
  if (typeof window === 'undefined') return;
  if (!loadAuthSession().uid) return; // signed out — local only

  authenticatedFetchOnlyIfSignedIn('/api/research-profile')
    .then(async (response) => {
      if (!response || !response.ok) return;
      const remote = await response.json() as UserResearchProfile | null;
      if (remote && remote.uid) {
        const key = resolveStorageKey();
        const local = getProfile();
        // Merge: remote wins for onboarding/first-load, local wins if newer
        if (!local || new Date(remote.updatedAt) > new Date(local.updatedAt)) {
          window.localStorage.setItem(key, JSON.stringify(remote));
        }
        dispatchProfileChange();
      }
    })
    .catch(() => {
      // Remote failure — local cache preserved
    });
}

export function getProfile(): UserResearchProfile {
  if (typeof window === 'undefined') return createDefaultProfile();

  if (!isInitialSyncStarted) {
    isInitialSyncStarted = true;
    syncProfileWithBackend();
  }

  const key = resolveStorageKey();
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    const def = createDefaultProfile(loadAuthSession().uid);
    window.localStorage.setItem(key, JSON.stringify(def));
    return def;
  }
  try {
    return JSON.parse(raw) as UserResearchProfile;
  } catch {
    return createDefaultProfile(loadAuthSession().uid);
  }
}

export function saveProfile(profile: UserResearchProfile): void {
  if (typeof window === 'undefined') return;
  profile.updatedAt = new Date().toISOString();
  const key = resolveStorageKey();
  window.localStorage.setItem(key, JSON.stringify(profile));
  dispatchProfileChange();

  // Async remote sync
  authenticatedFetchOnlyIfSignedIn('/api/research-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  }).catch(() => {
    // Remote failure — local preserved
  });
}

export function updateExperienceLevel(level: ResearchExperienceLevel): void {
  const profile = getProfile();
  profile.experienceLevel = level;
  saveProfile(profile);
}

export function updateTimeHorizon(horizon: ResearchTimeHorizon): void {
  const profile = getProfile();
  profile.timeHorizon = horizon;
  saveProfile(profile);
}

export function updateSectorPreference(sector: string, interested: boolean): void {
  const profile = getProfile();
  const existing = profile.sectorPreferences.find(s => s.sector === sector);
  if (existing) {
    existing.interested = interested;
  } else {
    profile.sectorPreferences.push({ sector, interested });
  }
  saveProfile(profile);
}

export function updateMaxRiskLevel(level: RiskLevel): void {
  const profile = getProfile();
  profile.maxRiskLevel = level;
  saveProfile(profile);
}

export function updateResearchTopics(topics: string[]): void {
  const profile = getProfile();
  profile.researchTopics = topics;
  saveProfile(profile);
}

export function completeOnboarding(): void {
  const profile = getProfile();
  profile.onboardingComplete = true;
  saveProfile(profile);
}

export function updateDisplayName(name: string): void {
  const profile = getProfile();
  profile.displayName = name;
  saveProfile(profile);
}

export function resetProfile(): void {
  if (typeof window === 'undefined') return;
  const key = resolveStorageKey();
  window.localStorage.removeItem(key);
  dispatchProfileChange();
}
