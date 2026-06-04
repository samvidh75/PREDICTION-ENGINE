// src/views/MarketStories.tsx
import React, { useState } from "react";
import { UserJourneyEngine } from "../services/behavior/UserJourneyEngine";

interface StoryItem {
  id: string;
  type: "Company Story" | "Sector Story" | "Market Story" | "Beginner Story" | "Daily Brief" | "Weekly Brief" | "Sector Brief" | "Portfolio Brief";
  title: string;
  readingTime: string;
  summary: string;
  body: string;
}

const STORIES: StoryItem[] = [
  {
    id: "d1",
    type: "Daily Brief",
    title: "Market Open: Capex Trends Dominate Infrastructure Stocks",
    readingTime: "2 min read",
    summary: "A crisp outline of this morning's regional order book expansions.",
    body: "Heavy machinery and public infrastructure orders increased by 14% month-on-month. The capital allocation shift is directly impacting regional players in the heavy engineering sectors."
  },
  {
    id: "p1",
    type: "Portfolio Brief",
    title: "Rebalancing Signal: Defense Sector Consolidation",
    readingTime: "3 min read",
    summary: "Actionable narrative covering dynamic shift markers in defense stocks.",
    body: "Defense components have maintained structural local procurement targets. While consolidation is healthy after rapid runs, order pipeline execution speeds remain high."
  },
  {
    id: "1",
    type: "Company Story",
    title: "Reliance's Structural Telecom Compounding",
    readingTime: "3 min read",
    summary: "How Jio pivoted from speed trials to capital integration dominance in India.",
    body: "Reliance navigated three major technological waves by investing robustly in domestic high-bandwidth infrastructure. By converting generic data plans into integrated digital platforms, the company unlocked continuous organic consumer pools with extremely low acquisition costs."
  },
  {
    id: "2",
    type: "Sector Story",
    title: "The Indian Defence Electronics Ascent",
    readingTime: "4 min read",
    summary: "Why local supply mandates are boosting production velocity across modern systems.",
    body: "Defence initiatives under structural local procurement targets have expanded corporate production lines. Local content regulations force capital investments back into regional micro-electronics ecosystems, allowing legacy contractors to scale up margin delivery safely."
  },
  {
    id: "3",
    type: "Market Story",
    title: "Deciphering the Capital Goods Capex Wave",
    readingTime: "5 min read",
    summary: "How private machinery expansions are fueling regional structural gains.",
    body: "Regional highway, logistics, and private production spending has triggered structural order bookings. Industrial machinery firms compound earnings steadily because baseline production demands are supported by multiple regional corridors, ensuring resilient cash flows."
  },
  {
    id: "4",
    type: "Beginner Story",
    title: "Understanding Stock Health & Momentum",
    readingTime: "2 min read",
    summary: "A jargon-free guide to reading market trends and operational safety signals.",
    body: "In volatile markets, focus first on corporate health. A strong company with high health scores has steady cash flows to handle headwinds, while momentum signals reveal whether other investors are actively building positions."
  }
];

export const MarketStories: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>("All");
  const [activeStory, setActiveStory] = useState<StoryItem | null>(STORIES[0]);

  const filtered = selectedType === "All"
    ? STORIES
    : STORIES.filter((s) => s.type === selectedType);

  const handleSelectStory = (story: StoryItem) => {
    setActiveStory(story);
    // Track story exploration in local user journey
    UserJourneyEngine.trackEvent('feature_discover', { 
      storyId: story.id, 
      storyTitle: story.title,
      type: story.type
    });
  };

  return (
    <div className="w-full flex flex-col space-y-8 font-vos-interface text-white select-none">
      <div>
        <span className="text-[11px] font-mono font-medium tracking-widest text-[#D946EF] uppercase block mb-1">
          Market Stories // Immersive Feed
        </span>
        <h2 className="vos-sec-title font-bold text-white font-vos-display">
          Narrative Documentaries
        </h2>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-2">
        {["All", "Daily Brief", "Portfolio Brief", "Company Story", "Sector Story", "Market Story", "Beginner Story"].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
              (type === "All" && selectedType === "All") || selectedType === type
                ? "bg-white text-[#020304]"
                : "bg-white/5 hover:bg-white/10 text-gray-400"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Story Feed */}
        <div className="lg:col-span-2 space-y-4">
          {filtered.map((story) => (
            <div
              key={story.id}
              onClick={() => handleSelectStory(story)}
              className={`vos-card p-6 flex flex-col space-y-3 cursor-pointer ${
                activeStory?.id === story.id ? "border-white/20 bg-white/10" : ""
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-[#D946EF] uppercase tracking-wider">
                  {story.type}
                </span>
                <span className="text-[10px] text-gray-500 font-bold">
                  {story.readingTime}
                </span>
              </div>
              <h3 className="vos-card-title font-bold text-white font-vos-display">
                {story.title}
              </h3>
              <p className="text-xs text-gray-400 font-vos-reading">
                {story.summary}
              </p>
            </div>
          ))}
        </div>

        {/* Story Detailed Reader */}
        {activeStory && (
          <div className="vos-card p-6 flex flex-col space-y-4 col-span-1">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block">
                {activeStory.type} // {activeStory.readingTime}
              </span>
              <h4 className="text-lg font-bold text-white mt-1 font-vos-display leading-tight">
                {activeStory.title}
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-gray-300 font-vos-reading border-t border-white/5 pt-4">
              {activeStory.body}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketStories;

