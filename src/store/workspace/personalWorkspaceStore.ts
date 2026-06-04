import { loadAuthSession } from "../../services/auth/sessionStore";

export type WorkspaceRecentExplorationItem = {
  ticker: string;
  at: number;
};

export type WorkspaceSnapshot = {
  version: 1;

  recentExplored: WorkspaceRecentExplorationItem[]; // newest first
  pinnedCompanies: string[];
  favoriteSectors: string[];
  followedThemes: string[];

  // Lightweight dashboard preferences (extend later).
  analysisDepthPreference?: string;
};

type WorkspaceSubscriber = (snapshot: WorkspaceSnapshot) => void;

const WORKSPACE_EVENT_NAME = "workspacechange";

const STORAGE_KEY_BASE = "stockstory_workspace_v1";
const STORAGE_KEY_ANON = `${STORAGE_KEY_BASE}_anon`;

function nowMs(): number {
  return Date.now();
}

function normaliseTicker(ticker: string): string {
  return ticker.toUpperCase().trim();
}

function normaliseUid(uid?: string): string {
  return (uid ?? "").trim();
}

function resolveStorageKey(): string {
  // Cross-device persistence will later switch to Firebase/Firestore.
  // For now: localStorage keyed by UID (when available).
  const uid = normaliseUid(loadAuthSession().uid);
  if (!uid) return STORAGE_KEY_ANON;
  return `${STORAGE_KEY_BASE}_${uid}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadSnapshotFromStorage(): WorkspaceSnapshot {
  if (typeof window === "undefined") {
    return {
      version: 1,
      recentExplored: [],
      pinnedCompanies: [],
      favoriteSectors: [],
      followedThemes: [],
    };
  }

  const key = resolveStorageKey();
  const raw = window.localStorage.getItem(key);
  const parsed = safeParse<WorkspaceSnapshot>(raw);

  if (!parsed || parsed.version !== 1) {
    return {
      version: 1,
      recentExplored: [],
      pinnedCompanies: [],
      favoriteSectors: [],
      followedThemes: [],
    };
  }

  return {
    version: 1,
    recentExplored: Array.isArray(parsed.recentExplored) ? parsed.recentExplored : [],
    pinnedCompanies: Array.isArray(parsed.pinnedCompanies) ? parsed.pinnedCompanies : [],
    favoriteSectors: Array.isArray(parsed.favoriteSectors) ? parsed.favoriteSectors : [],
    followedThemes: Array.isArray(parsed.followedThemes) ? parsed.followedThemes : [],
    analysisDepthPreference: parsed.analysisDepthPreference,
  };
}

function saveSnapshotToStorage(snapshot: WorkspaceSnapshot): void {
  if (typeof window === "undefined") return;

  const key = resolveStorageKey();
  window.localStorage.setItem(key, JSON.stringify(snapshot));
}

function dispatchWorkspaceChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WORKSPACE_EVENT_NAME));
}

function clampRecent(items: WorkspaceRecentExplorationItem[], maxItems: number): WorkspaceRecentExplorationItem[] {
  // newest first expected
  return items.slice(0, maxItems);
}

class PersonalWorkspaceStore {
  private snapshot: WorkspaceSnapshot = loadSnapshotFromStorage();
  private subscribers: Set<WorkspaceSubscriber> = new Set();
  private started = false;

  private ensureLoaded(): void {
    if (this.started) return;
    this.started = true;
    this.snapshot = loadSnapshotFromStorage();
  }

  private emit(): void {
    const snap = this.getSnapshot();
    for (const fn of this.subscribers) fn(snap);
  }

  subscribe(fn: WorkspaceSubscriber): () => void {
    this.ensureLoaded();
    this.subscribers.add(fn);
    fn(this.snapshot);

    const onExternal = () => {
      this.snapshot = loadSnapshotFromStorage();
      fn(this.snapshot);
    };

    window.addEventListener(WORKSPACE_EVENT_NAME, onExternal);

    return () => {
      this.subscribers.delete(fn);
      window.removeEventListener(WORKSPACE_EVENT_NAME, onExternal);
    };
  }

  getSnapshot(): WorkspaceSnapshot {
    this.ensureLoaded();
    return this.snapshot;
  }

  private commit(next: WorkspaceSnapshot): void {
    this.snapshot = next;
    saveSnapshotToStorage(next);
    dispatchWorkspaceChange();
    this.emit();
  }

  addRecentExploration(ticker: string, maxItems = 18): void {
    const t = normaliseTicker(ticker);
    if (!t) return;

    this.ensureLoaded();

    const filtered = this.snapshot.recentExplored.filter((x) => normaliseTicker(x.ticker) !== t);
    const nextItem: WorkspaceRecentExplorationItem = { ticker: t, at: nowMs() };

    const next: WorkspaceSnapshot = {
      ...this.snapshot,
      recentExplored: clampRecent([nextItem, ...filtered], maxItems),
    };

    this.commit(next);
  }

  removeRecentExploration(ticker: string): void {
    const t = normaliseTicker(ticker);
    if (!t) return;

    this.ensureLoaded();

    const next: WorkspaceSnapshot = {
      ...this.snapshot,
      recentExplored: this.snapshot.recentExplored.filter((x) => normaliseTicker(x.ticker) !== t),
    };

    this.commit(next);
  }

  setPinnedCompanies(tickers: string[]): void {
    this.ensureLoaded();

    const nextPinned = Array.from(new Set(tickers.map(normaliseTicker).filter(Boolean)));
    const next: WorkspaceSnapshot = {
      ...this.snapshot,
      pinnedCompanies: nextPinned,
    };

    this.commit(next);
  }

  togglePinnedCompany(ticker: string): void {
    const t = normaliseTicker(ticker);
    if (!t) return;

    this.ensureLoaded();

    const has = this.snapshot.pinnedCompanies.includes(t);
    const nextPinned = has ? this.snapshot.pinnedCompanies.filter((x) => x !== t) : [t, ...this.snapshot.pinnedCompanies];

    const next: WorkspaceSnapshot = {
      ...this.snapshot,
      pinnedCompanies: nextPinned,
    };

    this.commit(next);
  }

  setFavoriteSectors(sectors: string[]): void {
    this.ensureLoaded();

    const nextSectors = Array.from(new Set(sectors.map((s) => s.trim()).filter(Boolean)));
    const next: WorkspaceSnapshot = {
      ...this.snapshot,
      favoriteSectors: nextSectors,
    };

    this.commit(next);
  }
}

export const personalWorkspaceStore = new PersonalWorkspaceStore();
