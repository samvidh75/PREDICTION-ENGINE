import React, { useState, useEffect, useRef } from 'react';

/**
 * CourseMediaCard — Premium Lock-Card Minimalism
 *
 * Atomic visual unit for the Academy & Market Stories feeds.
 * Follows approved architectural decisions:
 *   - Flat white surface (bg-white) with crisp hairline border (border-[#E5E5E5])
 *   - Subtle radial atmospheric haze: rgba(6,182,212,0.015)
 *   - Staggered micro-cascade mount animation (opacity + translate-y)
 *   - Progress telemetry bar with scaleX transform
 *   - Minimum 48px touch targets on mobile
 *
 * Props:
 *   courseId        — unique course identifier
 *   title           — display title
 *   subtitle        — optional short descriptor line
 *   thumbnailUrl    — image source (falls back to branded placeholder)
 *   progressRatio   — 0..1 completion scalar
 *   duration        — optional duration label (e.g. "12 min")
 *   moduleCount     — optional total module count
 *   isCompleted     — boolean flag for completion state badge
 *   staggerIndex    — ordinal position for cascade delay
 *   onClick         — callback receiving courseId
 */
const CourseMediaCard = ({
  courseId,
  title,
  subtitle = '',
  thumbnailUrl = '',
  progressRatio = 0,
  duration = '',
  moduleCount = 0,
  isCompleted = false,
  staggerIndex = 0,
  onClick,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  // Staggered micro-cascade mount animation
  useEffect(() => {
    const delay = 80 + staggerIndex * 60;
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [staggerIndex]);

  const handleClick = () => {
    if (onClick) onClick(courseId);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const clampedProgress = Math.max(0, Math.min(1, progressRatio));
  const progressPercent = Math.round(clampedProgress * 100);

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={`Open course: ${title}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        min-w-[280px] max-w-[320px] w-full
        bg-white border border-[#E5E5E5] rounded-none
        flex flex-col relative group overflow-hidden
        cursor-pointer select-none
        transition-all duration-500 ease-out
        hover:-translate-y-0.5
        hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)]
        active:scale-[0.985] active:shadow-none
        bg-[radial-gradient(ellipse_at_bottom,rgba(6,182,212,0.015),transparent_80%)]
        ${isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-1'
        }
      `}
      style={{
        minHeight: '48px',
        transitionDelay: isVisible ? '0ms' : `${80 + staggerIndex * 60}ms`,
      }}
    >
      {/* Thumbnail Region */}
      <div className="relative h-44 bg-[#F5F5F5] overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FAFAFA] to-[#F0F0F0]">
            <div className="flex flex-col items-center space-y-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-[#D4D4D4]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span className="text-[10px] font-mono text-[#A3A3A3] tracking-widest uppercase">
                PREVIEW
              </span>
            </div>
          </div>
        )}

        {/* Hover play indicator — minimal circular outline */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="w-11 h-11 rounded-full border-2 border-white/80 bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-white ml-0.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Duration badge */}
        {duration && (
          <div className="absolute bottom-2 right-2 bg-[#0A0A0A]/75 backdrop-blur-sm px-2 py-0.5">
            <span className="text-[10px] font-mono font-medium text-white tracking-wide">
              {duration}
            </span>
          </div>
        )}

        {/* Completion badge */}
        {isCompleted && (
          <div className="absolute top-2 right-2 bg-[#06B6D4] px-2 py-0.5 flex items-center space-x-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[9px] font-mono font-bold text-white tracking-widest uppercase">
              DONE
            </span>
          </div>
        )}
      </div>

      {/* Content Region */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
        <div>
          <h3 className="text-[13px] font-semibold text-[#0A0A0A] leading-snug line-clamp-2 tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-[#737373] leading-relaxed mt-1 line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center justify-between pt-1">
          {moduleCount > 0 && (
            <span className="text-[10px] font-mono text-[#A3A3A3] tracking-wider uppercase">
              {moduleCount} {moduleCount === 1 ? 'MODULE' : 'MODULES'}
            </span>
          )}
          {clampedProgress > 0 && !isCompleted && (
            <span className="text-[10px] font-mono text-[#06B6D4] tracking-wider font-medium">
              {progressPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Progress telemetry bar — absolute bottom edge */}
      <div className="w-full h-[2px] bg-[#F5F5F5] absolute bottom-0 left-0">
        <div
          className="h-full bg-[#06B6D4] origin-left transition-transform duration-700 ease-out"
          style={{ transform: `scaleX(${clampedProgress})` }}
        />
      </div>
    </div>
  );
};

export default CourseMediaCard;
