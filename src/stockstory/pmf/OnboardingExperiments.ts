/**
 * OnboardingExperiments — Concrete experiment definitions for onboarding flows.
 *
 * Registers experiments with the ExperimentRegistry at import time.
 * Each experiment tests a specific onboarding hypothesis.
 */

import { registerExperiment } from './ExperimentRegistry';

export function registerOnboardingExperiments(): void {
  // Experiment 1: Simplified vs detailed onboarding flow
  registerExperiment({
    key: 'onboarding.v2.simplified-vs-detailed',
    name: 'Onboarding Flow: Simplified vs Detailed',
    description:
      'Tests whether a simplified 3-step onboarding (select sectors → set preferences → first research) ' +
      'performs better than the detailed 5-step flow (sectors → budget → risk → preferences → research)',
    status: 'draft',
    strategy: 'random',
    variants: [
      {
        id: 'control',
        name: 'Detailed 5-step',
        description: 'Current 5-step onboarding with sectors, budget, risk, preferences, research',
        trafficFraction: 0.5,
        config: { steps: 5, includeBudget: true, includeRisk: true },
      },
      {
        id: 'treatment_a',
        name: 'Simplified 3-step',
        description: 'Simplified 3-step: sectors, preferences, first research',
        trafficFraction: 0.5,
        config: { steps: 3, includeBudget: false, includeRisk: false },
      },
    ],
    successMetrics: [
      'pmf.activation.signup_completed',
      'pmf.activation.first_search',
      'pmf.retention.d1_retention',
      'pmf.retention.d7_retention',
    ],
    hypotheses: [
      'Simplified onboarding reduces drop-off at step 2+',
      'Users who complete simplified onboarding perform first search sooner',
      'D7 retention is at least equal for simplified flow',
    ],
    owner: 'product',
  });

  // Experiment 2: Guided vs self-serve first research
  registerExperiment({
    key: 'onboarding.v2.guided-vs-self-serve',
    name: 'First Research: Guided vs Self-Serve',
    description:
      'Tests whether guiding users to research a stock of their known interest vs letting them ' +
      'freely search produces better activation.',
    status: 'draft',
    strategy: 'random',
    variants: [
      {
        id: 'control',
        name: 'Self-serve search',
        description: 'Empty search box — user types their own query',
        trafficFraction: 0.5,
        config: { mode: 'self_serve', promptText: 'Search for a company or topic...' },
      },
      {
        id: 'treatment_a',
        name: 'Guided prompt with suggestions',
        description:
          '"What companies are you interested in?" with popular sector suggestions as chips',
        trafficFraction: 0.5,
        config: {
          mode: 'guided',
          promptText: 'What companies are you interested in?',
          showSuggestions: true,
          suggestionCount: 6,
        },
      },
    ],
    successMetrics: [
      'pmf.activation.first_search',
      'pmf.activation.first_stock_view',
      'pmf.research.quality_positive_rate',
    ],
    hypotheses: [
      'Guided prompts reduce time-to-first-search',
      'Guided users search for more relevant stocks',
      'Research quality is higher for guided users',
    ],
    owner: 'product',
  });

  // Experiment 3: Watchlist prompt timing
  registerExperiment({
    key: 'onboarding.v2.watchlist-prompt-timing',
    name: 'Watchlist Prompt: After Search vs After Stock View',
    description:
      'Tests whether prompting users to add a stock to their watchlist immediately after search ' +
      'or after viewing the detailed research report drives better watchlist adoption.',
    status: 'draft',
    strategy: 'random',
    variants: [
      {
        id: 'control',
        name: 'Prompt after stock view',
        description: 'Show "Add to Watchlist" CTA after the user views a research report',
        trafficFraction: 0.5,
        config: { trigger: 'after_stock_view', modalStyle: 'banner' },
      },
      {
        id: 'treatment_a',
        name: 'Prompt after search results',
        description: 'Show "Add to Watchlist" CTA inline in search results before clicking through',
        trafficFraction: 0.25,
        config: { trigger: 'after_search', modalStyle: 'inline' },
      },
      {
        id: 'treatment_b',
        name: 'Both prompts (search + stock view)',
        description: 'Show watchlist prompt both in search results and after stock view',
        trafficFraction: 0.25,
        config: { trigger: 'both', modalStyle: 'hybrid' },
      },
    ],
    successMetrics: [
      'pmf.activation.first_watchlist_add',
      'pmf.activation.funnel_watchlist_add',
      'pmf.retention.d1_retention',
    ],
    hypotheses: [
      'Earlier watchlist prompt (after search) increases watchlist adds',
      'Dual prompting (both) may cause banner fatigue',
      'Watchlist adds correlate with D7 retention',
    ],
    owner: 'product',
  });

  // Experiment 4: Compare feature discovery
  registerExperiment({
    key: 'onboarding.v2.compare-discovery',
    name: 'Compare Feature: Explicit CTA vs Contextual',
    description:
      'Tests whether an explicit "Compare stocks" button or contextual compare prompts ' +
      '(e.g. "How does this compare to...") drive more compare feature adoption.',
    status: 'draft',
    strategy: 'random',
    variants: [
      {
        id: 'control',
        name: 'Explicit Compare button',
        description: 'Dedicated "Compare" button in the navigation bar',
        trafficFraction: 0.5,
        config: { placement: 'nav_bar', style: 'button' },
      },
      {
        id: 'treatment_a',
        name: 'Contextual prompts on stock pages',
        description: '"Compare with [related_stock]" suggestions on stock research pages',
        trafficFraction: 0.5,
        config: { placement: 'stock_page', style: 'inline_suggestion' },
      },
    ],
    successMetrics: [
      'pmf.activation.funnel_compare',
      'pmf.retention.d7_retention',
      'pmf.retention.d30_retention',
    ],
    hypotheses: [
      'Contextual prompts increase compare feature usage',
      'Compare usage correlates with higher retention',
      'Navigation bar placement gets more total impressions',
    ],
    owner: 'product',
  });
}
