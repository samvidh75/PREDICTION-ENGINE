import { useState } from "react";
import { Button } from "../../ui/Button";
import { createShareSnapshot } from "../../stockstory/share/ResearchShareService";
import type { SharedSnapshot } from "../../stockstory/share/ResearchShareTypes";

interface ShareResearchButtonProps {
  symbol: string;
  companyName: string;
  thesis: string;
  risks: string[];
  scores: Record<string, number>;
}

export function ShareResearchButton({ symbol, companyName, thesis, risks, scores }: ShareResearchButtonProps) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleShare = async () => {
    setGenerating(true);
    try {
      const snapshot = await createShareSnapshot({
        symbol,
        companyName,
        thesis,
        risks,
        scores,
      });
      if (snapshot) {
        const url = `${window.location.origin}/share/research/${snapshot.id}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // fallback — silently fail
    }
    setGenerating(false);
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleShare} disabled={generating}>
      {generating ? "Generating..." : copied ? "Copied!" : "Share Research"}
    </Button>
  );
}
