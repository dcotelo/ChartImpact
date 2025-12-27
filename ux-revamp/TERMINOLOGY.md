# ChartImpact Terminology and Copy Guidelines

**Purpose:** Establish canonical terminology and copy standards across all user-facing text in ChartImpact

**Principles:** Clarity over cleverness, consistency builds trust, mission-aligned language

---

## Table of Contents

1. [Product Naming](#product-naming)
2. [Core Concepts](#core-concepts)
3. [UI Elements](#ui-elements)
4. [Actions and Verbs](#actions-and-verbs)
5. [Risk and Impact Language](#risk-and-impact-language)
6. [Technical Terms](#technical-terms)
7. [Deprecated Terms](#deprecated-terms)
8. [Voice and Tone](#voice-and-tone)
9. [Copy Templates](#copy-templates)

---

## Product Naming

### ChartImpact (ONE WORD)

**Official name:** ChartImpact  
**Not:** Chart Impact, chart-impact, Chartimpact

**Usage:**
- ✅ "ChartImpact helps teams understand deployment risk"
- ✅ "Welcome to ChartImpact"
- ❌ "Chart Impact analyzes..." (two words)
- ❌ "chart-impact" (only in URLs/technical contexts)

**Tagline/Mission:**
"Understand deployment risk before upgrading Helm charts"

**Not:**
- "Compare differences between two Helm chart versions" (too technical, undersells value)
- "Helm chart diff tool" (too generic)

---

## Core Concepts

### Impact vs. Difference

**Use:** Impact, Changes, Modifications  
**Avoid:** Differences, Diffs (in user-facing copy)

**Rationale:** "Impact" is outcome-focused and aligns with mission; "diff" is technical jargon

**Examples:**
- ✅ "Impact Summary"
- ✅ "View all changes"
- ✅ "Impact Explorer"
- ❌ "Diff Explorer" (technical)
- ❌ "Differences found" (generic)

**Exception:** "YAML diff" is acceptable in technical contexts where precision is needed

---

### Risk vs. Importance vs. Severity

**Canonical term:** Risk Level  
**Values:** High, Medium, Low

**Not:** Importance, Severity, Priority, Criticality

**Usage:**
- ✅ "3 high-risk changes"
- ✅ "Risk level: High"
- ❌ "Critical changes" (unless truly critical)
- ❌ "Important resource" (vague)

**Rationale:** "Risk" is clear, outcome-focused, and aligns with mission (deployment risk)

---

### Change Types

**Canonical terms:**
- Added (resource was created)
- Removed (resource was deleted)
- Changed (resource was modified)

**Not:**
- ❌ Created → Use "Added"
- ❌ Deleted → Use "Removed"
- ❌ Modified → Use "Changed"
- ❌ Updated → Use "Changed"

**Usage:**
- ✅ "Deployment/frontend: Added"
- ✅ "NetworkPolicy/egress: Removed"
- ✅ "ConfigMap/settings: Changed"

---

### Availability vs. High-Availability

**Use:** Availability (singular)  
**Context:** "Availability impact" or "Affects availability"

**Examples:**
- ✅ "This change affects availability"
- ✅ "Availability Risk: Replica count reduced"
- ❌ "HA impact" (jargon)
- ❌ "High-availability concerns" (wordy)

**Rationale:** "Availability" is clear and encompasses all uptime-related concerns

---

### Security vs. Security-Sensitive

**Use:** Security (as adjective or noun)

**Examples:**
- ✅ "Security impact"
- ✅ "Security-related changes"
- ✅ "This affects security"
- ❌ "Security-sensitive resources" (wordy)
- ❌ "SecOps concerns" (jargon)

---

### Version vs. Tag vs. Commit

**Primary term:** Version  
**Technical contexts:** Tag, Branch, Commit

**Usage:**
- ✅ "Select two versions to compare" (user-facing)
- ✅ "Version 1: v1.0.0 (tag)" (when precision matters)
- ❌ "Select Git ref" (too technical)

**Form labels:**
- ✅ "Version 1 (from)"
- ✅ "Version 2 (to)"

---

### Repository vs. Repo

**Use:** Repository (full word) in UI  
**Exception:** "Repo" acceptable in logs, code, internal docs

**Examples:**
- ✅ "Chart repository" (label)
- ✅ "Repository URL" (form field)
- ❌ "Repo URL" (too casual for UI)

---

### Chart Path vs. Chart Directory

**Canonical:** Chart Path  
**Context:** "Path to chart within repository"

**Examples:**
- ✅ "Chart Path: charts/myapp"
- ❌ "Chart directory" (less precise)
- ❌ "Chart location" (vague)

---

## UI Elements

### Buttons and CTAs

#### Primary Actions

**Compare/Analyze:**
- ✅ "Analyze Impact" (preferred on form submit)
- ✅ "Compare Versions" (acceptable alternative)
- ❌ "Run comparison"
- ❌ "Diff charts"

**Navigation:**
- ✅ "View Details"
- ✅ "Explore All Changes"
- ✅ "Back to Summary"
- ❌ "Go to Explorer"
- ❌ "See more"

**Actions:**
- ✅ "Copy Link"
- ✅ "New Analysis"
- ✅ "Try Example"
- ❌ "Share" (too vague - share how?)
- ❌ "Reset"

---

### Section Headings

**Impact Summary:**
- "Impact Summary" (not "Summary" alone)
- "Availability Impact"
- "Security Impact"
- "Other Changes"

**Explorer:**
- "Impact Explorer" (not "Diff Explorer")
- "Resource List"
- "Details"
- "Filters"

**Form:**
- "Analyze Helm Chart Upgrade" (heading)
- "Chart Repository" (field label)
- "Chart Path" (field label)
- "Advanced Options" (collapsible section)

---

### Status Messages

**Loading:**
- ✅ "Analyzing chart upgrade..."
- ✅ "Loading versions..."
- ❌ "Processing..." (vague)
- ❌ "Please wait..."

**Success:**
- ✅ "Analysis complete"
- ✅ "No changes detected" (positive framing)
- ❌ "Done" (too casual)
- ❌ "Finished"

**Empty States:**
- ✅ "No high-risk changes found"
- ✅ "All changes are low risk"
- ❌ "No results"
- ❌ "Nothing to show"

---

## Actions and Verbs

### User Actions

**Discovery:**
- Understand, Review, Explore, Inspect
- ✅ "Understand deployment risk"
- ✅ "Review changes"
- ❌ "Analyze" (too technical as user action)

**Interaction:**
- Click, Select, Enter, View, Expand, Collapse
- ✅ "Click to expand"
- ✅ "Select a version"
- ❌ "Choose" (less direct)

**Sharing:**
- Copy, Share, Bookmark
- ✅ "Copy link to clipboard"
- ❌ "Get shareable link"

---

### System Actions

**Processing:**
- Analyzing, Loading, Comparing, Rendering
- ✅ "Analyzing chart versions..."
- ✅ "Rendering Helm templates..."
- ❌ "Diffing..." (jargon)

**Results:**
- Found, Detected, Identified, Surfaced
- ✅ "3 high-risk changes detected"
- ✅ "No security impacts found"
- ❌ "Discovered" (too formal)

---

## Risk and Impact Language

### Risk Indicators

**High Risk:**
- ✅ "High risk: Replica count reduced"
- ✅ "⚠ May impact availability"
- ✅ "Review before deploying"
- ❌ "CRITICAL" (alarmist)
- ❌ "DANGER" (too strong)

**Medium Risk:**
- ✅ "Medium risk: Configuration changed"
- ✅ "Consider reviewing this change"
- ❌ "Warning" (ambiguous)

**Low Risk:**
- ✅ "Low risk: Label updated"
- ✅ "Minor change"
- ❌ "Insignificant" (dismissive)

---

### Explanatory Language

**Structure:** [What changed] → [Why it matters]

**Templates:**
- "Replica count: 2 → 1. Reduced redundancy may impact availability."
- "NetworkPolicy removed. Pods can now communicate with external endpoints."
- "Update strategy changed to OnDelete. Manual pod deletion required for updates."

**Principles:**
- State facts first, implications second
- Use active voice
- Be specific (not "this might cause issues")
- Avoid judgment ("should", "must")

**Examples:**
- ✅ "This change affects availability during pod restarts"
- ✅ "RBAC permissions expanded: pods can now create secrets"
- ❌ "This is risky" (too vague)
- ❌ "You should review this" (prescriptive)

---

### Verdict Language

**High Risk Overall:**
- ✅ "Review before deploying"
- ✅ "This upgrade contains high-risk changes"
- ❌ "Do not deploy" (too prescriptive)
- ❌ "Dangerous upgrade" (alarmist)

**Low Risk Overall:**
- ✅ "Low risk upgrade"
- ✅ "Minor changes only"
- ❌ "Safe to deploy" (too prescriptive)

**No Risk:**
- ✅ "No changes detected"
- ✅ "Versions are identical"

---

## Technical Terms

### Kubernetes Resources

**Use correct capitalization:**
- Deployment (not deployment)
- StatefulSet (not Statefulset or stateful set)
- ConfigMap (not Configmap or config map)
- NetworkPolicy (not Network Policy)
- ServiceAccount (not Service Account)

**Plural:** Add 's' (Deployments, Services)

**Context:** Always include name
- ✅ "Deployment/frontend"
- ✅ "Service/api"
- ❌ "The deployment" (which one?)

---

### Helm Terms

**Chart:** Lowercase unless part of a title
- ✅ "Helm chart"
- ✅ "chart repository"
- ✅ "Chart Path" (field label)

**Values:**
- ✅ "values file"
- ✅ "values content"
- ❌ "Values" (capital V only in official Helm context)

**Templates:**
- ✅ "Helm templates"
- ✅ "rendered templates"

---

### Git Terms

**Version:** Preferred general term  
**Tag:** Specific Git concept  
**Branch:** Specific Git concept  
**Commit:** Specific Git concept

**Usage:**
- User-facing: "version"
- Technical: "tag", "branch", "commit SHA"

**Examples:**
- ✅ "Select two versions" (general)
- ✅ "Tag: v1.0.0" (specific)
- ✅ "Commit: abc123" (specific)

---

## Deprecated Terms

### Do Not Use

| Deprecated | Use Instead | Reason |
|------------|-------------|--------|
| Diff (as noun) | Change, Impact | Too technical |
| Difference | Change | Too generic |
| Compare (as noun) | Comparison, Analysis | Verb, not noun |
| Repo | Repository | Too casual |
| Chart impact (two words) | ChartImpact | Product name |
| Critical | High risk | Reserve for true emergencies |
| Dangerous | High risk | Alarmist |
| Safe | Low risk | Too prescriptive |
| Must/Should | Consider, May | Prescriptive |
| Obviously | (delete) | Condescending |
| Simply/Just | (delete) | Dismissive |

---

## Voice and Tone

### Voice (Consistent)

**ChartImpact's voice is:**
- **Clear:** Plain language, no unnecessary jargon
- **Confident:** Authoritative but not arrogant
- **Helpful:** Guides without prescribing
- **Professional:** Serious but not stuffy

**ChartImpact's voice is NOT:**
- Alarmist or anxiety-inducing
- Overly casual or jokey
- Condescending or assuming knowledge
- Vague or non-committal

---

### Tone (Context-Dependent)

#### Welcome / Onboarding
**Tone:** Friendly, encouraging, clear

**Example:**
"ChartImpact helps you understand deployment risk before upgrading Helm charts. Try a quick example or analyze your own charts."

---

#### Form / Input
**Tone:** Instructive, efficient, helpful

**Example:**
"Chart Path: Path to the chart within your repository (e.g., charts/myapp)"

---

#### Results / Impact
**Tone:** Direct, factual, explanatory

**Example:**
"This upgrade contains 3 high-risk changes affecting availability. Review these changes before deploying."

---

#### Errors
**Tone:** Calm, helpful, solution-oriented

**Example:**
"We couldn't access this repository. Please check that the URL is correct and the repository is publicly accessible."

**Not:**
"Error: Repository not found." (too harsh)

---

#### Success
**Tone:** Positive, confirming

**Example:**
"No changes detected. The two versions are identical."

---

## Copy Templates

### Mission Statement

```
Understand deployment risk before upgrading Helm charts
```

**Alternative (longer):**
```
ChartImpact surfaces availability and security risks in Helm chart 
upgrades, helping teams make confident deployment decisions.
```

---

### Empty States

**No changes:**
```
✓ No Changes Detected

The two versions are identical. No differences were found 
in the rendered Helm templates.

Repository: {repo}
Chart: {path}
Versions: {v1} and {v2}

[Analyze Different Versions]
```

**No high-risk changes:**
```
✓ Low Risk Upgrade

This upgrade contains only low-risk changes. No availability 
or security impacts were detected.

[View All Changes]
```

---

### Error Messages

**Repository not found:**
```
⚠ Unable to Access Repository

We couldn't clone the repository:
{url}

Please check:
• The URL is correct
• The repository is publicly accessible
• Your network connection is working

[Try Again]  [Use Example]  [Get Help]
```

**Chart not found:**
```
⚠ Chart Not Found

We couldn't find a Helm chart at:
{path}

Please check:
• The chart path is correct
• The chart exists in both versions
• The path is relative to the repository root

[Edit Path]  [Get Help]
```

**Network error:**
```
⚠ Connection Error

We're having trouble connecting to the server. 
Please check your internet connection and try again.

[Retry]
```

**Timeout:**
```
⚠ Analysis Taking Longer Than Expected

This comparison is taking longer than usual. 
This can happen with large charts or slow repositories.

Elapsed time: {time}

[Keep Waiting]  [Cancel]
```

---

### Progress Messages

**Stages:**
1. "Initializing analysis..."
2. "Cloning repository..."
3. "Extracting version {v1}..."
4. "Extracting version {v2}..."
5. "Building chart dependencies..."
6. "Rendering Helm templates..."
7. "Analyzing changes..."
8. "Analysis complete"

**Note:** Use real backend progress if available; otherwise use indeterminate spinner

---

### Risk Explanations

**Template:**
```
{Resource}: {What changed}
{Why it matters}
```

**Examples:**

**High - Availability:**
```
Deployment/frontend: Replica count reduced from 2 to 1
⚠ Reduced redundancy may impact availability during pod restarts 
or node failures.
```

**High - Security:**
```
NetworkPolicy/egress-rules: Rule removed
⚠ Pods can now communicate with external network endpoints. 
This may increase security risk.
```

**Medium - Availability:**
```
StatefulSet/database: Update strategy changed to OnDelete
ℹ Manual pod deletion required for updates. This may complicate 
rollout procedures.
```

**Low:**
```
Service/api: Label updated
Metadata change with no expected runtime impact.
```

---

### Call-to-Action Copy

**Primary CTAs:**
- "Analyze Impact" (form submit)
- "Try Example" (quick start)
- "Analyze Your Charts" (reveal form)
- "View Details" (expand)
- "Explore All Changes" (to Explorer)

**Secondary CTAs:**
- "Copy Link" (share)
- "New Analysis" (reset)
- "Back to Summary" (navigation)
- "Show Advanced Options" (reveal)
- "Get Help" (support)

---

### Help Text

**Form Fields:**

**Repository URL:**
```
Chart repository URL
Example: https://github.com/argoproj/argo-helm.git
```

**Chart Path:**
```
Path to chart within repository
Example: charts/myapp
```

**Version:**
```
Select a version or enter manually
Supports tags, branches, and commit SHAs
```

**Values File:**
```
Path to values file within repository (optional)
Example: values/prod.yaml
```

**Values Content:**
```
YAML content for values file (optional)
Takes precedence over values file path
```

---

### Quick Start Section

**Heading:**
```
🚀 Quick Start
```

**Description:**
```
See how ChartImpact surfaces deployment risks in real chart upgrades
```

**Example Cards:**
```
ArgoCD Version Comparison
Compare ArgoCD 9.1.5 → 9.1.6 to see risk signals

DataDog Monorepo Example
Analyze a chart in a monorepo structure
```

---

## Writing Guidelines

### DO:

1. **Start with user benefit**
   - ✅ "Understand deployment risk"
   - ❌ "ChartImpact is a tool that..."

2. **Use active voice**
   - ✅ "This change affects availability"
   - ❌ "Availability is affected by this change"

3. **Be specific**
   - ✅ "Replica count reduced from 2 to 1"
   - ❌ "Replicas changed"

4. **Explain technical terms**
   - ✅ "StatefulSet (database pods)"
   - ❌ "StatefulSet"

5. **Provide examples**
   - ✅ "Chart path (e.g., charts/myapp)"
   - ❌ "Chart path"

6. **Use parallel structure**
   - ✅ "Added, Removed, Changed"
   - ❌ "Added, Deletion, Modify"

7. **Break up long text**
   - Use bullet points
   - Use short paragraphs
   - Use headings

### DON'T:

1. **Don't use jargon without explanation**
   - ❌ "Specify the FQRN"
   - ✅ "Chart repository URL"

2. **Don't be prescriptive**
   - ❌ "You must review this"
   - ✅ "Consider reviewing"

3. **Don't be alarmist**
   - ❌ "DANGER: CRITICAL ISSUE"
   - ✅ "High risk: Review before deploying"

4. **Don't assume knowledge**
   - ❌ "Configure your kubeconfig"
   - ✅ "Kubernetes configuration file"

5. **Don't use filler words**
   - ❌ "Please note that this will..."
   - ✅ "This will..."

6. **Don't be condescending**
   - ❌ "Obviously, you should..."
   - ✅ "We recommend..."

7. **Don't be vague**
   - ❌ "Some changes were found"
   - ✅ "3 high-risk changes detected"

---

## Localization Notes

**Current status:** English only

**Future considerations:**
- Avoid idioms that don't translate well
- Keep sentences short for easier translation
- Use consistent terminology (critical for translation memory)
- Separate strings from code (i18n ready)

**Examples to avoid:**
- ❌ "Piece of cake" → ✅ "Easy"
- ❌ "Heads up" → ✅ "Note"
- ❌ "Let's dive in" → ✅ "Get started"

---

## Review Checklist

Before approving any user-facing copy, verify:

- [ ] Uses canonical terminology from this document
- [ ] Avoids deprecated terms
- [ ] Maintains consistent voice and tone
- [ ] Explains technical terms in context
- [ ] Provides specific information (not vague)
- [ ] Uses active voice
- [ ] Breaks up long text appropriately
- [ ] Includes examples where helpful
- [ ] Avoids jargon, or explains it
- [ ] Doesn't assume user knowledge
- [ ] Is clear to a non-expert reader
- [ ] Aligns with UX principles (see UX_PRINCIPLES.md)

---

## Maintenance

**Owner:** ChartImpact UX Team  
**Review frequency:** Quarterly, or after major feature releases  
**Change process:** 
1. Propose change in PR
2. Update this document
3. Update UI copy in affected components
4. Update tests if applicable

---

**Last Updated:** December 2025  
**Status:** Draft for Review  
**Related Documents:**
- UX_AUDIT.md
- UX_PRINCIPLES.md
- UX_REDESIGN.md
