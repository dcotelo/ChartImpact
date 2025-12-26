export interface CompareRequest {
  repository: string;
  chartPath: string;
  version1: string;
  version2: string;
  valuesFile?: string;
  valuesContent?: string;
  ignoreLabels?: boolean;
  secretHandling?: 'suppress' | 'show' | 'decode';
  contextLines?: number;
  suppressKinds?: string[];
  suppressRegex?: string;
}

export interface CompareResponse {
  success: boolean;
  diff?: string;
  error?: string;
  version1?: string;
  version2?: string;
  statistics?: ChangeStatistics;
}

export interface DiffResult {
  hasDiff: boolean;
  diff: string;
  error?: string;
}

// Statistics interfaces
export interface ChangeStatistics {
  summary: ChangeSummary;
  byKind: ResourceStats[];
  byCategory: CategoryStats[];
  lines: LineStats;
  impact: ChangeImpact;
}

export interface ChangeSummary {
  totalResources: number;
  resourcesAdded: number;
  resourcesRemoved: number;
  resourcesModified: number;
  resourcesUnchanged: number;
  totalChanges: number;
}

export interface ResourceStats {
  kind: string;
  count: number;
  added: number;
  removed: number;
  modified: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  resources: string[];
}

export interface LineStats {
  added: number;
  removed: number;
  unchanged: number;
  total: number;
}

export interface ChangeImpact {
  level: 'high' | 'medium' | 'low';
  criticalChanges: CriticalChange[];
  breakingChanges: BreakingChange[];
}

export interface CriticalChange {
  resource: string;
  kind: string;
  field: string;
  description: string;
}

export interface BreakingChange {
  resource: string;
  kind: string;
  field: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

// New v2 types for structured diff format
export interface DiffResultV2 {
  metadata: DiffMetadata;
  resources: ResourceDiff[];
  stats?: DiffStats;
}

export interface DiffMetadata {
  engineVersion: string;
  compareId: string;
  generatedAt: string;
  inputs: {
    left: any;
    right: any;
  };
  normalizationRules?: string[];
}

export interface ResourceDiff {
  identity: ResourceIdentity;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  beforeHash?: string;
  afterHash?: string;
  changes: Change[];
  summary?: ChangeSummaryDetail;
}

export interface ResourceIdentity {
  apiVersion: string;
  kind: string;
  name: string;
  namespace?: string | null;
  uid?: string | null;
}

export interface Change {
  path: string;
  semanticType?: 'spec' | 'metadata' | 'status' | 'data' | 'other';
  importance?: 'critical' | 'high' | 'medium' | 'low';
  flags?: string[];
  type: 'value-change' | 'added' | 'removed' | 'type-change' | 'array-diff';
  before?: any;
  after?: any;
  arrayDiff?: ArrayDiff;
}

export interface ArrayDiff {
  added?: any[];
  removed?: any[];
  modified?: ArrayItemDiff[];
}

export interface ArrayItemDiff {
  index: number;
  before: any;
  after: any;
}

export interface ChangeSummaryDetail {
  totalChanges: number;
  byImportance?: Record<string, number>;
  bySemanticType?: Record<string, number>;
  flags?: string[];
}

export interface DiffStats {
  totalResources: number;
  byChangeType: Record<string, number>;
  byKind: Record<string, number>;
  byNamespace: Record<string, number>;
  flagSummary?: Record<string, number>;
}

