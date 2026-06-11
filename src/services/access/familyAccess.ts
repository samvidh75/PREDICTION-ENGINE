export type FamilyRole = "owner" | "adult" | "viewer";

export interface FamilyMember {
  id: string;
  name: string;
  role: FamilyRole;
}

export interface AccessPreferences {
  bharatLite: boolean;
  whatsappCompanionEnabled: boolean;
  externalApiAccess: boolean;
  familyMembers: FamilyMember[];
}

const STORAGE_KEY = "ss_access_preferences_v1";

const defaults: AccessPreferences = {
  bharatLite: false,
  whatsappCompanionEnabled: false,
  externalApiAccess: false,
  familyMembers: [],
};

export function loadAccessPreferences(): AccessPreferences {
  if (typeof window === "undefined") return defaults;
  try {
    return { ...defaults, ...JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return defaults;
  }
}

export function saveAccessPreferences(next: AccessPreferences): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("ss:access-preferences-changed", { detail: next }));
  }
}
