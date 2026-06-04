import React, { useEffect, useCallback, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useAcademyProgress } from '../context/AcademyContext';

/**
 * StoryLessonViewer — Full-Screen Portal Overlay Modal
 *
 * Renders a premium lock-card lesson viewer as a React portal.
 * Features:
 *   - Body scroll lock on mount
 *   - Escape key dismissal
 *   - Click-outside-to-close
 *   - Mark-complete integration with AcademyContext
 *   - Staggered entrance animation
 *   - Lesson content placeholder with structured layout
 *   - 48px minimum touch targets
 *
 * Props:
 *   courseId   — identifier for the course to display
 *   courseTitle — display title for the header
 *   modules   — array of module objects [{ id, title, duration }]
 *   onClose   — callback to dismiss the viewer
 */

// Static fallback module list
const FALLBACK_MODULES = [
  { id: 'mod_1', title: 'Introduction & Overview', duration: '4 min' },
  { id: 'mod_2', title: 'Core Concepts', duration: '8 min' },
  { id: 'mod_3', title: 'Practical Application', duration: '6 min' },
  { id: 'mod_4', title: 'Summary & Assessment', duration: '3 min' },
];

const StoryLessonViewer = ({
  courseId,
  courseTitle = '',
  modules = FALLBACK_MODULES,
  onClose,
}) => {
  const { markModuleComplete, getCourseProgress } = useAcademyProgress();
  const [isEntered, setIsEntered] = useState(false);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const panelRef = useRef(null);

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsEntered(true), 30);
    return () => clearTimeout(timer);
  }, []);

  // Body scroll lock
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    // Account for scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  // Escape key handler
  const handleEscape = useCallback(
    (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  // Click-outside-to-close
  const handleBackdropClick = (e) => {
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      if (onClose) onClose();
    }
  };

  const handleMarkComplete = () => {
    if (markModuleComplete) {
      markModuleComplete(courseId);
    }
  };

  const progress = getCourseProgress ? getCourseProgress(courseId) : { ratio: 0, isMarkedComplete: false };
  const displayTitle = courseTitle || courseId;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Lesson viewer: ${displayTitle}`}
      className={`
        fixed inset-0 z-[60] flex items-center justify-center
        transition-all duration-400 ease-out
        ${isEntered ? 'bg-black/40 backdrop-blur-[1px]' : 'bg-transparent'}
      `}
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className={`
          relative w-full max-w-3xl mx-4
          bg-white border border-[#E5E5E5]
          shadow-[0_20px_60px_rgba(0,0,0,0.06)]
          flex flex-col max-h-[85vh] overflow-hidden
          transition-all duration-500 ease-out
          ${isEntered
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-3 scale-[0.98]'
          }
        `}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-white">
          <div className="flex flex-col space-y-0.5">
            <span className="text-[10px] font-mono text-[#A3A3A3] tracking-[0.16em] uppercase">
              LESSON VIEWER
            </span>
            <h2 className="text-[15px] font-semibold text-[#0A0A0A] tracking-tight leading-tight">
              {displayTitle}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="
              w-12 h-12 flex items-center justify-center
              text-[#737373] hover:text-[#0A0A0A]
              hover:bg-[#F5F5F5]
              active:scale-[0.92]
              transition-all duration-150
            "
            aria-label="Close lesson viewer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Video / Content Placeholder */}
          <div className="relative h-56 md:h-72 bg-gradient-to-br from-[#F5F5F5] to-[#EBEBEB] flex items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-14 h-14 rounded-full border-2 border-[#D4D4D4] flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-[#A3A3A3] ml-0.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-[10px] font-mono text-[#A3A3A3] tracking-[0.2em] uppercase">
                CONTENT STREAM
              </span>
            </div>

            {/* Progress overlay bar */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#E5E5E5]">
              <div
                className="h-full bg-[#06B6D4] origin-left transition-transform duration-700 ease-out"
                style={{ transform: `scaleX(${progress.ratio})` }}
              />
            </div>
          </div>

          {/* Module List */}
          <div className="px-6 py-5 space-y-1">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-[10px] font-mono font-semibold text-[#525252] tracking-[0.14em] uppercase">
                MODULES
              </span>
              <div className="flex-1 h-px bg-[#E5E5E5]" />
              <span className="text-[10px] font-mono text-[#A3A3A3] tracking-wider">
                {modules.length} TOTAL
              </span>
            </div>

            {modules.map((mod, idx) => (
              <button
                key={mod.id}
                onClick={() => setActiveModuleIndex(idx)}
                className={`
                  w-full flex items-center justify-between px-4 py-3
                  min-h-[48px] text-left
                  border transition-all duration-200 ease-out
                  ${activeModuleIndex === idx
                    ? 'border-[#06B6D4] bg-[#F0FDFA]'
                    : 'border-transparent hover:bg-[#FAFAFA]'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <span className={`
                    text-[10px] font-mono font-bold w-5 text-center
                    ${activeModuleIndex === idx ? 'text-[#06B6D4]' : 'text-[#A3A3A3]'}
                  `}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className={`
                    text-[12px] font-medium
                    ${activeModuleIndex === idx ? 'text-[#0A0A0A]' : 'text-[#525252]'}
                  `}>
                    {mod.title}
                  </span>
                </div>
                {mod.duration && (
                  <span className="text-[10px] font-mono text-[#A3A3A3] tracking-wider">
                    {mod.duration}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E5E5E5] bg-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {progress.isMarkedComplete ? (
              <span className="text-[10px] font-mono font-bold text-[#06B6D4] tracking-[0.14em] uppercase flex items-center space-x-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>ALL MODULES COMPLETE</span>
              </span>
            ) : (
              <span className="text-[10px] font-mono text-[#A3A3A3] tracking-wider">
                {Math.round(progress.ratio * 100)}% PROGRESS
              </span>
            )}
          </div>

          <button
            onClick={handleMarkComplete}
            disabled={progress.isMarkedComplete}
            className={`
              min-h-[48px] min-w-[48px] px-5 py-2.5
              text-[11px] font-mono font-bold tracking-[0.12em] uppercase
              transition-all duration-200 ease-out
              active:scale-[0.96]
              ${progress.isMarkedComplete
                ? 'bg-[#F5F5F5] text-[#A3A3A3] cursor-not-allowed'
                : 'bg-[#0A0A0A] text-white hover:bg-[#171717]'
              }
            `}
          >
            {progress.isMarkedComplete ? 'COMPLETED' : 'MARK MODULE COMPLETE'}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default StoryLessonViewer;
