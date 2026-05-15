import { useEffect, useMemo, useState } from "react";

type ExperienceLevel = "beginner" | "intermediate";

type BeginnerCalibration = {
  sessionsSeen: number;
  learningActions: number; // reserved for later (optional increments)
  lastAt: number;
};

const STORAGE_KEY = "beginner_intel_calibration_v1";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function safeParse(raw: string | null): BeginnerCalibration | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BeginnerCalibration>;
    if (typeof parsed.sessionsSeen !== "number") return null;
    if (typeof parsed.learningActions !== "number") return null;
    if (typeof parsed.lastAt !== "number") return null;

    return {
      sessionsSeen: Math.max(0, parsed.sessionsSeen),
      learningActions: Math.max(0, parsed.learningActions),
      lastAt: parsed.lastAt,
    };
  } catch {
    return null;
  }
}

export default function useBeginnerIntelligenceCalibration() {
  const [calibration, setCalibration] = useState<BeginnerCalibration>(() => ({
    sessionsSeen: 0,
    learningActions: 0,
    lastAt: Date.now(),
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = safeParse(raw);

    const now = Date.now();

    const next: BeginnerCalibration = {
      sessionsSeen: (parsed?.sessionsSeen ?? 0) + 1,
      learningActions: parsed?.learningActions ?? 0,
      lastAt: now,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCalibration(next);
  }, []);

  const experienceLevel: ExperienceLevel = useMemo(() => {
    // Simple, deterministic progression:
    // - First 1-2 sessions => beginner
    // - After that => intermediate
    return calibration.sessionsSeen <= 2 ? "beginner" : "intermediate";
  }, [calibration.sessionsSeen]);

  const simplificationIntensity = useMemo(() => {
    // Beginner => higher simplification (more plain language, fewer dense details)
    // Intermediate => lower simplification
    const target = experienceLevel === "beginner" ? 0.75 : 0.4;
    return clamp01(target);
  }, [experienceLevel]);

  const progress01 = useMemo(() => {
    // For UI pathway: map sessionsSeen (0..5) to 0..1
    return clamp01(calibration.sessionsSeen / 5);
  }, [calibration.sessionsSeen]);

  return {
    experienceLevel,
    simplificationIntensity,
    progress01,
    calibration,
    // reserved: future increments from user interactions
    // trackLearningAction: () => {}
  };
}
