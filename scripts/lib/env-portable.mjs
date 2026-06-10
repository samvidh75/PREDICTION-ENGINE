/**
 * env-portable.mjs — Cross-platform environment variable utilities.
 */

import { env as processEnv } from 'node:process';

export function env(key, fallback) {
  return processEnv[key] ?? fallback ?? '';
}

export function requireEnv(key) {
  const value = processEnv[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Required environment variable is not set: ${key}`);
  }
  return value;
}

export function setEnv(key, value) {
  processEnv[key] = String(value);
}

export function isEnvTrue(key) {
  const value = (processEnv[key] ?? '').toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'on';
}