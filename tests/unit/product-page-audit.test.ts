import { describe, expect, it } from 'vitest';
import {
  hasBackendVocabulary,
  hasForbiddenTradingLanguage,
  hasRenderGarbage,
  hasBackendProviderNames,
} from '../../src/lib/compliance/forbiddenCopyAudit';

describe('Forbidden copy audit utilities', () => {
  describe('hasBackendVocabulary', () => {
    it('detects provider names', () => {
      expect(hasBackendVocabulary('IndianAPI data')).not.toBeNull();
      expect(hasBackendVocabulary('Yahoo finance')).not.toBeNull();
    });

    it('detects ops vocabulary', () => {
      expect(hasBackendVocabulary('data coverage')).not.toBeNull();
      expect(hasBackendVocabulary('freshness check')).not.toBeNull();
      expect(hasBackendVocabulary('source lineage')).not.toBeNull();
      expect(hasBackendVocabulary('diagnostics panel')).not.toBeNull();
      expect(hasBackendVocabulary('data operations')).not.toBeNull();
    });

    it('passes clean product copy', () => {
      expect(hasBackendVocabulary('Research this company')).toBeNull();
      expect(hasBackendVocabulary('How StockStory thinks')).toBeNull();
      expect(hasBackendVocabulary('Compare with peers')).toBeNull();
      expect(hasBackendVocabulary('Track this thesis')).toBeNull();
      expect(hasBackendVocabulary('What changed')).toBeNull();
    });
  });

  describe('hasForbiddenTradingLanguage', () => {
    it('detects trading language', () => {
      expect(hasForbiddenTradingLanguage('Buy Stock now')).not.toBeNull();
      expect(hasForbiddenTradingLanguage('Sell Stock')).not.toBeNull();
      expect(hasForbiddenTradingLanguage('Strong Buy')).not.toBeNull();
      expect(hasForbiddenTradingLanguage('guaranteed returns')).not.toBeNull();
      expect(hasForbiddenTradingLanguage('multibagger')).not.toBeNull();
      expect(hasForbiddenTradingLanguage('sure shot')).not.toBeNull();
    });

    it('passes clean product copy', () => {
      expect(hasForbiddenTradingLanguage('Research only')).toBeNull();
      expect(hasForbiddenTradingLanguage('Compare with peers')).toBeNull();
      expect(hasForbiddenTradingLanguage('Final order with broker')).toBeNull();
    });
  });

  describe('hasRenderGarbage', () => {
    it('detects render garbage', () => {
      expect(hasRenderGarbage('undefined')).not.toBeNull();
      expect(hasRenderGarbage('null')).not.toBeNull();
      expect(hasRenderGarbage('NaN')).not.toBeNull();
    });

    it('passes clean output', () => {
      expect(hasRenderGarbage('Hello world')).toBeNull();
      expect(hasRenderGarbage('Score: 85')).toBeNull();
    });
  });

  describe('hasBackendProviderNames', () => {
    it('detects provider names', () => {
      expect(hasBackendProviderNames('IndianAPI')).not.toBeNull();
      expect(hasBackendProviderNames('Upstox')).not.toBeNull();
      expect(hasBackendProviderNames('Screener')).not.toBeNull();
    });

    it('passes clean product copy', () => {
      expect(hasBackendProviderNames('StockStory India')).toBeNull();
    });
  });
});
