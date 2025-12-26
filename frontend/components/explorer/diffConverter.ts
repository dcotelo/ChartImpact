import { DiffResultV2, ResourceDiffV2, ResourceIdentityV2, ChangeV2 } from '@/lib/types';

/**
 * Converts plain text diff output to DiffResultV2 format
 * This allows Explorer v2 to work with plain text diffs when structured diff isn't available
 */
export function convertPlainDiffToV2(plainDiff: string, version1?: string, version2?: string): DiffResultV2 | null {
  if (!plainDiff || plainDiff.trim() === '') {
    return null;
  }

  const resources: ResourceDiffV2[] = [];
  const lines = plainDiff.split('\n');
  
  // Try to detect dyff format (paths with resource identifiers in parentheses)
  // Format: "metadata.labels.helm.sh/chart  (v1/ServiceAccount/default/argocd-application-controller)"
  const dyffPattern = /\(([^)]+)\)/;
  
  let currentResource: Partial<ResourceDiffV2> | null = null;
  let currentLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check if this line contains a resource identifier in parentheses (dyff format)
    const resourceMatch = trimmed.match(dyffPattern);
    if (resourceMatch) {
      // Save previous resource if exists
      if (currentResource && currentLines.length > 0) {
        finalizeResource(currentResource, currentLines, resources);
      }
      
      // Parse resource identifier
      const resourceParts = resourceMatch[1].split('/');
      let apiVersion = 'v1';
      let kind: string;
      let name: string;
      let namespace = '';
      
      if (resourceParts.length === 3) {
        // kind/namespace/name
        kind = resourceParts[0];
        namespace = resourceParts[1];
        name = resourceParts[2];
      } else if (resourceParts.length === 4) {
        // apiVersion/kind/namespace/name
        apiVersion = resourceParts[0];
        kind = resourceParts[1];
        namespace = resourceParts[2];
        name = resourceParts[3];
      } else {
        // Fallback
        kind = resourceParts[0] || 'Unknown';
        name = resourceParts[resourceParts.length - 1] || 'unknown';
        namespace = resourceParts.length > 2 ? resourceParts[1] : '';
      }
      
      // Start new resource
      currentResource = {
        identity: {
          apiVersion: apiVersion,
          kind: kind,
          name: name,
          namespace: namespace === 'default' ? '' : namespace,
          uid: null,
        },
        changeType: 'modified', // Default to modified, we can't easily detect add/remove from dyff output
        changes: [],
      };
      
      currentLines = [line];
    } else if (currentResource) {
      currentLines.push(line);
    }
  }
  
  // Save last resource
  if (currentResource && currentLines.length > 0) {
    finalizeResource(currentResource, currentLines, resources);
  }
  
  // If we didn't find any dyff-formatted resources, try to create a basic structure
  if (resources.length === 0) {
    // Create a single generic resource for the entire diff
    resources.push({
      identity: {
        apiVersion: 'v1',
        kind: 'Generic',
        name: 'comparison-result',
        namespace: '',
        uid: null,
      },
      changeType: 'modified',
      changes: [],
      summary: {
        totalChanges: 1,
        categories: ['general'],
      },
    });
  }
  
  return {
    metadata: {
      engineVersion: '1.0.0-converted',
      compareId: `converted-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      inputs: {
        left: {
          source: 'helm',
          version: version1 || 'v1',
        },
        right: {
          source: 'helm',
          version: version2 || 'v2',
        },
      },
    },
    resources: resources,
    stats: {
      resources: {
        added: 0,
        removed: 0,
        modified: resources.length,
      },
      changes: {
        total: resources.length,
      },
    },
  };
}

function finalizeResource(
  resource: Partial<ResourceDiffV2>,
  lines: string[],
  resources: ResourceDiffV2[]
) {
  if (!resource.identity) return;
  
  // Create a basic change entry from the collected lines
  const changeLines = lines.filter(l => {
    const trimmed = l.trim();
    return trimmed.startsWith('+') || trimmed.startsWith('-') || trimmed.startsWith('~');
  });
  
  if (changeLines.length > 0) {
    resource.changes = [{
      op: 'replace',
      path: 'unknown',
      pathTokens: ['unknown'],
      valueType: 'string',
      importance: 'medium',
    } as ChangeV2];
  }
  
  resource.summary = {
    totalChanges: changeLines.length || 1,
    categories: ['general'],
  };
  
  resources.push(resource as ResourceDiffV2);
}
