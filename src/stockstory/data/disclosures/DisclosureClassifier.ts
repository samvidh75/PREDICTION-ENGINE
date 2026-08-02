/**
 * Disclosure Classifier
 *
 * Classifies market disclosures into structured categories.
 * Cautious — never infers intent from transaction patterns.
 */

import type { MarketDisclosure, DisclosureClassification } from './DisclosureTypes';

export class DisclosureClassifier {
  classify(disclosure: MarketDisclosure): DisclosureClassification {
    const kind = disclosure.disclosureKind;

    switch (kind) {
      case 'bulk_deal':
      case 'block_deal':
        return disclosure.isBuy ? 'acquisition' : 'disposal';

      case 'insider_trade':
        return disclosure.isBuy ? 'insider_buy' : 'insider_sell';

      case 'sast_disclosure':
        return disclosure.isBuy ? 'acquisition' : 'disposal';

      case 'pledge_creation':
        return 'pledge';

      case 'pledge_release':
        return 'pledge_release';

      case 'promoter_transaction':
        return disclosure.isBuy ? 'acquisition' : 'disposal';

      case 'institutional_transaction':
        return disclosure.isBuy ? 'institutional_buy' : 'institutional_sell';

      default:
        return 'other';
    }
  }
}

export const disclosureClassifier = new DisclosureClassifier();
