import type { DiscoveryEntity } from "./discoveryTypes";

const ENTITIES: DiscoveryEntity[] = [
  // ===== Sectors =====
  {
    id: "sec_banking",
    kind: "sector",
    title: "Banking",
    shortNarrative: "Liquidity-sensitive credit and payment posture within the current market structure.",
    keywords: ["bank", "banking", "nifty bank", "credit", "payments", "lending", "fiidii", "institutional"],
    relationshipTags: ["liquidity", "institutional", "defensive_context", "sector_pacing"],
    details: {
      confidenceEnvironmentHint: "Banking is interpreted as a structure lens: stability cues become more timing-sensitive when confidence turns elevated-risk.",
      marketContextHint: "Participation breadth and liquidity quality influence how clearly banking themes stand out.",
      relatedSectors: ["IT", "FMCG", "Infrastructure"],
      volatilityHint: "Volatility themes are treated as sensitivity texture, not as direction certainty.",
      liquidityHint: "Liquidity breadth changes how smoothly narratives translate into confidence environments.",
      institutionalHint: "Institutional posture is used as continuity context rather than a trade trigger.",
      behaviouralHint: "Momentum shifts are read as pacing changes; behavioural discipline stays supportive."
    }
  },
  {
    id: "sec_it",
    kind: "sector",
    title: "IT",
    shortNarrative: "Operational execution and selective momentum character under evolving confidence conditions.",
    keywords: ["it", "software", "tech", "infy", "wipro", "tcs", "services", "enterprise", "momentum"],
    relationshipTags: ["momentum", "efficiency_first", "institutional", "sector_rotation"],
    details: {
      confidenceEnvironmentHint: "IT is interpreted as efficiency and continuity: momentum weakening changes the pace, not the certainty of outcomes.",
      marketContextHint: "Liquidity and breadth affect whether tech themes feel dominant or secondary.",
      relatedSectors: ["Banking", "Infrastructure", "Auto"],
      volatilityHint: "Volatility expansion makes follow-through interpretation more selective.",
      liquidityHint: "Liquidity conditioning shapes how smoothly IT narratives adapt across sessions.",
      institutionalHint: "Institutional signals stabilize interpretation cadence under most environments.",
      behaviouralHint: "Over-reactive pacing is gently corrected through timeline framing."
    }
  },
  {
    id: "sec_energy",
    kind: "sector",
    title: "Energy",
    shortNarrative: "Cyclical sensitivity interpreted through margin texture and participation breadth.",
    keywords: ["energy", "oil", "refinery", "reliance", "cyclical", "margins", "sector"],
    relationshipTags: ["margin_texture", "breadth", "liquidity", "institutional_caution"],
    details: {
      confidenceEnvironmentHint: "Energy themes are treated as sensitivity texture: elevated-risk environments tighten narrative margins.",
      marketContextHint: "Breadth narrowing makes energy interpretations more noticeable even when headline conditions look stable.",
      relatedSectors: ["Banking", "Infrastructure", "Auto"],
      volatilityHint: "Volatility pressure changes interpretation speed; it does not guarantee outcomes.",
      liquidityHint: "Liquidity quality changes how clearly energy narratives remain interpretable.",
      institutionalHint: "Institutional posture is treated as stability context rather than a directional signal.",
      behaviouralHint: "Behavioural discipline is framed as pacing restraint during selective follow-through."
    }
  },
  {
    id: "sec_fmcg",
    kind: "sector",
    title: "FMCG",
    shortNarrative: "Defensive consumer posture interpreted with calm structure and selective momentum.",
    keywords: ["fmcg", "consumer", "hindustan", "hindu", "hindunilvr", "defensive", "stability"],
    relationshipTags: ["defensive_rotation", "consistency", "liquidity", "institutional_support"],
    details: {
      confidenceEnvironmentHint: "FMCG is interpreted as stability with context sensitivity: narratives stay calm and structural.",
      marketContextHint: "Breadth and liquidity changes influence whether FMCG feels dominant or softly present.",
      relatedSectors: ["Pharma", "Defence", "IT"],
      volatilityHint: "Volatility expansion is read as interpretation sensitivity, not panic.",
      liquidityHint: "Liquidity breadth affects how smoothly defensive narratives persist.",
      institutionalHint: "Institutional alignment supports continuity across defensive segments.",
      behaviouralHint: "Behaviour learning focuses on staying composed during selective environments."
    }
  },
  {
    id: "sec_pharma",
    kind: "sector",
    title: "Pharma",
    shortNarrative: "Operational discipline interpreted with margin/cash texture and institutional steadiness.",
    keywords: ["pharma", "drug", "sun pharma", "results", "margins", "defensive"],
    relationshipTags: ["margin_texture", "efficiency_first", "institutional", "stability"],
    details: {
      confidenceEnvironmentHint: "Pharma narratives emphasize business quality and operational discipline with calm interpretive boundaries.",
      marketContextHint: "Institutional caution or support changes the tone of interpretation.",
      relatedSectors: ["FMCG", "Defence", "Banking"],
      volatilityHint: "Elevated volatility makes interpretation tighter; it still remains probabilistic and measured.",
      liquidityHint: "Liquidity conditioning shapes how sharply narratives feel composed.",
      institutionalHint: "Institutional reaction is treated as continuity cue.",
      behaviouralHint: "Momentum chasing is gently discouraged by timeline reflection framing."
    }
  },
  {
    id: "sec_defence",
    kind: "sector",
    title: "Defence",
    shortNarrative: "Defensive expansion read as structural context, with institutional tone guiding interpretation pacing.",
    keywords: ["defence", "drdo", "defense", "expansion", "cyclical", "institutional"],
    relationshipTags: ["defensive_alignment", "institutional", "sector_pacing", "guarded_tone"],
    details: {
      confidenceEnvironmentHint: "Defence is interpreted as guarded expansion: future-facing commentary stays context-first.",
      marketContextHint: "Confidence environment changes how expansion intent is framed.",
      relatedSectors: ["Infrastructure", "Pharma", "FMCG"],
      volatilityHint: "Volatility sensitivity tightens guidance interpretation without predicting outcomes.",
      liquidityHint: "Liquidity breadth changes narrative clarity timing.",
      institutionalHint: "Institutional cues stabilize interpretation cadence.",
      behaviouralHint: "Behavioural discipline emphasizes incremental pacing rather than reaction."
    }
  },

  // ===== Themes =====
  {
    id: "th_defensive_rotation",
    kind: "theme",
    title: "Defensive Rotation",
    shortNarrative: "Cyclical attention migrates toward defensively framed participation as confidence tightens narrative margins.",
    keywords: ["defensive rotation", "rotation", "defensive", "cyclical", "fmcg", "healthcare", "discipline"],
    relationshipTags: ["institutional", "behavioural_equilibrium", "liquidity_narrowing", "sector_transition"],
    details: {
      confidenceEnvironmentHint: "Defensive rotation is treated as a context shift: narratives become more timing-sensitive under elevated-risk.",
      marketContextHint: "Breadth narrowing and liquidity selectivity often make defensive themes appear more noticeable.",
      relatedSectors: ["FMCG", "Pharma", "Defence"],
      volatilityHint: "Volatility is interpreted as sensitivity texture, not outcome certainty.",
      liquidityHint: "Liquidity narrowing supports a sharper interpretive lens.",
      institutionalHint: "Institutional participation is used as steadiness cue.",
      behaviouralHint: "Behavioural learning focuses on pacing restraint during selective environments."
    }
  },
  {
    id: "th_institutional_selective",
    kind: "theme",
    title: "Institutional Selectivity",
    shortNarrative: "Institutional participation becomes increasingly selective, shifting how confidence narratives are calibrated.",
    keywords: ["institutional", "fii", "dii", "fiidii", "selective", "block", "accumulation", "participation"],
    relationshipTags: ["institutional", "confidence_stabilising", "liquidity_texture", "narrative_pacing"],
    details: {
      confidenceEnvironmentHint: "Institutional selectivity tightens interpretive margins while maintaining calm context-first framing.",
      marketContextHint: "Breadth and liquidity quality influence how selective institutional behaviour reads in the environment.",
      relatedSectors: ["Banking", "IT", "Infrastructure"],
      volatilityHint: "Volatility changes sensitivity; institutional selectivity changes tone and pacing.",
      liquidityHint: "Liquidity breadth influences whether selectivity feels stabilising or restrictive.",
      institutionalHint: "Institutional posture is interpreted without certainty claims.",
      behaviouralHint: "Behavioural reflection emphasizes avoiding momentum chasing."
    }
  },
  {
    id: "th_liquidity_narrowing",
    kind: "theme",
    title: "Liquidity Narrowing",
    shortNarrative: "Liquidity breadth becomes more selective, making sector-level narratives stand out with calm precision.",
    keywords: ["liquidity", "breadth", "narrowing", "depth", "bid-ask", "order flow", "participation"],
    relationshipTags: ["liquidity", "breadth", "sector_themes", "confidence_continuity"],
    details: {
      confidenceEnvironmentHint: "Liquidity narrowing shifts attention into fewer narrative anchors; interpretation stays structured and measured.",
      marketContextHint: "Narrow liquidity typically increases the visibility of sector themes without implying outcomes.",
      relatedSectors: ["Energy", "Banking", "Infrastructure"],
      volatilityHint: "Volatility expansion may increase sensitivity; education remains calm and probabilistic.",
      liquidityHint: "Liquidity is treated as pacing variable, not direction certainty.",
      institutionalHint: "Institutional reaction remains continuity cue.",
      behaviouralHint: "Behavioural discipline is framed as calm incremental pacing."
    }
  },

  // ===== Market Narratives =====
  {
    id: "nar_defensive_capital_rotation",
    kind: "market_narrative",
    title: "Defensive capital rotation strengthening",
    shortNarrative: "Defensive capital rotation gradually strengthens across defensively framed segments, with calm narrative tightening.",
    keywords: ["defensive", "capital rotation", "strengthening", "fmcg", "pharma", "healthcare", "rotation"],
    relationshipTags: ["defensive_rotation", "liquidity", "institutional", "confidence_tightening"],
    details: {
      confidenceEnvironmentHint: "Interpretation becomes more context-sensitive as defensive rotation strengthens.",
      marketContextHint: "Liquidity breadth and institutional posture guide how narratives are calibrated.",
      relatedSectors: ["FMCG", "Pharma", "Defence"]
    }
  },
  {
    id: "nar_institutional_selective_technology",
    kind: "market_narrative",
    title: "Institutional selectivity within technology leadership",
    shortNarrative: "Institutional participation becomes increasingly selective within technology leadership, shaping interpretive tone.",
    keywords: ["technology", "institutional", "selective", "it", "leadership", "participation"],
    relationshipTags: ["institutional_selective", "momentum", "confidence_stabilising", "sector_rotation"],
    details: {
      confidenceEnvironmentHint: "Selectivity tightens interpretive margins without implying certainty of direction.",
      marketContextHint: "Narratives become more pacing-sensitive as confidence adapts."
    }
  },

  // ===== Behavioural Conditions =====
  {
    id: "beh_pacing_discipline",
    kind: "behavioural_condition",
    title: "Pacing discipline in selective environments",
    shortNarrative: "Behavioural sensitivity increases when environments tighten; calm pacing prevents reactive interpretation.",
    keywords: ["behavioural", "pacing", "discipline", "momentum", "reactive", "overtrade"],
    relationshipTags: ["behavioural_reflection", "confidence_boundary", "timeline_learning"],
    details: {
      behaviouralHint: "Behavioural learning cue: slow interpretation pace and re-evaluate exposure modules incrementally.",
      confidenceEnvironmentHint: "Elevated-risk or momentum-weakening environments make pacing more meaningful."
    }
  }
];

export function getDiscoveryIndex(): DiscoveryEntity[] {
  return ENTITIES;
}
