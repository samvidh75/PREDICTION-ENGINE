/**
 * News barrel export
 */
export type {
  NewsSourceQuality,
  NewsItem,
  NewsQualityScore,
  NewsDedupResult,
  NewsEntityMatch,
} from './NewsQualityTypes';
export { NewsQualityScorer, newsQualityScorer } from './NewsQualityScorer';
export { NewsDeduper, newsDeduper } from './NewsDeduper';
export { NewsEntityMatcher, newsEntityMatcher } from './NewsEntityMatcher';
