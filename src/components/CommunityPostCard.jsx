import React, { useMemo } from 'react';
import { AlertCircle, Eye, MessageCircle } from 'lucide-react';

const CommunityPostCard = ({ post, bannedTermsRegex }) => {
  // Defensive content filtering - check for banned advisory terms
  const filteredContent = useMemo(() => {
    const hasViolation = bannedTermsRegex.test(post.title) || bannedTermsRegex.test(post.rawContent);
    
    return {
      hasViolation,
      title: hasViolation ? '[DATA UNDER AUDIT // NON-ADVISORY COMPLIANT]' : post.title,
      content: hasViolation ? '[DATA UNDER AUDIT // NON-ADVISORY COMPLIANT]' : post.rawContent,
    };
  }, [post.title, post.rawContent, bannedTermsRegex]);

  // Sentiment color mapping
  const getSentimentStyles = () => {
    const sentiment = post.associatedSentiment;
    
    if (sentiment === 'VERY HEALTHY' || sentiment === 'HEALTHY') {
      return {
        textColor: 'text-[#06B6D4]',
        borderColor: 'border-[#E5E5E5]',
      };
    } else if (sentiment === 'WEAKENING' || sentiment === 'UNHEALTHY') {
      return {
        textColor: 'text-[#D946EF]',
        borderColor: filteredContent.hasViolation ? 'border-[#D946EF]' : 'border-[#E5E5E5]',
      };
    }
    
    return {
      textColor: 'text-[#525252]',
      borderColor: 'border-[#E5E5E5]',
    };
  };

  const sentimentStyles = getSentimentStyles();

  return (
    <div
      className={`bg-white border ${sentimentStyles.borderColor} rounded-none p-6 relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.02)]`}
    >
      {/* Header with User & Timestamp */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] font-medium tracking-wider text-[#525252] uppercase">
              {post.userNode}
            </span>
            <span className="font-mono text-[10px] text-[#A3A3A3] tracking-widest uppercase">
              •
            </span>
            <span className="font-mono text-[10px] text-[#A3A3A3] tracking-widest uppercase">
              {post.timestamp}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold px-2.5 py-1 bg-[#F5F5F5] border border-[#E5E5E5] rounded-none text-[#525252] uppercase tracking-wider">
              {post.exchangeTag}
            </span>
          </div>
        </div>

        {/* Compliance Alert Icon */}
        {filteredContent.hasViolation && (
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-[#D946EF]" strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Thread Title */}
      <h3 className="text-base font-semibold tracking-tight text-[#0A0A0A] mt-2 mb-3">
        {filteredContent.title}
      </h3>

      {/* Body Text Excerpt */}
      <p className="text-sm text-[#525252] leading-relaxed mb-4">
        {filteredContent.content}
      </p>

      {/* Sentiment Status Badge */}
      <div className={`font-mono text-[11px] font-medium px-2.5 py-1 uppercase tracking-wider ${sentimentStyles.textColor} mb-4`}>
        {post.associatedSentiment}
      </div>

      {/* Engagement Metrics & Action Links */}
      <div className="flex items-center gap-4 pt-4 border-t border-[#E5E5E5]">
        {/* View Count */}
        <button className="h-[44px] flex items-center gap-2 px-3 rounded-none transition-all duration-200 ease-out hover:bg-[#F5F5F5] active:scale-[0.98] active:transition-transform active:duration-100 active:ease-out">
          <Eye className="w-4 h-4 text-[#525252]" strokeWidth={1.5} />
          <span className="font-mono text-[11px] font-medium text-[#525252] uppercase">
            {post.viewCount}
          </span>
        </button>

        {/* Discussion Count */}
        <button className="h-[44px] flex items-center gap-2 px-3 rounded-none transition-all duration-200 ease-out hover:bg-[#F5F5F5] active:scale-[0.98] active:transition-transform active:duration-100 active:ease-out">
          <MessageCircle className="w-4 h-4 text-[#525252]" strokeWidth={1.5} />
          <span className="font-mono text-[11px] font-medium text-[#525252] uppercase">
            {post.discussionCount}
          </span>
        </button>
      </div>
    </div>
  );
};

export default CommunityPostCard;
