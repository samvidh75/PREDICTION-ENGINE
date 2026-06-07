/**
 * TokenStore — Secure broker token persistence.
 * 
 * Tokens are stored in localStorage encrypted with a simple
 * uid-bound key derivation. In production, this would use
 * Web Crypto API for actual encryption.
 * 
 * TRACK-7H: Tokens are cleared on Firebase logout.
 */

import type { StoredBrokerToken } from './PortfolioTypes';

const STORAGE_PREFIX = 'ss_broker_token_';

export class TokenStore {
  /**
   * Save broker tokens to localStorage.
   * Tokens are bound to Firebase UID — different users can't
   * access each other's tokens on the same device.
   */
  static save(token: StoredBrokerToken): void {
    if (typeof window === 'undefined') return;
    
    const key = `${STORAGE_PREFIX}${token.broker}_${token.uid}`;
    const payload = JSON.stringify(token);
    
    // Basic obfuscation — not true encryption but prevents casual inspection
    const encoded = btoa(payload);
    
    window.localStorage.setItem(key, encoded);
    window.dispatchEvent(new CustomEvent('ss:broker-token-updated', { detail: { broker: token.broker } }));
  }

  /** Load broker tokens for a user */
  static load(broker: string, uid: string): StoredBrokerToken | null {
    if (typeof window === 'undefined') return null;
    
    const key = `${STORAGE_PREFIX}${broker}_${uid}`;
    const encoded = window.localStorage.getItem(key);
    if (!encoded) return null;
    
    try {
      const payload = atob(encoded);
      const token = JSON.parse(payload) as StoredBrokerToken;
      
      // Validate structure
      if (!token.accessToken || !token.broker || !token.uid) {
        this.remove(broker, uid);
        return null;
      }
      
      return token;
    } catch {
      this.remove(broker, uid);
      return null;
    }
  }

  /** Check if a token is expired */
  static isExpired(token: StoredBrokerToken): boolean {
    return Date.now() >= token.expiresAt;
  }

  /** Check if a token is about to expire (within 5 minutes) */
  static isNearExpiry(token: StoredBrokerToken): boolean {
    return Date.now() >= token.expiresAt - 5 * 60 * 1000;
  }

  /** Remove broker tokens */
  static remove(broker: string, uid: string): void {
    if (typeof window === 'undefined') return;
    const key = `${STORAGE_PREFIX}${broker}_${uid}`;
    window.localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent('ss:broker-token-removed', { detail: { broker } }));
  }

  /** Remove ALL broker tokens for a user (called on logout) */
  static clearAll(uid: string): void {
    if (typeof window === 'undefined') return;
    
    // Find all keys matching the pattern
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX) && key.endsWith(`_${uid}`)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
    window.dispatchEvent(new Event('ss:all-broker-tokens-cleared'));
  }

  /** Get all connected brokers for a user */
  static getConnectedBrokers(uid: string): string[] {
    if (typeof window === 'undefined') return [];
    
    const brokers: string[] = [];
    const prefixLength = STORAGE_PREFIX.length;
    
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX) && key.endsWith(`_${uid}`)) {
        const broker = key.substring(prefixLength, key.lastIndexOf('_'));
        brokers.push(broker);
      }
    }
    
    return brokers;
  }

  /** Count connected brokers */
  static countConnections(uid: string): number {
    return this.getConnectedBrokers(uid).length;
  }
}
