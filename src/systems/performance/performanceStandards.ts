export const performanceStandards = {
  rendering: {
    avoidHeavyAnimationsOnMobile: true,
    prioritiseGPUFriendlyEffects: true,
    minimiseDashboardReRenders: true,
  },

  telemetry: {
    adaptiveDensity: true,
    lazyLoadSecondaryWidgets: true,
    prioritisePrimarySignals: true,
  },

  responsiveness: {
    mobileFirst: true,
    tabletOptimisation: true,
    desktopScaling: true,
  },

  experience: {
    smoothnessPriority: 'high',
    cinematicMotion: 'restrained',
    readabilityPriority: 'institutional',
  },
};
