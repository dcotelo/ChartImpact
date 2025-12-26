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
  structuredDiff?: DiffResultV2;
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

// DiffResultV2 - Structured diff format for Explorer v2
// This format enables path-level filtering, semantic grouping,
// importance-based highlighting, and advanced analytics
export interface DiffResultV2 {
  metadata: DiffMetadata;
  resources: ResourceDiffV2[];
  stats?: DiffStatsV2;
}

// DiffMetadata provides traceability and context for the diff
export interface DiffMetadata {
  engineVersion: string;
  compareId: string;
  generatedAt: string;
  inputs: InputMetadata;
  normalizationRules?: string[];
}

// InputMetadata describes the sources being compared
export interface InputMetadata {
  left: SourceMetadata;
  right: SourceMetadata;
}

// SourceMetadata describes a single input source
export interface SourceMetadata {
  source: string;
  chart?: string;
  version?: string;
  valuesHash?: string;
}

// DiffStatsV2 provides aggregate statistics
export interface DiffStatsV2 {
  resources: DiffStatsResourcesV2;
  changes: DiffStatsChangesV2;
}

// DiffStatsResourcesV2 provides resource-level statistics
export interface DiffStatsResourcesV2 {
  added: number;
  removed: number;
  modified: number;
}

// DiffStatsChangesV2 provides change-level statistics
export interface DiffStatsChangesV2 {
  total: number;
}

// ResourceDiffV2 represents a diff for a single resource
export interface ResourceDiffV2 {
  identity: ResourceIdentityV2;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  beforeHash?: string;
  afterHash?: string;
  changes?: ChangeV2[];
  summary?: ResourceSummaryV2;
}

// ResourceIdentityV2 uniquely identifies a resource
export interface ResourceIdentityV2 {
  apiVersion: string;
  kind: string;
  name: string;
  namespace: string;
  uid?: string | null;
}

// ResourceSummaryV2 provides a derived summary of changes
export interface ResourceSummaryV2 {
  totalChanges: number;
  byImportance?: Record<string, number>;
  categories?: string[];
}

// ChangeV2 represents a field-level change with semantic information
export interface ChangeV2 {
  op: 'add' | 'remove' | 'replace';
  path: string;
  pathTokens: (string | number)[];
  before?: any;
  after?: any;
  valueType: string;
  semanticType?: string;
  changeCategory?: string;
  importance?: 'low' | 'medium' | 'high' | 'critical';
  flags?: string[];
}

