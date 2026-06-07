export const healthometerConfig = {
  scoring: {
    financialStrength: 25,
    marketBehaviour: 20,
    momentum: 15,
    institutionalConfidence: 20,
    valuationBalance: 20,
  },

  statuses: {
    excellent: 'very-healthy',
    strong: 'healthy',
    balanced: 'stable',
    caution: 'watchlist',
    weak: 'weakening',
    critical: 'unhealthy',
  },

  presentation: {
    style: 'institutional-cinematic',
    beginnerFriendly: true,
    advisoryLanguageDisabled: true,
  },
};
