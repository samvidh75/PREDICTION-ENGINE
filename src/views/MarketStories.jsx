import React, { useState, useEffect } from 'react';
import { useAcademyProgress } from '../context/AcademyContext';
import CourseCategoryRow from '../components/CourseCategoryRow';
import StoryLessonViewer from '../components/StoryLessonViewer';

/**
 * MarketStories — Cinematic Market Documentary Feed
 *
 * The "Netflix of market intelligence" view. Renders corporate case studies,
 * sector rotation narratives, and macro-economic story arcs as cinematic
 * documentary-style learning tracks.
 *
 * Distinct from AcademyHub: focuses exclusively on narrative documentary
 * content (stories) rather than technical educational courses.
 *
 * Features:
 *   - Documentary story categories (Corporate Sagas, Sector Shifts, Macro Narratives)
 *   - Progress tracking via AcademyContext
 *   - Staggered micro-cascade section loading
 *   - StoryLessonViewer modal for deep-dive playback
 *   - Responsive column inversion on mobile
 */

// ─── Static Documentary Catalog ─────────────────────────────────────────────
const STORY_CATALOG = [
  {
    label: 'CORPORATE SAGAS',
    courses: [
      {
        courseId: 'STORY_HDFC_EVOLUTION',
        title: 'HDFC — The Merger of the Century',
        subtitle: 'How India\'s largest housing lender unified with its banking arm to create a financial superpower',
        duration: '20 min',
        moduleCount: 5,
        thumbnailUrl: '',
      },
      {
        courseId: 'STORY_RELIANCE_PIVOT',
        title: 'Reliance Industries — From Petrochemicals to Platform',
        subtitle: 'The strategic pivot through Jio and Retail that redefined India\'s most valuable enterprise',
        duration: '24 min',
        moduleCount: 7,
        thumbnailUrl: '',
      },
      {
        courseId: 'STORY_TATA_MOTORS',
        title: 'Tata Motors — Navigating the EV Transition',
        subtitle: 'Balancing legacy combustion volumes while building India\'s electric vehicle future',
        duration: '17 min',
        moduleCount: 5,
        thumbnailUrl: '',
      },
      {
        courseId: 'STORY_INFOSYS_GLOBAL',
        title: 'Infosys — Building a Global IT Services Empire',
        subtitle: 'From Pune garage to Nasdaq listing — the DNA of consistent compounding',
        duration: '19 min',
        moduleCount: 6,
        thumbnailUrl: '',
      },
      {
        courseId: 'STORY_BAJAJ_FINANCE',
        title: 'Bajaj Finance — The Consumer Lending Revolution',
        subtitle: 'How a single-product NBFC became India\'s most valuable financial services company',
        duration: '16 min',
        moduleCount: 5,
        thumbnailUrl: '',
      },
    ],
  },
  {
    label: 'SECTOR TRANSFORMATION NARRATIVES',
    courses: [
      {
        courseId: 'STORY_BANKING_NPL',
        title: 'India\'s NPA Crisis & Recovery (2015–2022)',
        subtitle: 'The structural clean-up that reshaped Indian banking balance sheets',
        duration: '22 min',
        moduleCount: 6,
        thumbnailUrl: '',
      },
      {
        courseId: 'STORY_PHARMA_COVID',
        title: 'Indian Pharma During COVID-19',
        subtitle: 'Vaccine manufacturing, API dependency, and the global supply chain recalibration',
        duration: '18 min',
        moduleCount: 5,
        thumbnailUrl: '',
      },
      {
        courseId: 'STORY_RENEWABLE_ENERGY',
        title: 'India\'s Renewable Energy Transition',
        subtitle: 'Solar, wind, and green hydrogen — the structural shift in energy infrastructure',
        duration: '21 min',
        moduleCount: 7,
        thumbnailUrl: '',
      },
      {
        courseId: 'STORY_DIGITAL_PAYMENTS',
        title: 'UPI & The Digital Payments Revolution',
        subtitle: 'How India built the world\'s most advanced real-time payment infrastructure',
        duration: '15 min',
        moduleCount: 4,
        thumbnailUrl: '',
      },
    ],
  },
  {
    label: 'MACRO ECONOMIC NARRATIVES',
    courses: [
      {
        courseId: 'STORY_RBI_MONETARY',
        title: 'RBI Monetary Policy — Inflation vs Growth',
        subtitle: 'Understanding repo rate decisions, liquidity management, and transmission lags',
        duration: '20 min',
        moduleCount: 6,
        thumbnailUrl: '',
      },
      {
        courseId: 'STORY_FISCAL_DEFICIT',
        title: 'India\'s Fiscal Deficit Trajectory',
        subtitle: 'Government borrowing, capital expenditure, and the bond market connection',
        duration: '17 min',
        moduleCount: 5,
        thumbnailUrl: '',
      },
      {
        courseId: 'STORY_FII_FLOWS',
        title: 'FII Flows & Market Impact',
        subtitle: 'How foreign institutional activity drives Indian market liquidity and sentiment',
        duration: '14 min',
        moduleCount: 4,
        thumbnailUrl: '',
      },
    ],
  },
  {
    label: 'SME & EMERGING GROWTH STORIES',
    courses: [
      {
        courseId: 'STORY_SME_IPO',
        title: 'The SME IPO Boom — Opportunity or Risk?',
        subtitle: 'Analysing the structural mechanics behind India\'s small-cap listing explosion',
        duration: '16 min',
        moduleCount: 5,
        thumbnailUrl: '',
      },
      {
        courseId: 'STORY_DEFENSE_MAKE_INDIA',
        title: 'Defence Manufacturing — Make in India',
        subtitle: 'How import substitution is creating a new generation of defence-tech companies',
        duration: '19 min',
        moduleCount: 6,
        thumbnailUrl: '',
      },
      {
        courseId: 'STORY_CHEMICALS_CHINA',
        title: 'Specialty Chemicals — The China+1 Tailwind',
        subtitle: 'India\'s position in the global chemical supply chain diversification',
        duration: '15 min',
        moduleCount: 4,
        thumbnailUrl: '',
      },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────
const MarketStories = () => {
  const { getProgress, getCourseProgress } = useAcademyProgress();
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedCourseTitle, setSelectedCourseTitle] = useState('');
  const [sectionsVisible, setSectionsVisible] = useState([]);

  // Staggered section reveal
  useEffect(() => {
    const timers = STORY_CATALOG.map((_, idx) =>
      setTimeout(() => {
        setSectionsVisible((prev) => [...prev, idx]);
      }, 100 + idx * 90)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleCardClick = (courseId) => {
    for (const category of STORY_CATALOG) {
      const found = category.courses.find((c) => c.courseId === courseId);
      if (found) {
        setSelectedCourseTitle(found.title);
        break;
      }
    }
    setSelectedCourseId(courseId);
  };

  const handleCloseViewer = () => {
    setSelectedCourseId(null);
    setSelectedCourseTitle('');
  };

  // Enrich with progress data
  const enrichCategory = (category) => ({
    ...category,
    courses: category.courses.map((course) => {
      const progressData = getCourseProgress
        ? getCourseProgress(course.courseId)
        : { ratio: 0, isMarkedComplete: false };
      return {
        ...course,
        progressRatio: progressData.ratio ?? 0,
        isCompleted: progressData.isMarkedComplete ?? false,
      };
    }),
  });

  return (
    <section className="w-full flex flex-col space-y-10 md:space-y-14">
      {/* Page Header */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-3">
          <span className="text-[10px] font-mono font-bold text-[#D946EF] tracking-[0.2em] uppercase">
            MARKET STORIES
          </span>
          <div className="w-6 h-px bg-[#D946EF]" />
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-[#0A0A0A] tracking-tight">
          Cinematic Intelligence Feed
        </h1>
        <p className="text-[12px] text-[#737373] max-w-lg leading-relaxed">
          Deep-dive documentary narratives covering corporate transformations, sector
          rotations, and macroeconomic cycles shaping the Indian market. Structured as
          episodic story arcs for immersive learning.
        </p>
      </div>

      {/* SEBI Compliance Notice */}
      <div className="bg-white border border-[#E5E5E5] px-5 py-3 flex items-start space-x-3
                      bg-[radial-gradient(ellipse_at_bottom,rgba(217,70,239,0.012),transparent_80%)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-[#A3A3A3] mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-[11px] text-[#737373] leading-relaxed">
          <span className="font-semibold text-[#525252]">Narrative research content only.</span>{' '}
          Stories presented here are historical case studies for educational analysis. They
          do not constitute buy, sell, or hold recommendations. Past corporate performance
          does not indicate future results. Always consult a SEBI-registered advisor.
        </p>
      </div>

      {/* Featured Story — Hero Card */}
      <div className="bg-white border border-[#E5E5E5] overflow-hidden
                      bg-[radial-gradient(ellipse_at_top_right,rgba(217,70,239,0.015),transparent_70%)]">
        <div className="flex flex-col md:flex-row">
          {/* Thumbnail area */}
          <div className="w-full md:w-[45%] h-48 md:h-auto bg-gradient-to-br from-[#F5F5F5] to-[#EBEBEB] flex items-center justify-center relative">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 rounded-full border-2 border-[#D4D4D4] flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 text-[#A3A3A3] ml-0.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-[9px] font-mono text-[#A3A3A3] tracking-[0.2em] uppercase">
                FEATURED STORY
              </span>
            </div>
            <div className="absolute top-3 left-3 bg-[#D946EF] px-2 py-0.5">
              <span className="text-[9px] font-mono font-bold text-white tracking-widest uppercase">
                NEW
              </span>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-center space-y-3">
            <span className="text-[10px] font-mono font-semibold text-[#D946EF] tracking-[0.14em] uppercase">
              CORPORATE SAGA
            </span>
            <h2 className="text-lg md:text-xl font-semibold text-[#0A0A0A] tracking-tight leading-snug">
              Reliance Industries — From Petrochemicals to Platform
            </h2>
            <p className="text-[12px] text-[#737373] leading-relaxed max-w-md">
              The strategic pivot through Jio and Retail that transformed India&apos;s
              largest private enterprise from an oil refinery giant into a consumer
              technology platform.
            </p>
            <div className="flex items-center space-x-4 pt-1">
              <span className="text-[10px] font-mono text-[#A3A3A3] tracking-wider">
                7 MODULES
              </span>
              <span className="text-[10px] font-mono text-[#A3A3A3] tracking-wider">
                24 MIN
              </span>
            </div>
            <button
              onClick={() => handleCardClick('STORY_RELIANCE_PIVOT')}
              className="
                mt-2 self-start
                min-h-[48px] px-6 py-2.5
                bg-[#0A0A0A] text-white
                text-[11px] font-mono font-bold tracking-[0.12em] uppercase
                hover:bg-[#171717]
                active:scale-[0.96]
                transition-all duration-200 ease-out
              "
            >
              BEGIN STORY
            </button>
          </div>
        </div>
      </div>

      {/* Story Category Rows */}
      {STORY_CATALOG.map((category, idx) => {
        const enriched = enrichCategory(category);
        const isVisible = sectionsVisible.includes(idx);

        return (
          <div
            key={category.label}
            className={`
              transition-all duration-500 ease-out
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            `}
          >
            <CourseCategoryRow
              label={enriched.label}
              courses={enriched.courses}
              onCardClick={handleCardClick}
            />
          </div>
        );
      })}

      {/* Bottom Regulatory Footer */}
      <div className="border-t border-[#E5E5E5] pt-6 pb-4">
        <p className="text-[10px] font-mono text-[#A3A3A3] leading-relaxed max-w-2xl tracking-wide">
          DISCLAIMER: All market stories are retrospective educational narratives based on
          publicly available information. StockStory India is not a SEBI-registered
          investment advisor. Content should not be used as the basis for investment
          decisions. Mutual fund investments are subject to market risks. Read all
          scheme-related documents carefully.
        </p>
      </div>

      {/* Lesson Viewer Modal */}
      {selectedCourseId && (
        <StoryLessonViewer
          courseId={selectedCourseId}
          courseTitle={selectedCourseTitle}
          onClose={handleCloseViewer}
        />
      )}
    </section>
  );
};

export default MarketStories;
