import type { Inspection, Evidence, Requirement, Finding, ComplianceStatus } from '../types';

const FIELD_LABELS: Record<string, string> = {
  mrp: 'MRP',
  net_quantity: 'Net Quantity',
  manufacturer_name: 'Manufacturer Name',
  manufacturer_address: 'Manufacturer Address',
  consumer_care: 'Consumer Care',
  date_of_manufacture: 'Date of Manufacture',
  country_of_origin: 'Country of Origin',
};

function statusFromRuleStatus(status: string): ComplianceStatus {
  if (status === 'PASS') return 'COMPLIANT';
  if (status === 'FAIL') return 'NON_COMPLIANT';
  return 'VERIFICATION_REQUIRED'; // NOT_APPLICABLE -> treat as needing a human glance
}

export function adaptScanResultToInspection(
  raw: any,
  manualProduct?: { name: string; brand: string; category: string; isImported: boolean }
): Inspection {
  const fused: Record<string, { value: string | null; source: string; verified_by_ocr: boolean }> =
    raw.extracted_data ?? {};
  const report = raw.compliance_report ?? {};

  const evidence: Evidence[] = Object.entries(fused).map(([field, data]) => ({
    id: `EV-${field}`,
    type: field.toUpperCase(),
    label: FIELD_LABELS[field] ?? field,
    value: data.value ?? 'Not detected',
    confidence: data.verified_by_ocr ? 90 : data.value ? 60 : 10,
    imageId: 'IMG-001',
    source: data.source === 'gemini_vision' ? 'VISION' : data.source === 'ocr_fallback' ? 'OCR' : 'MANUAL',
    status: data.value ? (data.verified_by_ocr ? 'FOUND' : 'UNCERTAIN') : 'NOT_FOUND',
    rawEvidence: data.value ?? undefined,
  }));

  const applicableRequirements: Requirement[] = (report.results ?? []).map((r: any) => ({
    id: `REQ-${r.rule_id}`,
    ruleId: r.rule_id,
    name: FIELD_LABELS[r.field] ?? r.field,
    description: r.description,
    applicability: r.legal_reference ?? '',
  }));

  const findings: Finding[] = (report.results ?? []).map((r: any) => ({
    id: `FND-${r.rule_id}`,
    requirementId: `REQ-${r.rule_id}`,
    status: statusFromRuleStatus(r.status),
    evidenceIds: [`EV-${r.field}`],
    ruleId: r.rule_id,
    explanation: r.reason,
    recommendation: r.status === 'FAIL' ? `Verify ${FIELD_LABELS[r.field] ?? r.field} physically on the package.` : '',
    confidence: r.verified_by_ocr ? 90 : 60,
    reviewRequired: r.status === 'FAIL' || r.status === 'NOT_APPLICABLE',
  }));

  return {
    id: `INS-${raw.inspection_id}`,
    product: manualProduct
      ? { id: `PROD-${raw.inspection_id}`, ...manualProduct }
      : { id: `PROD-${raw.inspection_id}`, name: 'Unnamed Product', brand: '', category: 'Other', isImported: false },
    images: [],
    evidence,
    applicableRequirements,
    findings,
    inspectorDecisions: [],
    overallStatus: report.overall_status === 'COMPLIANT' ? 'COMPLIANT' : 'NON_COMPLIANT',
    createdAt: new Date().toISOString(),
    inspectorId: 'LM-OFF-0000',
    inspectorName: 'Inspector',
  };
}