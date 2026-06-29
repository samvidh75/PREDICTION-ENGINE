import { describe, it, expect } from 'vitest';
import { ProductEventValidator } from '../ProductEventValidator';

describe('ProductEventValidator', () => {
  const validator = new ProductEventValidator();

  it('accepts valid events with category and action', () => {
    const result = validator.validate({
      category: 'research',
      action: 'view',
      userId: 'user_123',
      timestamp: '2024-01-15T10:30:00.000Z',
      metadata: { label: 'Research View' },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('rejects events missing category', () => {
    const result = validator.validate({
      action: 'view',
      userId: 'user_123',
      timestamp: '2024-01-15T10:30:00.000Z',
      metadata: { label: 'Test' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('category');
  });

  it('rejects events missing action', () => {
    const result = validator.validate({
      category: 'research',
      userId: 'user_123',
      timestamp: '2024-01-15T10:30:00.000Z',
      metadata: { label: 'Test' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('action');
  });

  it('produces warnings for PII in metadata fields', () => {
    const result = validator.validate({
      category: 'research',
      action: 'view',
      userId: 'user_123',
      timestamp: '2024-01-15T10:30:00.000Z',
      metadata: { label: 'Test', email: 'test@example.com' },
    });
    // PII is a warning, not an error
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.field.includes('email') || w.message.includes('PII'))).toBe(true);
  });

  it('produces warnings for PII in metadata values', () => {
    const result = validator.validate({
      category: 'research',
      action: 'view',
      userId: 'user_123',
      timestamp: '2024-01-15T10:30:00.000Z',
      metadata: { label: 'Test', user_info: 'test@example.com' },
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('rejects events with invalid timestamp', () => {
    const result = validator.validate({
      category: 'research',
      action: 'view',
      userId: 'user_123',
      timestamp: 'not-a-timestamp',
      metadata: { label: 'Test' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'timestamp')).toBe(true);
  });

  it('rejects events with empty userId', () => {
    const result = validator.validate({
      category: 'research',
      action: 'view',
      userId: '',
      timestamp: '2024-01-15T10:30:00.000Z',
      metadata: { label: 'Test' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'userId')).toBe(true);
  });

  it('rejects events with invalid category', () => {
    const result = validator.validate({
      category: '',
      action: 'view',
      userId: 'user_123',
      timestamp: '2024-01-15T10:30:00.000Z',
      metadata: { label: 'Test' },
    });
    expect(result.valid).toBe(false);
  });

  it('rejects events missing userId', () => {
    const result = validator.validate({
      category: 'research',
      action: 'view',
      timestamp: '2024-01-15T10:30:00.000Z',
      metadata: { label: 'Test' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'userId')).toBe(true);
  });

  it('rejects events missing timestamp', () => {
    const result = validator.validate({
      category: 'research',
      action: 'view',
      userId: 'user_123',
      metadata: { label: 'Test' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'timestamp')).toBe(true);
  });

  it('detects phone numbers in metadata', () => {
    const result = validator.validate({
      eventType: 'discovery',
      userId: 'user_123',
      timestamp: '2024-01-15T10:30:00.000Z',
      metadata: { contact: '+91 9876543210' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.includes('PII'))).toBe(true);
  });

  it('detects Aadhaar numbers in metadata', () => {
    const result = validator.validate({
      eventType: 'discovery',
      userId: 'user_123',
      timestamp: '2024-01-15T10:30:00.000Z',
      metadata: { id_proof: '1234 5678 9012' },
    });
    expect(result.valid).toBe(false);
  });
});
