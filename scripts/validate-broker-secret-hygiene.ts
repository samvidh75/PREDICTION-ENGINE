import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FILES = [
  'src/services/providers/broker/ProviderCallLedger.ts',
  'src/services/providers/broker/ProviderRequestBroker.ts',
  'src/services/providers/broker/ProviderRequestKey.ts',
  'src/services/providers/broker/ProviderErrorClassifier.ts',
  'tests/providers/provider-request-broker.test.ts',
  'tests/providers/provider-request-key.test.ts',
  'tests/providers/provider-error-classifier.test.ts',
];

const forbiddenPatterns = [
  /https:\/\/finnhub\.io\/api\/v1\/[^\s'"]*token=/i,
  /authorization:\s*bearer\s+(?!\[REDACTED\])/i,
  /api[_-]?key=[a-z0-9._~+/=-]+/i,
  /access[_-]?token=[a-z0-9._~+/=-]+/i,
];

const failures: string[] = [];

for (const file of FILES) {
  const content = readFileSync(join(ROOT, file), 'utf8');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      failures.push(`${file}: matched ${pattern}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Broker secret hygiene validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Broker secret hygiene validation passed for ${FILES.length} files.`);
