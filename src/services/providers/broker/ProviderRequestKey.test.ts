import { describe, expect, it } from 'vitest';
import { buildRequestKey, requestKeyHash, serializeRequestKey } from './ProviderRequestKey';

describe('ProviderRequestKey', () => {
  it('normalizes provider, operation, and symbol before hashing', () => {
    const a = buildRequestKey(' FinnHub ', 'quote', ' reliance.ns ', { range: '1d' });
    const b = buildRequestKey('finnhub', 'quote', 'RELIANCE', { range: '1d' });

    expect(a).toEqual(b);
    expect(a.provider).toBe('finnhub');
    expect(a.operation).toBe('quote');
    expect(a.symbol).toBe('RELIANCE');
  });

  it('sorts nested params recursively and strips secrets from key material', () => {
    const a = buildRequestKey('test', 'metadata', 'ABC', {
      z: 1,
      nested: { token: 'secret-a', b: 2, a: 1 },
      list: [{ Authorization: 'bearer secret', value: 3 }],
      access_token: 'secret-b',
    });
    const b = buildRequestKey('test', 'metadata', 'ABC', {
      access_token: 'secret-c',
      list: [{ value: 3, Authorization: 'different secret' }],
      nested: { a: 1, b: 2, token: 'secret-d' },
      z: 1,
    });

    expect(a.paramsHash).toBe(b.paramsHash);
    expect(requestKeyHash(a)).toBe(requestKeyHash(b));
    expect(serializeRequestKey(a)).not.toContain('secret');
  });

  it('keeps non-secret parameter changes in the hash', () => {
    const a = buildRequestKey('test', 'quote', 'ABC', { nested: { value: 1 } });
    const b = buildRequestKey('test', 'quote', 'ABC', { nested: { value: 2 } });

    expect(a.paramsHash).not.toBe(b.paramsHash);
  });
});
