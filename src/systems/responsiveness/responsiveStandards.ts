export const responsiveStandards = {
  mobile: {
    priority: 'highest',
    telemetryDensity: 'minimal',
    navigationMode: 'stacked',
  },

  tablet: {
    telemetryDensity: 'balanced',
    layoutMode: 'adaptive-grid',
  },

  desktop: {
    telemetryDensity: 'rich-but-disciplined',
    layoutMode: 'institutional-dashboard',
  },

  readability: {
    preserveWhitespace: true,
    maintainHierarchy: true,
    avoidDashboardOverload: true,
  },
};
