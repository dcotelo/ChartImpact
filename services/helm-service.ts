import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export interface HelmCompareOptions {
  repository: string;
  chartPath: string;
  version1: string;
  version2: string;
  valuesFile?: string;
  valuesContent?: string;
}

export class HelmService {
  private workDir: string;

  constructor() {
    this.workDir = path.join(tmpdir(), 'helm-diff-viewer');
  }

  async compareVersions(options: HelmCompareOptions): Promise<{ diff: string; hasDiff: boolean }> {
    const { repository, chartPath, version1, version2, valuesFile, valuesContent } = options;
    
    // Create unique work directory for this request
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const workPath = path.join(this.workDir, requestId);
    
    try {
      // Ensure work directory exists
      await fs.mkdir(workPath, { recursive: true });
      
      // Clone repository
      const repoPath = path.join(workPath, 'repo');
      await this.cloneRepository(repository, repoPath);
      
      // Extract versions
      const version1Path = path.join(workPath, 'version1');
      const version2Path = path.join(workPath, 'version2');
      
      await this.extractVersion(repoPath, chartPath, version1, version1Path);
      await this.extractVersion(repoPath, chartPath, version2, version2Path);
      
      // Create values file if provided
      let valuesFilePath: string | undefined;
      if (valuesContent) {
        valuesFilePath = path.join(workPath, 'values.yaml');
        await fs.writeFile(valuesFilePath, valuesContent, 'utf-8');
      } else if (valuesFile) {
        valuesFilePath = path.join(repoPath, valuesFile);
      }
      
      // Render Helm templates
      const rendered1 = await this.renderHelmTemplate(version1Path, valuesFilePath);
      const rendered2 = await this.renderHelmTemplate(version2Path, valuesFilePath);
      
      // Compare using dyff or fallback to diff
      const diff = await this.compareYaml(rendered1, rendered2);
      
      // Cleanup
      await this.cleanup(workPath);
      
      return {
        diff,
        hasDiff: diff.trim().length > 0
      };
    } catch (error) {
      // Cleanup on error
      await this.cleanup(workPath).catch(() => {});
      throw error;
    }
  }

  private async cloneRepository(repo: string, targetPath: string): Promise<void> {
    try {
      await fs.mkdir(targetPath, { recursive: true });
      
      // Set environment variables to prevent Git from prompting for credentials
      const env = {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GIT_ASKPASS: '',
        GIT_CREDENTIAL_HELPER: ''
      };
      
      // Clone the repository (full clone to get all tags and branches)
      // Use --no-single-branch to fetch all branches
      await execAsync(`git clone --no-single-branch ${repo} ${targetPath}`, {
        timeout: 120000,
        env
      });
      // Explicitly fetch all tags after cloning
      await execAsync(`git -C ${targetPath} fetch --tags`, {
        timeout: 30000,
        env
      });
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error}`);
    }
  }

  private async extractVersion(
    repoPath: string,
    chartPath: string,
    version: string,
    targetPath: string
  ): Promise<void> {
    try {
      // Set environment variables to prevent Git from prompting for credentials
      const env = {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GIT_ASKPASS: '',
        GIT_CREDENTIAL_HELPER: ''
      };
      
      // Ensure we have all refs, including tags and branches
      // Fetch all tags in case they weren't included in the clone
      await execAsync(`git -C ${repoPath} fetch --all --tags --prune`, {
        timeout: 60000,
        env
      });
      
      // Escape the version to handle special characters and shell injection
      const escapedVersion = version.replace(/[;&|`$(){}]/g, '\\$&');
      
      // Try to checkout - Git will automatically resolve tags, branches, or commits
      try {
        await execAsync(`git -C ${repoPath} checkout ${escapedVersion} 2>&1`, {
          timeout: 15000,
          env
        });
      } catch (checkoutError: any) {
        // The version might not exist - provide a helpful error message
        // First, let's check what refs are available
        let availableRefs = '';
        try {
          const { stdout: tagsStdout } = await execAsync(`git -C ${repoPath} tag -l`, { timeout: 5000, env });
          const { stdout: branchesStdout } = await execAsync(`git -C ${repoPath} branch -r --format='%(refname:short)'`, { timeout: 5000, env });
          const tags = tagsStdout.trim().split('\n').filter(t => t).slice(0, 10).join(', ');
          const branches = branchesStdout.trim().split('\n').filter(b => b).slice(0, 10).join(', ');
          availableRefs = `\nAvailable tags (sample): ${tags || 'none'}\nAvailable branches (sample): ${branches || 'none'}`;
        } catch {
          // Ignore errors when checking refs
        }
        
        throw new Error(
          `Version/tag/branch "${version}" not found in the repository.` +
          `${availableRefs}\nPlease verify that the version exists in the repository.`
        );
      }
      
      // Copy chart directory
      const sourceChartPath = path.join(repoPath, chartPath);
      await fs.mkdir(targetPath, { recursive: true });
      
      // Check if chart path exists
      try {
        await fs.access(sourceChartPath);
        await this.copyDirectory(sourceChartPath, targetPath);
      } catch {
        throw new Error(`Chart path not found: ${chartPath} at version ${version}`);
      }

      // Build dependencies after copying the chart
      // Note: This might fail if repositories aren't available yet, 
      // but we'll try again in renderHelmTemplate after all repos are added
      try {
        await this.buildChartDependencies(targetPath);
      } catch (error: any) {
        // Log but don't fail here - we'll retry in renderHelmTemplate
        console.warn(`Warning: Failed to build dependencies during version extraction: ${error.message}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to extract version ${version}: ${error.message || error}`);
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async renderHelmTemplate(
    chartPath: string,
    valuesFile?: string
  ): Promise<string> {
    try {
      // Build dependencies before rendering
      await this.buildChartDependencies(chartPath);
      
      const valuesFlag = valuesFile ? `-f ${valuesFile}` : '';
      const env = {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GIT_ASKPASS: '',
        GIT_CREDENTIAL_HELPER: ''
      };
      
      const { stdout, stderr } = await execAsync(
        `helm template app ${chartPath} ${valuesFlag}`,
        { 
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
          env
        }
      );
      
      if (stderr && !stderr.includes('Warning')) {
        throw new Error(`Helm template error: ${stderr}`);
      }
      
      return stdout;
    } catch (error: any) {
      throw new Error(`Failed to render Helm template: ${error.message}`);
    }
  }

  private async buildChartDependencies(chartPath: string): Promise<void> {
    const chartYamlPath = path.join(chartPath, 'Chart.yaml');
    
    // Check if Chart.yaml exists
    try {
      await fs.access(chartYamlPath);
    } catch {
      // No Chart.yaml, no dependencies to build
      return;
    }

    // Parse Chart.yaml for dependencies
    let chartYamlContent: string;
    try {
      chartYamlContent = await fs.readFile(chartYamlPath, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to read Chart.yaml: ${error.message}`);
    }

    const dependencies = this.parseChartDependencies(chartYamlContent);

    if (dependencies.length === 0) {
      // Check if Chart.yaml mentions dependencies at all
      if (chartYamlContent.includes('dependencies:')) {
        // Has dependencies section but no URLs found - might be using conditionals or oci://
        // Try to build anyway, helm will handle it
      } else {
        // No dependencies, nothing to build
        return;
      }
    } else {
      // Add required Helm repositories
      try {
        await this.addChartRepositories(dependencies);
      } catch (error: any) {
        throw new Error(`Failed to add Helm repositories: ${error.message}`);
      }
    }

    // Build dependencies
    const env = {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: '',
      GIT_CREDENTIAL_HELPER: ''
    };

    try {
      // Ensure charts directory exists (helm dependency build will create it, but just in case)
      const chartsDir = path.join(chartPath, 'charts');
      try {
        await fs.mkdir(chartsDir, { recursive: true });
      } catch {
        // Directory might already exist, ignore
      }

      const { stdout, stderr } = await execAsync(
        `helm dependency build ${chartPath}`,
        {
          timeout: 120000,
          maxBuffer: 5 * 1024 * 1024, // 5MB buffer
          env
        }
      );
      
      // Log output for debugging
      if (stdout) {
        console.log('Helm dependency build output:', stdout);
      }
      
      // Check stderr for actual errors (warnings are okay)
      if (stderr) {
        const errorLines = stderr.split('\n').filter((line: string) => 
          line.trim() && 
          !line.toLowerCase().includes('warning') &&
          !line.toLowerCase().includes('info')
        );
        
        if (errorLines.length > 0) {
          const errorMsg = errorLines.join('; ');
          console.warn('Helm dependency build had errors:', errorMsg);
        }
      }

      // Verify dependencies were actually built by checking charts directory
      // This helps catch cases where helm dependency build claims success but didn't download anything
      try {
        const chartsContents = await fs.readdir(chartsDir);
        // Charts directory should contain .tgz files or directories for dependencies
        // If Chart.yaml has dependencies but charts/ is empty, something went wrong
        if (chartYamlContent.includes('dependencies:') && chartsContents.length === 0) {
          console.warn('Warning: Chart.yaml has dependencies but charts/ directory is empty after build');
        }
      } catch {
        // Charts directory might not exist if no dependencies, which is fine
      }
    } catch (error: any) {
      // Extract meaningful error message
      let errorMessage = 'Unknown error';
      if (error.stderr) {
        errorMessage = error.stderr.trim();
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check if it's a repository-related error
      if (errorMessage.includes('no repository definition') || errorMessage.includes('repository')) {
        throw new Error(
          `Failed to build chart dependencies: ${errorMessage}. ` +
          `Required Helm repositories may not be accessible or properly configured. ` +
          `Please check that all repository URLs in Chart.yaml are valid and accessible.`
        );
      }
      
      throw new Error(
        `Failed to build chart dependencies: ${errorMessage}. ` +
        `Please ensure Helm can access chart repositories and all dependencies are available.`
      );
    }
  }

  private parseChartDependencies(chartYaml: string): string[] {
    const repositories: Set<string> = new Set();
    
    // Match dependencies section - handle both YAML formats
    // Format 1: dependencies:\n  - name: ...\n    repository: ...
    // Format 2: dependencies:\n  - repository: ... (without name)
    const dependenciesSection = chartYaml.match(/^dependencies:\s*\n((?:[ \t]+.*\n?)+)/m);
    if (dependenciesSection) {
      const dependenciesBlock = dependenciesSection[1];
      
      // Extract repository URLs from dependencies
      // Match: repository: "url" or repository: 'url' or repository: url
      // Handle multiline YAML (indented lines after repository)
      const repoMatches = dependenciesBlock.matchAll(/repository:\s*["']?([^"'\n\s]+[^"'\n]*)["']?/g);
      for (const match of repoMatches) {
        const repoUrl = match[1]?.trim();
        if (repoUrl && 
            !repoUrl.startsWith('@') && 
            !repoUrl.startsWith('oci://') && 
            (repoUrl.startsWith('http://') || repoUrl.startsWith('https://'))) {
          repositories.add(repoUrl);
        }
      }
    }

    // Also check for repositories section (deprecated but still used)
    const repositoriesMatch = chartYaml.match(/^repositories:\s*\n((?:[ \t]+.*\n?)+)/m);
    if (repositoriesMatch) {
      const repositoriesBlock = repositoriesMatch[1];
      const urlMatches = repositoriesBlock.matchAll(/url:\s*["']?([^"'\n\s]+[^"'\n]*)["']?/g);
      for (const match of urlMatches) {
        const repoUrl = match[1]?.trim();
        if (repoUrl && (repoUrl.startsWith('http://') || repoUrl.startsWith('https://'))) {
          repositories.add(repoUrl);
        }
      }
    }

    return Array.from(repositories);
  }

  private async addChartRepositories(repositoryUrls: string[]): Promise<void> {
    const env = {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: '',
      GIT_CREDENTIAL_HELPER: ''
    };

    for (const repoUrl of repositoryUrls) {
      if (!repoUrl || repoUrl.trim() === '') continue;

      // Generate a safe repository name from URL
      // Use domain name as base, replace special chars with hyphens
      let repoName = repoUrl
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/[^a-z0-9-]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase()
        .substring(0, 50); // Limit length

      if (!repoName) {
        repoName = `repo-${Math.random().toString(36).substr(2, 9)}`;
      }

      try {
        // Add repository (idempotent - will update if exists)
        await execAsync(
          `helm repo add ${repoName} "${repoUrl}"`,
          {
            timeout: 30000,
            maxBuffer: 2 * 1024 * 1024, // 2MB buffer
            env
          }
        );
      } catch (error: any) {
        // Repository might already exist, try to update
        try {
          await execAsync(
            `helm repo update ${repoName}`,
            {
              timeout: 30000,
              maxBuffer: 2 * 1024 * 1024,
              env
            }
          );
        } catch (updateError) {
          // Ignore update errors, continue with other repos
          console.warn(`Failed to add/update repository ${repoName}:`, error.message);
        }
      }
    }

    // Update all repositories
    try {
      await execAsync(
        `helm repo update`,
        {
          timeout: 60000,
          maxBuffer: 5 * 1024 * 1024, // 5MB buffer
          env
        }
      );
    } catch (error) {
      // Non-fatal, continue anyway
      console.warn('Failed to update Helm repositories:', error);
    }
  }

  private async compareYaml(yaml1: string, yaml2: string): Promise<string> {
    // Try to use dyff if available, otherwise fallback to diff
    try {
      // Write to temp files for dyff
      const tmp1 = path.join(this.workDir, `tmp1-${Date.now()}.yaml`);
      const tmp2 = path.join(this.workDir, `tmp2-${Date.now()}.yaml`);
      
      await fs.writeFile(tmp1, yaml1, 'utf-8');
      await fs.writeFile(tmp2, yaml2, 'utf-8');
      
      try {
        const { stdout } = await execAsync(
          `dyff between "${tmp1}" "${tmp2}" --omit-header`,
          { 
            timeout: 10000,
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large diffs
          }
        );
        
        // Cleanup temp files
        await fs.unlink(tmp1).catch(() => {});
        await fs.unlink(tmp2).catch(() => {});
        
        return stdout;
      } catch {
        // Cleanup temp files
        await fs.unlink(tmp1).catch(() => {});
        await fs.unlink(tmp2).catch(() => {});
        throw new Error('dyff failed');
      }
    } catch {
      // Fallback to simple diff or custom comparison
      return this.simpleYamlDiff(yaml1, yaml2);
    }
  }

  private simpleYamlDiff(yaml1: string, yaml2: string): string {
    // Simple text-based diff as fallback
    const lines1 = yaml1.split('\n');
    const lines2 = yaml2.split('\n');
    
    const diff: string[] = [];
    const maxLen = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLen; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (line1 !== line2) {
        if (line1) diff.push(`- ${line1}`);
        if (line2) diff.push(`+ ${line2}`);
      }
    }
    
    return diff.join('\n');
  }

  private async cleanup(workPath: string): Promise<void> {
    try {
      await fs.rm(workPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
      console.error('Cleanup error:', error);
    }
  }
}

