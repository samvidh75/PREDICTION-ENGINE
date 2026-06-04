export type SecondaryStepKey = "sector" | "scanners" | "macro" | "health" | "institutional" | "feed";

export function seedFirstRunSecondaryKeys(args: {
  orderedKeys: SecondaryStepKey[];
  preferredStepKey: SecondaryStepKey;
  firstDashboardPending: boolean;
  maxLayers: number;
}): SecondaryStepKey[] {
  const { orderedKeys, preferredStepKey, firstDashboardPending, maxLayers } = args;

  if (!firstDashboardPending) return orderedKeys;

  const preferredIdx = orderedKeys.indexOf(preferredStepKey);
  if (preferredIdx <= 0) {
    return orderedKeys.slice(0, Math.max(1, maxLayers));
  }

  const preferred = orderedKeys[preferredIdx];
  const seeded = [preferred, ...orderedKeys.filter((x) => x !== preferred)];

  return seeded.slice(0, Math.max(1, maxLayers));
}

export function shouldUseCompactFeed(args: { firstDashboardPending: boolean; beginner: boolean }): boolean {
  return args.firstDashboardPending || args.beginner;
}
