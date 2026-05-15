import { useCallback, useEffect, useMemo, useState } from "react";
import {
  COMMUNITY_REPUTATION_UPDATED_EVENT,
  readCommunityReputation,
  type CommunityReputationStoredV1,
} from "../../services/community/communityReputationStore";

export function CommunityReputationIntelligence({
  // Kept for backwards compatibility; trust now comes from the shared local store.
  analysisScoreAvg,
}: {
  analysisScoreAvg?: number;
}) {
  const [trustIndex, setTrustIndex] = useState<number>(0);

  const load = useCallback(() => {
    const stored: CommunityReputationStoredV1 | null = readCommunityReputation();
    if (!stored?.trustIndex || typeof stored.trustIndex !== "number") {
      // If store is empty, default to 0. (Legacy prop can be ignored.)
      setTrustIndex(0);
      return;
    }

    setTrustIndex(stored.trustIndex);
  }, []);

  useEffect(() => {
    load();

    const onCustom = () => {
      load();
    };

    const onStorage = (e: StorageEvent) => {
      // We don't know exact storage key here; but the store already dispatches an event.
      // Still, keep this for cross-tab fallback where CustomEvent won't fire.
      if (!e.key) load();
    };

    window.addEventListener(COMMUNITY_REPUTATION_UPDATED_EVENT, onCustom as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(COMMUNITY_REPUTATION_UPDATED_EVENT, onCustom as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [load]);

  const explanation = useMemo(() => {
    return "Trust index is computed from educational contributions and system-scored discussion quality. Stored locally.";
  }, []);

  // Silence unused prop warning explicitly (we intentionally ignore it now).
  void analysisScoreAvg;

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/70">Trust index</p>
          <p className="mt-2 text-4xl font-semibold text-white tabular-nums">{trustIndex}</p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-white/60">{explanation}</p>
    </section>
  );
}

export default CommunityReputationIntelligence;
