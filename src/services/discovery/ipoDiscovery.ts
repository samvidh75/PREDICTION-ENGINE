export interface IpoCandidate {
  symbol: string;
  companyName: string;
  status: "upcoming" | "listed" | "unavailable";
  source: string | null;
  riskNotes: string[];
}

const STORAGE_KEY = "ss_ipo_candidates_v1";

export function loadIpoCandidates(): IpoCandidate[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveIpoCandidates(candidates: IpoCandidate[]): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
  }
}

export function analyseIpoCandidate(candidate: IpoCandidate): string {
  if (!candidate.source) return "Analysis unavailable until a source document or exchange filing is attached.";
  const notes = candidate.riskNotes.length > 0 ? candidate.riskNotes.join("; ") : "No risk notes supplied.";
  return `${candidate.companyName} IPO status: ${candidate.status}. Evidence: ${candidate.source}. Risk notes: ${notes}`;
}
