import React, { createContext, useState, useEffect, useCallback } from "react";

// Baseline static configuration for courses (fallback if localStorage is missing or corrupted)
const baselineProgressRegistry = {
  ACAD_SECTOR_ROTATION: {
    courseId: "ACAD_SECTOR_ROTATION",
    totalModules: 8,
    completedModules: 0,
    lastAccessedTimestamp: null,
    isMarkedComplete: false,
  },
  STORY_HDFC_EVOLUTION: {
    courseId: "STORY_HDFC_EVOLUTION",
    totalModules: 5,
    completedModules: 0,
    lastAccessedTimestamp: null,
    isMarkedComplete: false,
  },
};

const AcademyContext = createContext(undefined);

export const AcademyProvider = ({ children }) => {
  const [progressRegistry, setProgressRegistry] = useState({});

  // Hydration from localStorage with validation
  useEffect(() => {
    const raw = localStorage.getItem("SSI_ACADEMY_PROGRESS");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Very strict validation – ensure shape matches expectation
        if (parsed && typeof parsed === "object" && parsed.progressRegistry) {
          const validated = {};
          for (const [key, entry] of Object.entries(parsed.progressRegistry)) {
            if (
              entry &&
              entry.courseId &&
              typeof entry.totalModules === "number" &&
              typeof entry.completedModules === "number"
            ) {
              validated[key] = {
                courseId: entry.courseId,
                totalModules: entry.totalModules,
                completedModules: entry.completedModules,
                lastAccessedTimestamp: entry.lastAccessedTimestamp || null,
                isMarkedComplete: !!entry.isMarkedComplete,
              };
            }
          }
          setProgressRegistry(validated);
          return;
        }
      } catch (e) {
        console.warn("Failed to parse academy progress from localStorage", e);
      }
    }
    // Fallback to baseline if nothing valid was loaded
    setProgressRegistry(baselineProgressRegistry);
  }, []);

  // Helper to persist the entire registry to localStorage
  const persistRegistry = useCallback((registry) => {
    try {
      const payload = { progressRegistry: registry };
      localStorage.setItem("SSI_ACADEMY_PROGRESS", JSON.stringify(payload));
    } catch (e) {
      console.error("Failed to persist academy progress", e);
    }
  }, []);

  // Compute the progress vector for a specific course
  const computeCourseVector = useCallback(
    (courseId) => {
      const entry = progressRegistry[courseId];
      if (!entry) return { ratio: 0, isMarkedComplete: false };
      const { completedModules: C, totalModules: T } = entry;
      let R = T === 0 ? 0 : C / T;
      if (R > 1) R = 1;
      if (R < 0) R = 0;
      const isMarkedComplete = C >= T;
      // Update flag if needed
      if (isMarkedComplete && !entry.isMarkedComplete) {
        const updated = {
          ...entry,
          isMarkedComplete: true,
          lastAccessedTimestamp: new Date().toISOString(),
        };
        const newRegistry = { ...progressRegistry, [courseId]: updated };
        setProgressRegistry(newRegistry);
        persistRegistry(newRegistry);
      }
      return { ratio: R, isMarkedComplete };
    },
    [progressRegistry, persistRegistry]
  );

  // Increment completedModules for a course (simulated progress)
  const incrementModule = useCallback(
    (courseId) => {
      const entry = progressRegistry[courseId];
      if (!entry) return;
      const newCompleted = Math.min(entry.completedModules + 1, entry.totalModules);
      const updated = {
        ...entry,
        completedModules: newCompleted,
        lastAccessedTimestamp: new Date().toISOString(),
        isMarkedComplete: newCompleted >= entry.totalModules,
      };
      const newRegistry = { ...progressRegistry, [courseId]: updated };
      setProgressRegistry(newRegistry);
      persistRegistry(newRegistry);
    },
    [progressRegistry, persistRegistry]
  );

  // Clear all stored progress (used for verification UI)
  const clearAllProgress = useCallback(() => {
    localStorage.removeItem("SSI_ACADEMY_PROGRESS");
    setProgressRegistry(baselineProgressRegistry);
  }, []);

  const value = {
    progressRegistry,
    computeCourseVector,
    incrementModule,
    clearAllProgress,
    // New hooks for UI layers
    getProgress: (id) => computeCourseVector(id).ratio,
    markModuleComplete: (id) => incrementModule(id),
    getCourseProgress: (id) => computeCourseVector(id),
  };

  return <AcademyContext.Provider value={value}>{children}</AcademyContext.Provider>;
};

export const useAcademy = () => {
  const context = React.useContext(AcademyContext);
  if (context === undefined) {
    throw new Error("useAcademy must be used within AcademyProvider");
  }
  return context;
};

// Alias hook for UI components
export const useAcademyProgress = () => {
  const { getProgress, markModuleComplete, getCourseProgress } = useAcademy();
  return { getProgress, markModuleComplete, getCourseProgress };
};
