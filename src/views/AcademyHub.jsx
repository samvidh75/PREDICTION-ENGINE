import React, { useState, useEffect } from 'react';
import { useAcademyProgress } from '../context/AcademyContext';
import CourseCategoryRow from '../components/CourseCategoryRow';
import StoryLessonViewer from '../components/StoryLessonViewer';

/**
 * AcademyHub — Master Academy Workspace
 *
 * Mounts inside AppLayout's central workspace scroll area.
 * Renders the complete course catalog organized by category rows.
 * Each category uses CourseCategoryRow → CourseMediaCard pipeline.
 *
 * Features:
 *   - Rich static course catalog with multiple categories
 *   - Progress integration via AcademyContext
 *   - Staggered micro-cascade section loading
 *   - StoryLessonViewer modal on card click
 *   - Responsive: categories stack vertically, cards invert to columns on mobile
 */

// ─── Static Course Catalog ──────────────────────────────────────────────────
const COURSE_CATALOG = [
  {
    label: 'MARKET MECHANICS',
    courses: [
      {
        courseId: 'ACAD_MARKET_MECHANICS_101',
        title: 'How Indian Stock Exchanges Work',
        subtitle: 'NSE, BSE, and SME exchange infrastructure decoded',
        duration: '18 min',
        moduleCount: 6,
        thumbnailUrl: '',
      },
      {
        courseId: 'ACAD_ORDER_TYPES',
        title: 'Order Types & Execution Flow',
        subtitle: 'Market, limit, stop-loss, and bracket orders explained',
        duration: '14 min',
        moduleCount: 5,
        thumbnailUrl: '',
      },
      {
        courseId: 'ACAD_SETTLEMENT',
        title: 'T+1 Settlement & Clearing',
        subtitle: 'How trades settle through NSCCL and Indian Clearing Corp',
        duration: '11 min',
        moduleCount: 4,
        thumbnailUrl: '',
      },
      {
        courseId: 'ACAD_MARKET_HOURS',
        title: 'Market Sessions & Circuit Breakers',
        subtitle: 'Pre-open, continuous, closing auctions and volatility halts',
        duration: '9 min',
        moduleCount: 3,
        thumbnailUrl: '',
      },
    ],
  },
  {
    label: 'SECTOR ROTATION',
    courses: [
      {
        courseId: 'ACAD_SECTOR_ROTATION',
        title: 'Sector Rotation — The Business Cycle Connection',
        subtitle: 'How sectors move through economic expansion and contraction phases',
        duration: '22 min',
        moduleCount: 8,
        thumbnailUrl: '',
      },
      {
        courseId: 'ACAD_BANKING_SECTOR',
        title: 'Indian Banking Sector Deep Dive',
        subtitle: 'PSU banks vs private banks — structural differences and health metrics',
        duration: '16 min',
        moduleCount: 6,
        thumbnailUrl: '',
      },
      {
        courseId: 'ACAD_IT_PHARMA',
        title: 'IT & Pharma — Export-Linked Sectors',
        subtitle: 'Currency sensitivity, global demand cycles, and margin structures',
        duration: '15 min',
        moduleCount: 5,
        thumbnailUrl: '',
      },
    ],
  },
  {
    label: 'FUNDAMENTAL ANALYSIS',
    courses: [
      {
        courseId: 'ACAD_READING_FINANCIALS',
        title: 'Reading Financial Statements',
        subtitle: 'Balance sheet, P&L, and cash flow statement interpretation',
        duration: '25 min',
        moduleCount: 8,
        thumbnailUrl: '',
      },
      {
        courseId: 'ACAD_VALUATION_RATIOS',
        title: 'Valuation Ratios Decoded',
        subtitle: 'P/E, P/B, EV/EBITDA — what they measure and when they mislead',
        duration: '19 min',
        moduleCount: 7,
        thumbnailUrl: '',
      },
      {
        courseId: 'ACAD_DEBT_ANALYSIS',
        title: 'Debt & Leverage Analysis',
        subtitle: 'Debt-to-equity, interest coverage, and financial stability metrics',
        duration: '13 min',
        moduleCount: 5,
        thumbnailUrl: '',
      },
      {
        courseId: 'ACAD_PROMOTER_ANALYSIS',
        title: 'Promoter Holding & Governance',
        subtitle: 'Reading pledging patterns, insider transactions, and board structures',
        duration: '12 min',
        moduleCount: 4,
        thumbnailUrl: '',
      },
    ],
  },
  {
    label: 'MARKET STORIES',
    courses: [
      {
        courseId: 'STORY_HDFC_EVOLUTION',
        title: 'The HDFC Merger — A Structural Transformation',
        subtitle: 'How India\'s largest housing finance company merged with its banking arm',
        duration: '20 min',
        moduleCount: 5,
        thumbnailUrl: '',
      },
      {
        courseId: 'STORY_RELIANCE_PIVOT',
        title: 'Reliance — From Oil to Digital',
        subtitle: 'The strategic pivot that redefined India\'s most valuable company',
        duration: '24 min',
        moduleCount: 7,
        thumbnailUrl: '',
      },
      {
        courseId: 'STORY_TATA_MOTORS',
        title: 'Tata Motors — The EV Transition',
        subtitle: 'Navigating legacy ICE volumes while building an electric future',
        duration: '17 min',
        moduleCount: 5,
        thumbnailUrl: '',
      },
    ],
  },
  {
    label: 'REGULATORY FRAMEWORK',
    courses: [
      {
        courseId: 'ACAD_SEBI_FRAMEWORK',
        title: 'Understanding SEBI Regulations',
        subtitle: 'The regulatory architecture protecting Indian market participants',
        duration: '16 min',
        moduleCount: 6,
        thumbnailUrl: '',
      },
      {
        courseId: 'ACAD_TAXATION',
        title: 'Capital Gains Taxation in India',
        subtitle: 'STCG, LTCG, grandfathering, and indexation rules decoded',
        duration: '14 min',
        moduleCount: 5,
        thumbnailUrl: '',
      },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────
const AcademyHub = () => {
  const { getProgress, getCourseProgress } = useAcademyProgress();
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedCourseTitle, setSelectedCourseTitle] = useState('');
  const [sectionsVisible, setSectionsVisible] = useState([]);

  // Staggered section reveal
  useEffect(() => {
    const timers = COURSE_CATALOG.map((_, idx) =>
      setTimeout(() => {
        setSectionsVisible((prev) => [...prev, idx]);
      }, 120 + idx * 100)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleCardClick = (courseId) => {
    // Find the course title for display
    for (const category of COURSE_CATALOG) {
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

  // Enrich courses with live progress data
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
          <span className="text-[10px] font-mono font-bold text-[#06B6D4] tracking-[0.2em] uppercase">
            ACADEMY
          </span>
          <div className="w-6 h-px bg-[#06B6D4]" />
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-[#0A0A0A] tracking-tight">
          Financial Intelligence Library
        </h1>
        <p className="text-[12px] text-[#737373] max-w-lg leading-relaxed">
          Structured learning tracks covering Indian market mechanics, sector analysis,
          fundamental evaluation, and corporate case studies. All content is educational
          and non-advisory.
        </p>
      </div>

      {/* SEBI Compliance Notice */}
      <div className="bg-white border border-[#E5E5E5] px-5 py-3 flex items-start space-x-3
                      bg-[radial-gradient(ellipse_at_bottom,rgba(6,182,212,0.015),transparent_80%)]">
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
          <span className="font-semibold text-[#525252]">Educational content only.</span>{' '}
          StockStory India does not provide investment advice, research calls, or
          portfolio management services. All information is for learning purposes and
          should not be construed as financial guidance. Consult a SEBI-registered
          investment advisor before making any investment decisions.
        </p>
      </div>

      {/* Category Rows */}
      {COURSE_CATALOG.map((category, idx) => {
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

export default AcademyHub;
