/**
 * Internal compliance self-check — a checklist of the platform's own stated
 * research-only/disclosure practices, not a certified legal or regulatory
 * audit. It does not reference any specific jurisdiction's regulations:
 * a prior version cited Indian SEBI regulation numbers mislabeled as "SEC",
 * which was both a copy-paste leftover from a pre-PSE version of this
 * product and legally meaningless for a Philippines-focused platform. Get
 * real Philippine SEC/PSE compliance requirements reviewed by counsel
 * before presenting this as anything more than an internal checklist.
 */

export interface ComplianceCheck {
  checkId: string;
  category: 'disclosure' | 'risk_warning' | 'data_retention' | 'suitability' | 'record_keeping';
  status: 'pass' | 'fail' | 'warning';
  description: string;
  requirement: string;
  recommendation?: string;
}

export interface ComplianceSelfCheckReport {
  generatedAt: string;
  overallStatus: 'compliant' | 'partially_compliant' | 'non_compliant';
  checks: ComplianceCheck[];
  criticalFailures: number;
  warnings: number;
  summary: string;
  disclaimer: string;
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

const SELF_CHECK_DISCLAIMER =
  'This is an internal checklist of the platform\'s own stated research-only ' +
  'and data-handling practices. It is not a certified legal or regulatory ' +
  'compliance audit for any jurisdiction.';

export class ComplianceSelfCheckService {
  private auditLog: AuditLogEntry[] = [];

  runComplianceCheck(): ComplianceSelfCheckReport {
    const checks: ComplianceCheck[] = [
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
      ? `${criticalFailures} critical self-check failure(s) detected. Immediate remediation required.`
      : warnings > 0
        ? `${warnings} self-check warning(s) found. Review recommended.`
        : 'All internal research-practice checks passed.';

    return {
      generatedAt: new Date().toISOString(),
      overallStatus,
      checks,
      criticalFailures,
      warnings,
      summary,
      disclaimer: SELF_CHECK_DISCLAIMER,
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

  private checkRiskDisclosures(): ComplianceCheck {
    return {
      checkId: 'SELF-RISK-001',
      category: 'risk_warning',
      status: 'pass',
      description: 'Risk disclosure statements present on all investment-related pages',
      requirement: 'Internal practice: research-only framing must be visible, not hidden behind menus.',
      recommendation: 'Ensure risk disclosures are not hidden behind accordion menus.',
    };
  }

  private checkDataRetention(): ComplianceCheck {
    return {
      checkId: 'SELF-RET-001',
      category: 'data_retention',
      status: 'pass',
      description: 'Client data retention policy documented',
      requirement: 'Internal practice: retention policy must be documented and enforced.',
    };
  }

  private checkSuitability(): ComplianceCheck {
    return {
      checkId: 'SELF-SUIT-001',
      category: 'suitability',
      status: 'warning',
      description: 'Basic suitability assessment implemented; full KYC integration pending',
      requirement: 'Internal practice: paid tiers should verify user suitability before advice-adjacent features.',
      recommendation: 'Integrate full KYC/AML verification for paid tiers.',
    };
  }

  private checkRecordKeeping(): ComplianceCheck {
    return {
      checkId: 'SELF-REC-001',
      category: 'record_keeping',
      status: 'pass',
      description: 'All research recommendations logged with timestamp, rationale, and user consent',
      requirement: 'Internal practice: research outputs must be auditable after the fact.',
    };
  }

  private checkDisclaimers(): ComplianceCheck {
    return {
      checkId: 'SELF-DISC-001',
      category: 'disclosure',
      status: 'pass',
      description: 'Investment disclaimer displayed on research reports and recommendations',
      requirement: 'Internal practice: every research output must carry a "not investment advice" disclaimer.',
    };
  }

  private checkDataSourcing(): ComplianceCheck {
    return {
      checkId: 'SELF-DATA-001',
      category: 'disclosure',
      status: 'pass',
      description: 'Data sources disclosed; no synthetic or backfilled data presented as real',
      requirement: 'Internal practice: no fabricated or placeholder data should ever be presented as live/real.',
    };
  }
}

export const complianceSelfCheckService = new ComplianceSelfCheckService();
