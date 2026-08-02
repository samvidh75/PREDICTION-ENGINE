import { describe, expect, it } from 'vitest';
import { buildRequestKey, buildRequestKeyDebugMaterial, requestKeyHash, serializeRequestKey } from '../../src/services/providers/broker/ProviderRequestKey';

describe('provider request key contract', () => {
  it('produces the same hash for different parameter ordering', () => {
    const a = buildRequestKey('indianapi', 'quote', 'RELIANCE', { b: 2, a: { z: 1, y: 2 } });
    const b = buildRequestKey('indianapi', 'quote', 'RELIANCE', { a: { y: 2, z: 1 }, b: 2 });

    expect(a.paramsHash).toBe(b.paramsHash);
    expect(requestKeyHash(a)).toBe(requestKeyHash(b));
  });

  it('normalizes symbols before hashing', () => {
    const a = buildRequestKey('indianapi', 'quote', ' reliance.ns ', { range: '1d' });
    const b = buildRequestKey('INDIANAPI', 'quote', 'RELIANCE', { range: '1d' });

    expect(a).toEqual(b);
  });

  it('never exposes token values in canonical material or hash debug output', () => {
    const secret = 'super-secret-token-value';
    const material = buildRequestKeyDebugMaterial('indianapi', 'quote', 'RELIANCE', {
      token: secret,
      nested: { access_token: secret, visible: 'ok' },
      headers: { authorization: `Bearer ${secret}` },
    });
    const key = buildRequestKey('indianapi', 'quote', 'RELIANCE', {
      token: secret,
      nested: { access_token: secret, visible: 'ok' },
      headers: { authorization: `Bearer ${secret}` },
    });
    const debugOutput = JSON.stringify({ material, key, serialized: serializeRequestKey(key), hash: requestKeyHash(key) });

    expect(debugOutput).not.toContain(secret);
    expect(debugOutput).not.toContain('Bearer');
    expect(debugOutput).toContain('visible');
  });

  it('produces different hashes for different non-secret params', () => {
    const a = buildRequestKey('indianapi', 'quote', 'RELIANCE', { range: '1d' });
    const b = buildRequestKey('indianapi', 'quote', 'RELIANCE', { range: '5d' });

    expect(a.paramsHash).not.toBe(b.paramsHash);
  });
});
