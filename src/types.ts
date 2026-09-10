export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'VERIFICATION_REQUIRED';

export type PackageSide = 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'BOTTOM' | 'OTHER';

export type ProductCategory =
  | 'Food & Grocery'
  | 'Personal Care'
  | 'Household'
  | 'Garments & Textiles'
  | 'Stationery'
  | 'Consumer Goods'
  | 'Agricultural'
  | 'Other';

export interface PackageImage {
  id: string;
  side: PackageSide;
  url: string;
  capturedAt: string;
  qualityScore: number;
  qualityChecks: {
    resolution: 'GOOD' | 'POOR';
    orientation: 'GOOD' | 'POOR';
    packageDetected: boolean;
    textVisibility: 'GOOD' | 'POOR';
    blur: 'LOW' | 'HIGH';
    lighting: 'GOOD' | 'POOR';
  };
}

export interface Evidence {
  id: string;
  type: string;
  label: string;
  value: string;
  confidence: number;
  imageId: string;
  boundingBox?: { x: number; y: number; w: number; h: number };
  source: 'OCR' | 'VISION' | 'OCR+VISION' | 'MANUAL';
  status: 'FOUND' | 'NOT_FOUND' | 'CONFLICTING' | 'UNCERTAIN';
  rawEvidence?: string;
  conflictingValues?: { imageId: string; value: string; side: PackageSide }[];
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  effectiveDate: string;
  source: string;
  mandatory: boolean;
}

export interface Requirement {
  id: string;
  ruleId: string;
  name: string;
  description: string;
  applicability: string;
}

export interface Finding {
  id: string;
  requirementId: string;
  status: ComplianceStatus;
  evidenceIds: string[];
  ruleId: string;
  explanation: string;
  recommendation: string;
  confidence: number;
  reviewRequired: boolean;
}

export interface InspectorDecision {
  findingId: string;
  decision: 'CONFIRM' | 'REJECT' | 'MODIFY' | 'REQUEST_EVIDENCE';
  notes: string;
  finalStatus: ComplianceStatus;
  decidedAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  brand: string;
  isImported: boolean;
  previousInspections?: number;
}

export interface Inspection {
  id: string;
  product: Product;
  images: PackageImage[];
  evidence: Evidence[];
  applicableRequirements: Requirement[];
  findings: Finding[];
  inspectorDecisions: InspectorDecision[];
  overallStatus: ComplianceStatus;
  createdAt: string;
  completedAt?: string;
  inspectorId: string;
  inspectorName: string;
  location?: string;
  remarks?: string;
}

export type Screen =
  | 'login'
  | 'dashboard'
  | 'new-inspection'
  | 'capture'
  | 'image-quality'
  | 'category'
  | 'analysis'
  | 'evidence-review'
  | 'requirements'
  | 'compliance-result'
  | 'inspector-review'
  | 'report'
  | 'inspections'
  | 'rules'
  | 'profile'
  | 'product-history';
