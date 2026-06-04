import React from 'react';
import CourseMediaCard from './CourseMediaCard';

/**
 * CourseCategoryRow — Horizontal Carousel ↔ Vertical Column Inversion
 *
 * Renders a labelled row of CourseMediaCards. Desktop: horizontal scroll carousel
 * with smooth overflow. Mobile (<768px): absolute linear row-to-column inversion
 * where cards stack vertically at full viewport width.
 *
 * Props:
 *   label      — section header text (uppercase mono formatted)
 *   courses    — array of course data objects
 *   onCardClick — callback forwarded to each CourseMediaCard
 */
const CourseCategoryRow = ({ label = '', courses = [], onCardClick }) => {
  return (
    <div className="w-full">
      {/* Section Label — uppercase mono tracking */}
      {label && (
        <div className="flex items-center space-x-3 mb-5">
          <h2 className="text-[11px] font-mono font-semibold tracking-[0.14em] text-[#525252] uppercase">
            {label}
          </h2>
          <div className="flex-1 h-px bg-[#E5E5E5]" />
          <span className="text-[10px] font-mono text-[#A3A3A3] tracking-wider">
            {courses.length} {courses.length === 1 ? 'ITEM' : 'ITEMS'}
          </span>
        </div>
      )}

      {/* Card Collection Container
          Desktop: horizontal scroll carousel with hidden scrollbar
          Mobile (<768px): vertical column stack, full-width cards */}
      <div
        className="
          flex flex-col space-y-5 overflow-x-visible pb-0
          md:flex-row md:space-y-0 md:space-x-5 md:overflow-x-auto md:pb-3
          md:scrollbar-thin md:scrollbar-thumb-neutral-200 md:scrollbar-track-transparent
        "
        style={{
          /* Hide scrollbar on webkit browsers for clean desktop aesthetic */
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {courses.map((course, index) => (
          <div
            key={course.courseId}
            className="
              w-full min-h-[48px]
              md:w-auto md:flex-shrink-0
            "
          >
            <CourseMediaCard
              courseId={course.courseId}
              title={course.title}
              subtitle={course.subtitle}
              thumbnailUrl={course.thumbnailUrl}
              progressRatio={course.progressRatio}
              duration={course.duration}
              moduleCount={course.moduleCount}
              isCompleted={course.isCompleted}
              staggerIndex={index}
              onClick={onCardClick}
            />
          </div>
        ))}

        {/* Empty state */}
        {courses.length === 0 && (
          <div className="w-full py-12 flex items-center justify-center">
            <span className="text-[11px] font-mono text-[#A3A3A3] tracking-wider uppercase">
              NO COURSES AVAILABLE
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseCategoryRow;
