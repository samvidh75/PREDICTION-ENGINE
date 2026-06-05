import { describe, expect, it } from 'vitest';
import { CompanyDataValidator } from './CompanyDataValidator';

describe('CompanyDataValidator', () => {
  const validator = new CompanyDataValidator();

  it('flags raw BSE code payloads as invalid', () => {
    const result = validator.validate({
      symbol: '500325',
      companyName: '500325',
      sector: '',
      industry: '',
      exchange: 'BSE',
      marketCap: undefined,
    });

    expect(result.status).toBe('INVALID');
    expect(result.reasons).toContain('raw_bse_code_as_symbol');
    expect(result.reasons).toContain('ticker_as_company_name');
  });

  it('accepts verified registry-style metadata', () => {
    const result = validator.validate({
      symbol: 'RELIANCE',
      companyName: 'Reliance Industries Ltd',
      sector: 'Energy & Oil',
      industry: 'Oil & Gas',
      exchange: 'NSE',
      marketCap: 1,
    });

    expect(result.status).toBe('VERIFIED');
    expect(result.reasons).toEqual([]);
  });
});
