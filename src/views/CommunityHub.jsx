import React, { useState, useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import CommunityPostCard from '../components/CommunityPostCard';
import SentimentSidebar from '../components/SentimentSidebar';
import ContentFilterPills from '../components/ContentFilterPills';

// Mock dataset: Community activity across Indian exchange segments
const MOCK_COMMUNITY_DATA = [
  {
    postId: 'COMM_POST_1092',
    userNode: 'QUANT_INSIGHT_BLR',
    timestamp: '5 minutes ago',
    exchangeTag: 'NSE',
    title: 'Mapping structural multi-year sector trends across private banking nodes',
    rawContent: 'Historical charts for INFY indicate stable liquidity conditions. Market structure suggests equilibrium pricing across institutional holders.',
    associatedSentiment: 'STABLE',
    viewCount: 342,
    discussionCount: 18,
  },
  {
    postId: 'COMM_POST_1091',
    userNode: 'MACRO_ANALYST_MUM',
    timestamp: '22 minutes ago',
    exchangeTag: 'BSE',
    title: 'Cyclical patterns in pharmaceutical rotation cycles—historical precedent mapping',
    rawContent: 'Analysis of 15-year pharmaceutical sector cycles reveals consistent seasonal patterns. Current positioning aligns with historical deflation hedging strategies.',
    associatedSentiment: 'HEALTHY',
    viewCount: 521,
    discussionCount: 34,
  },
  {
    postId: 'COMM_POST_1090',
    userNode: 'TECH_RESEARCH_HYD',
    timestamp: '45 minutes ago',
    exchangeTag: 'NSE',
    title: 'Infrastructure monetization trends in telecom sector—15-year timeline analysis',
    rawContent: 'Review of telecom infrastructure cycles indicates current leverage ratios at historical lows. Asset monetization appears constrained by regulatory bandwidth.',
    associatedSentiment: 'VERY HEALTHY',
    viewCount: 687,
    discussionCount: 52,
  },
  {
    postId: 'COMM_POST_1089',
    userNode: 'FIN_STRATEGY_DEL',
    timestamp: '1 hour ago',
    exchangeTag: 'NSE',
    title: 'Credit cycle implications of external account dynamics',
    rawContent: 'Current CAD-to-GDP ratios suggest structural credit rebalancing. RBI liquidity framework indicates forward rate pressures.',
    associatedSentiment: 'WEAKENING',
    viewCount: 412,
    discussionCount: 28,
  },
  {
    postId: 'COMM_POST_1088',
    userNode: 'COMMODITY_TRACK',
    timestamp: '2 hours ago',
    exchangeTag: 'SME',
    title: 'Energy complex structural shifts—crude volatility clustering analysis',
    rawContent: 'Examination of crude volatility patterns suggests constrained supply dynamics. Historical precedent indicates multi-quarter adjustment periods.',
    associatedSentiment: 'UNHEALTHY',
    viewCount: 289,
    discussionCount: 16,
  },
];

// Defensive regex filter for SEBI-safe compliance
const BANNED_ADVISORY_TERMS = /\b(BUY NOW|STRONG BUY|SELL IMMEDIATELY|TARGET RS|TARGET PRICE|BUY CALLS|SHORT THIS|LONG THIS|MUST BUY|MUST SELL|HOLD RATING|OUTPERFORM|UNDERPERFORM)\b/gi;

const EXCHANGE_FILTERS = ['NSE', 'BSE', 'SME', 'ALL'];

const CommunityHub = () => {
  const [selectedExchange, setSelectedExchange] = useState('ALL');
  const [sortBy, setSortBy] = useState('recent');

  // Filter posts by selected exchange
  const filteredPosts = useMemo(() => {
    let filtered = MOCK_COMMUNITY_DATA;

    if (selectedExchange !== 'ALL') {
      filtered = filtered.filter((post) => post.exchangeTag === selectedExchange);
    }

    // Sort by selected criteria
    if (sortBy === 'recent') {
      // Keep original order (most recent first)
    } else if (sortBy === 'engagement') {
      filtered = [...filtered].sort((a, b) => b.discussionCount - a.discussionCount);
    }

    return filtered;
  }, [selectedExchange, sortBy]);

  // Aggregate sentiment metrics for sidebar
  const sentimentMetrics = useMemo(() => {
    const sentiments = {
      'VERY HEALTHY': filteredPosts.filter((p) => p.associatedSentiment === 'VERY HEALTHY').length,
      'HEALTHY': filteredPosts.filter((p) => p.associatedSentiment === 'HEALTHY').length,
      'STABLE': filteredPosts.filter((p) => p.associatedSentiment === 'STABLE').length,
      'WEAKENING': filteredPosts.filter((p) => p.associatedSentiment === 'WEAKENING').length,
      'UNHEALTHY': filteredPosts.filter((p) => p.associatedSentiment === 'UNHEALTHY').length,
    };

    const totalViews = filteredPosts.reduce((sum, p) => sum + p.viewCount, 0);
    const totalDiscussions = filteredPosts.reduce((sum, p) => sum + p.discussionCount, 0);

    return { sentiments, totalViews, totalDiscussions };
  }, [filteredPosts]);

  return (
    <div className="w-[calc(100vw-260px)] h-[calc(100vh-72px)] mt-[72px] overflow-y-auto bg-[#FAFAFA] p-8">
      {/* Header with Intelligence Audit Badge */}
      <div className="mb-8 flex items-center gap-3">
        <ShieldCheck className="w-4 h-4 text-[#0A0A0A]" strokeWidth={2.5} />
        <span className="font-mono text-[11px] font-medium tracking-wider text-[#525252] uppercase">
          Intelligence Audit Active • 256-Bit Encrypted Channel
        </span>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* Left/Center Column: Discussion Stream Feed */}
        <div className="xl:col-span-2 flex flex-col space-y-6">
          {/* Content Filter Pills */}
          <ContentFilterPills
            exchanges={EXCHANGE_FILTERS}
            selectedExchange={selectedExchange}
            onExchangeChange={setSelectedExchange}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          {/* Discussion Posts Grid */}
          <div className="flex flex-col space-y-6">
            {filteredPosts.length === 0 ? (
              <div className="bg-white border border-[#E5E5E5] rounded-none p-8 text-center">
                <p className="font-mono text-[11px] font-medium tracking-wider text-[#525252] uppercase">
                  No threads found
                </p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <CommunityPostCard
                  key={post.postId}
                  post={post}
                  bannedTermsRegex={BANNED_ADVISORY_TERMS}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Probabilistic Sentiment Analytics */}
        <SentimentSidebar metrics={sentimentMetrics} selectedExchange={selectedExchange} />
      </div>
    </div>
  );
};

export default CommunityHub;
