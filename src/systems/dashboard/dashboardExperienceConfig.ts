export const dashboardExperienceConfig = {
  hierarchy: {
    primaryFocus: 'market-storytelling',
    secondaryFocus: 'healthometer-signals',
    tertiaryFocus: 'institutional-context',
  },

  layout: {
    preserveWhitespace: true,
    adaptiveGrid: true,
    maximumPrimaryWidgets: 4,
    mobileFirstCompression: true,
  },

  telemetry: {
    adaptiveDensity: true,
    simplifyForBeginners: true,
    progressiveDisclosure: true,
    avoidDataOverload: true,
  },

  motion: {
    cinematicTransitions: true,
    restrainedAnimations: true,
    smoothSectionTransitions: true,
    hoverIntensity: 'subtle',
  },

  storytelling: {
    narrativePriority: true,
    founderStories: true,
    institutionalBehaviourContext: true,
    longTermBusinessEvolution: true,
  },
};
