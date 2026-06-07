import React, { useState, useMemo, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import CommunityPostCard from '../components/CommunityPostCard';
import SentimentSidebar from '../components/SentimentSidebar';
import ContentFilterPills from '../components/ContentFilterPills';

// Defensive regex filter for SEBI-safe compliance
const BANNED_ADVISORY_TERMS = /\b(BUY NOW|STRONG BUY|SELL IMMEDIATELY|TARGET RS|TARGET PRICE|BUY CALLS|SHORT THIS|LONG THIS|MUST BUY|MUST SELL|HOLD RATING|OUTPERFORM|UNDERPERFORM)\b/gi;

const EXCHANGE_FILTERS = ['NSE', 'BSE', 'SME', 'ALL'];

const EMPTY_COMMUNITY_DATA = [];

const CommunityHub = () => {
  const [selectedExchange, setSelectedExchange] = useState('ALL');
  const [sortBy, setSortBy] = useState('recent');
  const [communityData, setCommunityData] = useState(EMPTY_COMMUNITY_DATA);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    fetch('/api/community/posts')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setCommunityData(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        setFetchError(err.message);
        setCommunityData([]);
        setLoading(false);
      });
  }, []);

  // Filter posts by selected exchange
  const filteredPosts = useMemo(() => {
    let filtered = communityData;

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
  }, [selectedExchange, sortBy, communityData]);

  // Aggregate sentiment metrics for sidebar
  const sentimentMetrics = useMemo(() => {
    const sentiments = {
      'VERY HEALTHY': filteredPosts.filter((p) => p.associatedSentiment === 'VERY HEALTHY').length,
      'HEALTHY': filteredPosts.filter((p) => p.associatedSentiment === 'HEALTHY').length,
      'STABLE': filteredPosts.filter((p) => p.associatedSentiment === 'STABLE').length,
      'WEAKENING': filteredPosts.filter((p) => p.associatedSentiment === 'WEAKENING').length,
      'UNHEALTHY': filteredPosts.filter((p) => p.associatedSentiment === 'UNHEALTHY').length,
    };

    const totalViews = filteredPosts.reduce((sum, p) => sum + (p.viewCount || 0), 0);
    const totalDiscussions = filteredPosts.reduce((sum, p) => sum + (p.discussionCount || 0), 0);

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
            {loading ? (
              <div className="bg-white border border-[#E5E5E5] rounded-none p-8 text-center">
                <p className="font-mono text-[11px] font-medium tracking-wider text-[#525252] uppercase">
                  Loading community feed...
                </p>
              </div>
            ) : fetchError ? (
              <div className="bg-white border border-[#E5E5E5] rounded-none p-8 text-center">
                <p className="font-mono text-[11px] font-medium tracking-wider text-[#525252] uppercase">
                  Community feed temporarily unavailable
                </p>
              </div>
            ) : filteredPosts.length === 0 ? (
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
