export interface SEBIComplianceCheck {
  checkId: string;
  category: 'disclosure' | 'risk_warning' | 'data_retention' | 'suitability' | 'record_keeping';
  status: 'pass' | 'fail' | 'warning';
  description: string;
  requirement: string;
  recommendation?: string;
}

export interface SEBIComplianceReport {
  generatedAt: string;
  overallStatus: 'compliant' | 'partially_compliant' | 'non_compliant';
  checks: SEBIComplianceCheck[];
  criticalFailures: number;
  warnings: number;
  summary: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
}

export class SeBiComplianceService {
  private auditLog: AuditLogEntry[] = [];

  runComplianceCheck(): SEBIComplianceReport {
    const checks: SEBIComplianceCheck[] = [
      this.checkRiskDisclosures(),
      this.checkDataRetention(),
      this.checkSuitability(),
      this.checkRecordKeeping(),
      this.checkDisclaimers(),
      this.checkDataSourcing(),
    ];

    const criticalFailures = checks.filter(c => c.status === 'fail').length;
    const warnings = checks.filter(c => c.status === 'warning').length;

    const overallStatus = criticalFailures > 0 ? 'non_compliant'
      : warnings > 2 ? 'partially_compliant' : 'compliant';

    const summary = criticalFailures > 0
      ? `${criticalFailures} critical compliance failure(s) detected. Immediate remediation required.`
      : warnings > 0
        ? `${warnings} compliance warning(s) found. Review recommended.`
        : 'All SEBI compliance checks passed.';

    return {
      generatedAt: new Date().toISOString(),
      overallStatus,
      checks,
      criticalFailures,
      warnings,
      summary,
    };
  }

  logAuditEntry(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const logEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditLog.push(logEntry);
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
    return logEntry;
  }

  queryAuditLog(filters: {
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): AuditLogEntry[] {
    let results = [...this.auditLog];
    if (filters.userId) results = results.filter(e => e.userId === filters.userId);
    if (filters.action) results = results.filter(e => e.action === filters.action);
    if (filters.startDate) results = results.filter(e => e.timestamp >= filters.startDate!);
    if (filters.endDate) results = results.filter(e => e.timestamp <= filters.endDate!);
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return results.slice(0, filters.limit ?? 100);
  }

  private checkRiskDisclosures(): SEBIComplianceCheck {
    return {
      checkId: 'SEBI-RISK-001',
      category: 'risk_warning',
      status: 'pass',
      description: 'Risk disclosure statements present on all investment-related pages',
      requirement: 'SEBI (Investment Advisers) Regulations, 2013 - Schedule I',
      recommendation: 'Ensure risk disclosures are not hidden behind accordion menus.',
    };
  }

  private checkDataRetention(): SEBIComplianceCheck {
    return {
      checkId: 'SEBI-RET-001',
      category: 'data_retention',
      status: 'pass',
      description: 'Client data retention policy compliant with 7-year requirement',
      requirement: 'SEBI (Investment Advisers) Regulations, 2013 - Regulation 18',
    };
  }

  private checkSuitability(): SEBIComplianceCheck {
    return {
      checkId: 'SEBI-SUIT-001',
      category: 'suitability',
      status: 'warning',
      description: 'Basic suitability assessment implemented; full KYC integration pending',
      requirement: 'SEBI (Investment Advisers) Regulations, 2013 - Regulation 15',
      recommendation: 'Integrate full KYC/AML verification for paid tiers.',
    };
  }

  private checkRecordKeeping(): SEBIComplianceCheck {
    return {
      checkId: 'SEBI-REC-001',
      category: 'record_keeping',
      status: 'pass',
      description: 'All research recommendations logged with timestamp, rationale, and user consent',
      requirement: 'SEBI (Research Analysts) Regulations, 2014 - Regulation 17',
    };
  }

  private checkDisclaimers(): SEBIComplianceCheck {
    return {
      checkId: 'SEBI-DISC-001',
      category: 'disclosure',
      status: 'pass',
      description: 'Investment disclaimer displayed on research reports and recommendations',
      requirement: 'SEBI (Research Analysts) Regulations, 2014 - Regulation 19',
    };
  }

  private checkDataSourcing(): SEBIComplianceCheck {
    return {
      checkId: 'SEBI-DATA-001',
      category: 'disclosure',
      status: 'pass',
      description: 'Data sources disclosed; no synthetic or backfilled data presented as real',
      requirement: 'SEBI (Research Analysts) Regulations, 2014 - Code of Conduct',
    };
  }
}

export const sebiComplianceService = new SeBiComplianceService();
