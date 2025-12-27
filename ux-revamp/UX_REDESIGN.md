# ChartImpact UX Redesign Proposal

**Purpose:** End-to-end redesign of ChartImpact's user interface, aligned with mission and UX principles

**References:**
- UX_AUDIT.md - Issues identified in current UI
- UX_PRINCIPLES.md - Guidelines for all design decisions
- TERMINOLOGY.md - Canonical language and terms

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Redesigned User Flows](#redesigned-user-flows)
3. [Screen-by-Screen Redesign](#screen-by-screen-redesign)
4. [Visual Design System](#visual-design-system)
5. [Component Specifications](#component-specifications)
6. [Interaction Patterns](#interaction-patterns)
7. [Responsive Design](#responsive-design)
8. [Accessibility](#accessibility)

---

## Design Philosophy

### From: Technical Diff Tool
### To: Risk Assessment Platform

**Current positioning:** Compare differences between Helm chart versions  
**New positioning:** Understand deployment risk before upgrading Helm charts

**Current user journey:** Input → Compare → View diff → Find important changes  
**New user journey:** See value → Understand risk → Drill down if needed

**Current hierarchy:** Form → Results (equal weight)  
**New hierarchy:** Mission → Quick start → Risk signals → Technical details

---

## Redesigned User Flows

### Flow 1: First-Time User (Golden Path)

**Goal:** Understand ChartImpact's value in <30 seconds

```
1. Land on homepage
   ↓ (5 seconds)
   - See mission: "Understand deployment risk before upgrading Helm charts"
   - See pre-loaded example showing risk signals
   - Understand: This tool surfaces availability and security risks
   
2. Explore pre-loaded example
   ↓ (20 seconds)
   - See Impact Summary: "3 high-risk changes, 7 medium-risk"
   - See specific risks: "Deployment replica count changed"
   - Understand: Risk signals are automatically surfaced
   
3. Click "Analyze Your Charts"
   ↓ (User decides to try with their charts)
   - Form reveals with minimal fields
   - Smart defaults and examples provided
   - Version dropdowns auto-populate
   
4. Submit comparison
   ↓ (30-60 seconds)
   - Clear progress indicator
   - Navigate to Impact Summary
   
5. Review Impact Summary
   ↓ (30 seconds)
   - High-risk changes highlighted
   - Availability and security sections
   - Clear verdict: "Review before deploying" or "Low risk"
   
6. Explore details (optional)
   ↓ (variable)
   - Click to expand specific changes
   - View YAML diffs
   - Filter and search
```

**Time to value:** 5 seconds (see pre-loaded example)  
**Time to understanding:** 30 seconds  
**Time to first custom comparison:** 2-3 minutes

---

### Flow 2: Return User (Quick Analysis)

**Goal:** Analyze specific upgrade in <1 minute

```
1. Land on homepage or use bookmarked URL
   ↓
   
2. Click "Analyze Your Charts" (skip example)
   ↓ (10 seconds)
   - Form remembers last repository (localStorage)
   - Select two versions from dropdown
   - Click "Analyze Impact"
   
3. Review Impact Summary
   ↓ (20 seconds)
   - Scan risk highlights
   - Make decision
   
4. Share with team (if needed)
   ↓ (5 seconds)
   - Click "Copy Link"
   - Paste in Slack/email
```

**Time to decision:** <60 seconds

---

### Flow 3: Deep Investigation

**Goal:** Understand specific change in detail

```
1. Start with Impact Summary
   ↓
   
2. Identify change of interest
   ↓
   - "Deployment/my-app: Replica count changed 2→3"
   
3. Click to expand
   ↓
   - See full context
   - See availability risk explanation
   - See YAML diff
   
4. Click "View in Explorer"
   ↓
   - Full resource details
   - All changes for this resource
   - Related resources
   
5. Filter and search (if needed)
   ↓
   - Find related changes
   - Understand cascading effects
```

---

## Screen-by-Screen Redesign

### Screen 1: Landing / Homepage (NEW)

**Purpose:** Immediately communicate value; provide instant "try it" experience

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ [ChartImpact Logo]                    [GitHub] [Doc]│
├─────────────────────────────────────────────────────┤
│                                                      │
│     Understand deployment risk before                │
│     upgrading Helm charts                           │
│                                                      │
│     ChartImpact surfaces availability and security   │
│     risks in Helm chart upgrades, helping teams     │
│     make confident deployment decisions.            │
│                                                      │
│     [Try Example]  [Analyze Your Charts]            │
│                                                      │
├─────────────────────────────────────────────────────┤
│  Pre-loaded Example: ArgoCD 9.1.5 → 9.1.6          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │ Impact Summary                              │    │
│  ├────────────────────────────────────────────┤    │
│  │                                             │    │
│  │ 🔴 High Risk (2)                           │    │
│  │ • Deployment/argocd-server: Replica count  │    │
│  │   changed 2→3 (availability impact)        │    │
│  │ • NetworkPolicy/egress: Rule removed        │    │
│  │   (security impact)                         │    │
│  │                                             │    │
│  │ 🟡 Medium Risk (5)                         │    │
│  │ • ConfigMap/settings: 3 values changed      │    │
│  │ • Service/api: Port changed 8080→8443      │    │
│  │ • ...                                       │    │
│  │                                             │    │
│  │ [Explore All Changes]                       │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Key Elements:**

1. **Header**: Simple, clean, with logo and utility links
2. **Hero**: Mission statement (1-2 sentences)
3. **CTAs**: Two clear options: "Try Example" (instant) or "Analyze Your Charts" (form)
4. **Pre-loaded Example**: Immediately visible, showing actual risk signals
5. **Visual language**: Red/yellow/green risk indicators

**Interactions:**

- **"Try Example" button**: Scrolls down to show example (already loaded)
- **"Analyze Your Charts" button**: Expands form inline OR navigates to `/compare`
- **Example is interactive**: Click to expand changes, explore details

**Changes from Current:**
- ❌ Remove: Purple gradient background (move to branding only)
- ❌ Remove: Emoji in title
- ❌ Remove: "Compare differences" subheading
- ✅ Add: Clear mission statement
- ✅ Add: Pre-loaded example showing value
- ✅ Add: Risk-first presentation

---

### Screen 2: Comparison Setup (REVISED)

**Purpose:** Minimal friction to start analysis

**Trigger:** User clicks "Analyze Your Charts" OR navigates to `/compare`

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ ← Back to Home                                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│     Analyze Helm Chart Upgrade                      │
│                                                      │
│     Enter your chart repository and select two      │
│     versions to compare.                            │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Chart Repository *                                  │
│  ┌───────────────────────────────────────────────┐  │
│  │ https://github.com/myorg/charts.git          │  │
│  └───────────────────────────────────────────────┘  │
│  Example: https://github.com/argoproj/argo-helm.git │
│                                                      │
│  Chart Path                                          │
│  ┌───────────────────────────────────────────────┐  │
│  │ charts/myapp                                  │  │
│  └───────────────────────────────────────────────┘  │
│  Path to chart within repository                     │
│                                                      │
│  ┌──────────────────────┐  ┌───────────────────┐   │
│  │ Version 1 (from) *   │  │ Version 2 (to) *  │   │
│  │ ┌──────────────────┐ │  │ ┌───────────────┐ │   │
│  │ │ v1.0.0         ▼ │ │  │ │ v1.1.0      ▼ │ │   │
│  │ └──────────────────┘ │  │ └───────────────┘ │   │
│  │ 47 versions available│  │ 47 versions avail.│   │
│  └──────────────────────┘  └───────────────────┘   │
│                                                      │
│  ⚙ Advanced Options (collapsed)                     │
│                                                      │
│  [Cancel]              [Analyze Impact] ───────→    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Key Changes:**

1. **Minimal fields**: Only 3 required (repo, v1, v2)
2. **Smart defaults**: Chart path auto-filled if detected
3. **Version dropdowns**: Always dropdown (better UX), auto-load on repo entry
4. **Advanced options collapsed**: Values file, values content hidden by default
5. **Clear CTA**: "Analyze Impact" (not "Compare Versions")
6. **Contextual help**: Examples and descriptions inline

**Advanced Options (expanded):**

```
│  ⚙ Advanced Options (expanded)                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Values File Path (optional)                    │ │
│  │ ┌─────────────────────────────────────────────┐│ │
│  │ │ values/prod.yaml                            ││ │
│  │ └─────────────────────────────────────────────┘│ │
│  │                                                 │ │
│  │ Or paste values content:                       │ │
│  │ ┌─────────────────────────────────────────────┐│ │
│  │ │ replicaCount: 3                             ││ │
│  │ │ image:                                       ││ │
│  │ │   tag: v2.0.0                               ││ │
│  │ └─────────────────────────────────────────────┘│ │
│  └────────────────────────────────────────────────┘ │
```

---

### Screen 3: Impact Summary (NEW - MOST IMPORTANT)

**Purpose:** Risk-first presentation of comparison results

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ ChartImpact                            [Copy Link]  │
├─────────────────────────────────────────────────────┤
│ myorg/charts: charts/myapp                          │
│ v1.0.0 → v1.1.0                                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│ ┌─────────────────────────────────────────────────┐│
│ │ 🔴 Review Before Deploying                      ││
│ │                                                  ││
│ │ This upgrade contains 3 high-risk changes       ││
│ │ affecting availability and security.            ││
│ └─────────────────────────────────────────────────┘│
│                                                      │
│ ┌─────────────────────────────────────────────────┐│
│ │ Availability Impact (2 changes)          [View] ││
│ ├─────────────────────────────────────────────────┤│
│ │                                                  ││
│ │ 🔴 Deployment/frontend                          ││
│ │    Replica count: 2 → 1                         ││
│ │    ⚠ Reduced redundancy may impact availability ││
│ │    [View Details]                                ││
│ │                                                  ││
│ │ 🟡 StatefulSet/database                         ││
│ │    Update strategy changed: RollingUpdate →     ││
│ │    OnDelete                                      ││
│ │    ℹ Manual pod deletion required for updates   ││
│ │    [View Details]                                ││
│ │                                                  ││
│ └─────────────────────────────────────────────────┘│
│                                                      │
│ ┌─────────────────────────────────────────────────┐│
│ │ Security Impact (1 change)               [View] ││
│ ├─────────────────────────────────────────────────┤│
│ │                                                  ││
│ │ 🔴 NetworkPolicy/egress-rules                   ││
│ │    Rule removed: deny-external-traffic          ││
│ │    ⚠ Pods can now communicate with external     ││
│ │      endpoints                                   ││
│ │    [View Details]                                ││
│ │                                                  ││
│ └─────────────────────────────────────────────────┘│
│                                                      │
│ ┌─────────────────────────────────────────────────┐│
│ │ Other Changes (12)                       [View] ││
│ ├─────────────────────────────────────────────────┤│
│ │                                                  ││
│ │ 🟡 ConfigMap/app-config: 3 values changed       ││
│ │ ⚪ ConfigMap/feature-flags: 1 value changed     ││
│ │ ⚪ Service/api: Label updated                    ││
│ │ ... and 9 more                                   ││
│ │                                                  ││
│ │ [View All Changes in Explorer]                   ││
│ │                                                  ││
│ └─────────────────────────────────────────────────┘│
│                                                      │
│ [New Analysis]                                       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Key Features:**

1. **Overall verdict**: Clear assessment at the top
2. **Risk-based sections**: Availability, Security, Other
3. **Risk indicators**: 🔴 High, 🟡 Medium, ⚪ Low
4. **Contextual explanations**: Why each change matters
5. **Progressive disclosure**: "View Details" to expand
6. **Actions**: Copy link (sharing), New Analysis (start over), View in Explorer (drill down)

**Risk Level Logic:**

- **🔴 High Risk:**
  - Deployments/StatefulSets: Replica count decreased
  - Security: RBAC permissions expanded, NetworkPolicy removed
  - Availability: Update strategy changed to OnDelete
  
- **🟡 Medium Risk:**
  - Deployments/StatefulSets: Replica count increased
  - Services: Port or type changed
  - ConfigMaps/Secrets: Referenced by critical resources
  
- **⚪ Low Risk:**
  - Metadata-only changes (labels, annotations)
  - ConfigMaps/Secrets: Not referenced
  - Non-critical resource changes

**Interactions:**

- **[View Details]**: Expands inline to show YAML diff
- **[View]** (section header): Jumps to Explorer filtered by that category
- **[View All Changes in Explorer]**: Opens full Explorer
- **[Copy Link]**: Copies shareable URL to clipboard
- **[New Analysis]**: Returns to form with option to edit comparison

---

### Screen 4: Explorer (REVISED)

**Purpose:** Detailed inspection for users who need to drill down

**Trigger:** User clicks "View in Explorer" from Impact Summary, or wants full details

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ ChartImpact > Impact Explorer                        │
│ myorg/charts: charts/myapp (v1.0.0 → v1.1.0)        │
├─────────────────────────────────────────────────────┤
│                                                      │
│ ← Back to Summary                                    │
│                                                      │
│ ┌────────────────────────┐  [🔍 Search resources]   │
│ │ Filters                │   [⚙ View: Tree ▼]       │
│ │                        │                           │
│ │ Risk Level             │                           │
│ │ ☑ High (3)            │                           │
│ │ ☑ Medium (7)          │                           │
│ │ ☐ Low (12)            │  (low unchecked by default)
│ │                        │                           │
│ │ Change Type            │                           │
│ │ ☑ Added (2)           │                           │
│ │ ☑ Removed (1)         │                           │
│ │ ☑ Changed (19)        │                           │
│ │                        │                           │
│ │ Resource Kind          │                           │
│ │ ☑ Deployment (3)      │                           │
│ │ ☑ Service (2)         │                           │
│ │ ☑ ConfigMap (8)       │                           │
│ │ ☑ StatefulSet (1)     │                           │
│ │ ... [Show all]         │                           │
│ │                        │                           │
│ │ [Reset Filters]        │                           │
│ └────────────────────────┘                           │
│                                                      │
├──────────────────────────┬──────────────────────────┤
│ Resource List (10)       │ Details Panel            │
│                          │                          │
│ 🔴 Deployment/frontend   │ Deployment/frontend      │
│    Changed • 2 changes   │                          │
│                          │ Risk: High               │
│ 🔴 NetworkPolicy/egress  │ Change: spec.replicas    │
│    Removed • Security    │ From: 2                  │
│                          │ To: 1                    │
│ 🟡 StatefulSet/database  │                          │
│    Changed • 1 change    │ Why this matters:        │
│                          │ Reducing replicas from 2 │
│ 🟡 ConfigMap/app-config  │ to 1 removes redundancy  │
│    Changed • 3 changes   │ and may impact           │
│                          │ availability during pod  │
│ 🟡 Service/api           │ restarts or failures.    │
│    Changed • 1 change    │                          │
│                          │ [View YAML Diff]         │
│ ...                      │                          │
│                          │                          │
└──────────────────────────┴──────────────────────────┘
```

**Key Changes:**

1. **Breadcrumb**: Shows context, easy to go back to summary
2. **Default filter**: High and medium risk (low risk hidden by default)
3. **Collapsible filters**: Can hide filter panel for more space
4. **Risk indicators**: Visual icons (🔴🟡⚪) make scanning easy
5. **Details panel**: Shows selected resource with explanation
6. **Progressive disclosure**: "View YAML Diff" expands full diff

**View Modes:**

- **Tree** (default): Hierarchical view by namespace or kind
- **Table**: Sortable table with columns (name, kind, risk, change type)
- **Side-by-Side**: Split view showing before/after YAML

---

### Screen 5: Empty States & Errors (NEW)

#### Empty State: No Changes Detected

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│               ✓ No Changes Detected                 │
│                                                      │
│     The two versions are identical. No differences  │
│     were found in the rendered Helm templates.      │
│                                                      │
│     Repository: myorg/charts                         │
│     Chart: charts/myapp                              │
│     Versions: v1.0.0 and v1.0.0                     │
│                                                      │
│     [Analyze Different Versions]                     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### Error State: Repository Not Found

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│          ⚠ Unable to Access Repository              │
│                                                      │
│     We couldn't clone the repository:               │
│     https://github.com/myorg/charts.git             │
│                                                      │
│     Please check:                                    │
│     • The URL is correct                            │
│     • The repository is publicly accessible         │
│     • Your network connection is working            │
│                                                      │
│     [Try Again]  [Use Example]  [Get Help]          │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### Loading State

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│            Analyzing Chart Upgrade...               │
│                                                      │
│     [=========>              ] 60%                  │
│                                                      │
│     Current step: Rendering Helm templates          │
│                                                      │
│     This usually takes 30-60 seconds.               │
│                                                      │
│     [Cancel]                                         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Note:** Use real progress if backend supports it; otherwise indeterminate spinner

---

## Visual Design System

### Color Palette

#### Brand Colors
```
Primary:     #6366F1 (Indigo)       - Brand, CTAs
Secondary:   #8B5CF6 (Purple)       - Accents, links
```

#### Risk Colors
```
High Risk:   #EF4444 (Red)          - Critical issues
Medium Risk: #F59E0B (Amber)        - Caution
Low Risk:    #6B7280 (Gray)         - Informational
Success:     #10B981 (Green)        - Positive outcomes
```

#### Neutral Colors
```
Gray-50:     #F9FAFB                - Backgrounds
Gray-100:    #F3F4F6                - Secondary backgrounds
Gray-200:    #E5E7EB                - Borders
Gray-400:    #9CA3AF                - Disabled text
Gray-600:    #4B5563                - Secondary text
Gray-900:    #111827                - Primary text
```

#### Semantic Colors
```
Info:        #3B82F6 (Blue)         - Informational messages
Warning:     #F59E0B (Amber)        - Warnings
Error:       #EF4444 (Red)          - Errors
Success:     #10B981 (Green)        - Success messages
```

### Typography

#### Font Family
```css
Primary:     Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Monospace:   'JetBrains Mono', 'Fira Code', 'Courier New', monospace
```

#### Type Scale (Mobile-first)
```
Display:     2.5rem / 40px   (48px+ on desktop)     - Page titles
Heading 1:   2rem / 32px     (36px on desktop)      - Section titles
Heading 2:   1.5rem / 24px   (28px on desktop)      - Subsections
Heading 3:   1.25rem / 20px  (24px on desktop)      - Card titles
Body:        1rem / 16px                            - Body text
Small:       0.875rem / 14px                        - Helper text, captions
Tiny:        0.75rem / 12px                         - Labels, metadata
```

#### Font Weights
```
Regular:     400                    - Body text
Medium:      500                    - Emphasized text
Semibold:    600                    - Headings
Bold:        700                    - Important headings
```

### Spacing Scale (8px system)

```
4xs:   2px  / 0.125rem              - Borders
3xs:   4px  / 0.25rem               - Tiny gaps
2xs:   8px  / 0.5rem                - Small gaps
xs:    12px / 0.75rem               - Compact spacing
sm:    16px / 1rem                  - Default spacing
md:    24px / 1.5rem                - Section spacing
lg:    32px / 2rem                  - Large section spacing
xl:    48px / 3rem                  - Page-level spacing
2xl:   64px / 4rem                  - Hero spacing
```

**Application:**
- Between inline elements: 2xs-xs (8-12px)
- Between block elements: sm-md (16-24px)
- Between sections: md-lg (24-32px)
- Page margins: lg-xl (32-48px)

### Border Radius

```
sm:    4px                          - Small elements (badges, tags)
md:    8px                          - Default (cards, buttons)
lg:    12px                         - Large cards
xl:    16px                         - Modal dialogs
full:  9999px                       - Pills, circles
```

### Shadows

```
sm:    0 1px 2px rgba(0,0,0,0.05)              - Subtle elevation
md:    0 4px 6px rgba(0,0,0,0.07)              - Cards
lg:    0 10px 15px rgba(0,0,0,0.1)             - Dropdowns, modals
xl:    0 20px 25px rgba(0,0,0,0.15)            - Popovers
```

### Transitions

```
Fast:      150ms                    - Hover states
Default:   250ms                    - Most interactions
Slow:      350ms                    - Complex animations
```

**Easing:**
- Default: `cubic-bezier(0.4, 0, 0.2, 1)` - Smooth ease-in-out
- Enter: `cubic-bezier(0, 0, 0.2, 1)` - Ease out
- Exit: `cubic-bezier(0.4, 0, 1, 1)` - Ease in

---

## Component Specifications

### Buttons

#### Primary Button (Call-to-Action)
```
Background: Linear gradient (Indigo to Purple)
Text: White, Semibold, 1rem
Padding: 12px 24px (sm), 16px 32px (lg)
Border Radius: 8px
Hover: Slightly darker, scale(1.02)
Active: Scale(0.98)
Disabled: Gray-300 background, Gray-400 text
```

#### Secondary Button
```
Background: Transparent
Text: Indigo-600, Semibold, 1rem
Border: 2px solid Indigo-600
Padding: 10px 22px (account for border)
Border Radius: 8px
Hover: Indigo-50 background
```

#### Tertiary Button (Text only)
```
Background: Transparent
Text: Indigo-600, Medium, 1rem
Padding: 8px 12px
Hover: Indigo-50 background, underline
```

### Form Inputs

#### Text Input
```
Background: White
Border: 1px solid Gray-300
Border Radius: 8px
Padding: 12px 16px
Font: 1rem, Regular
Placeholder: Gray-400

Focus:
  Border: 2px solid Indigo-500 (shift padding to maintain size)
  Outline: 3px solid Indigo-100 (offset -1px)

Error:
  Border: 2px solid Red-500
  Outline: 3px solid Red-100
```

#### Dropdown Select
```
Same as Text Input, plus:
  Icon: Chevron-down (Gray-400) at right
  Padding-right: 40px (space for icon)
  
Options:
  Background: White
  Hover: Indigo-50
  Selected: Indigo-100
```

#### Textarea
```
Same as Text Input, plus:
  Min-height: 120px
  Resize: Vertical only
  Font: Monospace (for values content)
```

### Cards

#### Default Card
```
Background: White
Border: 1px solid Gray-200
Border Radius: 12px
Padding: 24px
Shadow: sm (subtle)

Hover (if clickable):
  Shadow: md
  Border: Indigo-300
  Transform: translateY(-2px)
```

#### Risk Card (Impact Summary)
```
Same as Default Card, plus:
  Border-left: 4px solid (Risk color)
  
High Risk: Red-500
Medium Risk: Amber-500
Low Risk: Gray-300
```

### Badges

#### Risk Badge
```
Display: Inline-flex, align-items center
Padding: 4px 12px
Border Radius: full (pill)
Font: 0.875rem, Medium

High Risk:
  Background: Red-100
  Text: Red-700
  Icon: 🔴 or ⚠

Medium Risk:
  Background: Amber-100
  Text: Amber-700
  Icon: 🟡 or ⚠

Low Risk:
  Background: Gray-100
  Text: Gray-600
  Icon: ⚪ or ℹ
```

### Icons

**Principle:** Use consistent icon set (e.g., Heroicons, Lucide)

**Key Icons:**
- Risk: Alert triangle, shield
- Availability: Server, layers
- Security: Lock, shield-check
- Search: Magnifying glass
- Filter: Funnel
- Expand: Chevron down
- Collapse: Chevron up
- Link: Chain
- Copy: Document duplicate

**Size:** 16px (inline), 20px (default), 24px (emphasis)

### Progress Indicators

#### Progress Bar (if real progress available)
```
Height: 8px
Background: Gray-200
Fill: Indigo-500
Border Radius: full
Animation: Smooth transition
```

#### Spinner (indeterminate)
```
Size: 24px (inline), 40px (full-screen)
Border: 3px solid Gray-200
Border-top: Indigo-500
Animation: Spin 0.8s linear infinite
```

---

## Interaction Patterns

### Pattern 1: Progressive Disclosure

**Use case:** Hide complexity, reveal on demand

**Implementation:**
```
Default: Simple view with "Show more" or "Advanced options"
Expanded: Additional fields/content with "Show less"
Animation: Smooth expand/collapse (350ms ease-in-out)
```

**Examples:**
- Advanced form options
- Risk card details
- Filter panels
- YAML diffs

### Pattern 2: Inline Expansion

**Use case:** Show details without navigation

**Implementation:**
```
Trigger: Click on item
Effect: Item expands to show details below
Animation: Height transition (250ms)
Collapse: Click again or click "Close"
```

**Examples:**
- Risk card → full explanation
- Resource list item → YAML diff
- Error message → troubleshooting steps

### Pattern 3: Contextual Actions

**Use case:** Show actions relevant to current context

**Implementation:**
```
Trigger: Hover or focus on item
Effect: Action buttons appear (fade in, 150ms)
Position: Aligned to item (top-right corner)
```

**Examples:**
- Card hover → "Copy", "Share", "View"
- Resource list item → "Expand", "Copy YAML"

### Pattern 4: Skeleton Loading

**Use case:** Show expected layout while data loads

**Implementation:**
```
Replace actual content with gray rectangles
Animate: Subtle shimmer effect
Maintain layout: Same height/width as real content
```

**Examples:**
- Version dropdowns while fetching
- Explorer while comparison runs
- Impact Summary while backend processes

### Pattern 5: Toast Notifications

**Use case:** Provide feedback without blocking UI

**Implementation:**
```
Position: Top-right corner
Animation: Slide in from right (250ms)
Duration: 4s (auto-dismiss) or manual close
Types: Success (green), Error (red), Info (blue), Warning (amber)
```

**Examples:**
- "Link copied to clipboard"
- "Comparison started"
- "Error: Repository not found"

---

## Responsive Design

### Breakpoints

```
Mobile:       320px - 639px
Tablet:       640px - 1023px
Desktop:      1024px - 1279px
Large:        1280px+
```

### Mobile Adaptations (320-639px)

1. **Navigation**: Hamburger menu if multiple pages
2. **Forms**: Stack all fields vertically
3. **Buttons**: Full width on mobile
4. **Cards**: Remove side padding, increase vertical
5. **Explorer**: 
   - Hide filters by default (reveal via button)
   - Stack resource list and details vertically
   - Details panel becomes modal
6. **Typography**: Reduce scale by 10-20%
7. **Spacing**: Reduce by 25-50%

### Tablet Adaptations (640-1023px)

1. **Forms**: Keep two-column layout for version fields
2. **Impact Summary**: Cards remain full-width
3. **Explorer**: 
   - Filters in sidebar (collapsible)
   - Resource list + details in main area
4. **Typography**: Same as desktop
5. **Spacing**: Slightly reduced (10-20%)

### Desktop (1024px+)

Full experience as designed above.

---

## Accessibility

### Keyboard Navigation

**Tab order:**
1. Skip to main content
2. Logo / Home link
3. Primary navigation
4. Form fields (in logical order)
5. Primary actions (buttons)
6. Secondary actions
7. Footer links

**Shortcuts:**
- `/`: Focus search
- `Esc`: Close modal/panel
- `↑↓`: Navigate lists
- `Enter`: Select/expand item
- `Space`: Toggle checkbox

### Screen Reader Support

**ARIA labels:**
- All icons: `aria-label` explaining purpose
- Risk indicators: `aria-label="High risk"` not just color
- Progress: `aria-live="polite"` announcements
- Form errors: `aria-invalid` and `aria-describedby`

**Landmarks:**
- `<header role="banner">`
- `<nav role="navigation">`
- `<main role="main">`
- `<aside role="complementary">` (filters)
- `<footer role="contentinfo">`

### Color Contrast

**Minimum ratios (WCAG AA):**
- Normal text: 4.5:1
- Large text (18px+): 3:1
- UI elements: 3:1

**Ensure:**
- All text on white meets 4.5:1
- Risk colors (red, amber) tested against backgrounds
- Links distinguishable without color alone

### Focus Indicators

```css
:focus-visible {
  outline: 3px solid Indigo-500;
  outline-offset: 2px;
  border-radius: 4px;
}
```

**Ensure:**
- Visible on all interactive elements
- High contrast (at least 3:1)
- Never removed (use `:focus-visible` to avoid mouse focus)

---

## Implementation Notes

### CSS Strategy

**Approach:** CSS-in-JS (existing) with design tokens

**Design Tokens File:** `tokens.ts`
```typescript
export const tokens = {
  colors: {
    brand: { primary: '#6366F1', secondary: '#8B5CF6' },
    risk: { high: '#EF4444', medium: '#F59E0B', low: '#6B7280' },
    // ...
  },
  spacing: {
    '2xs': '0.5rem',
    'xs': '0.75rem',
    'sm': '1rem',
    // ...
  },
  // ...
};
```

**Usage:**
```typescript
import { tokens } from '@/lib/tokens';

<div style={{ padding: tokens.spacing.md, color: tokens.colors.risk.high }}>
```

### Component Library

**Approach:** Build minimal component library for consistency

**Core Components:**
- `Button` (primary, secondary, tertiary)
- `Input` (text, select, textarea)
- `Card` (default, risk)
- `Badge` (risk, status)
- `Icon` (wrapper for icon library)
- `Spinner`, `ProgressBar`
- `Toast`

**Location:** `/frontend/components/ui/`

### State Management

**URL State:**
- Comparison parameters (repo, versions) in URL
- Filters and search in URL
- Selected resource in URL

**Local State:**
- Form inputs (before submission)
- UI state (modals, expanded sections)

**Cache:**
- Comparison results (localStorage, 1 hour TTL)
- Version lists per repository (5 minutes TTL)

---

## Migration Strategy

**Phase 1: Foundation (Week 1)**
- Create design tokens
- Build component library
- Update global styles

**Phase 2: Landing & Setup (Week 2)**
- Redesign homepage with pre-loaded example
- Simplify comparison form
- Add URL state management

**Phase 3: Impact Summary (Week 3)**
- Create Impact Summary view
- Implement risk categorization logic
- Add explanatory copy

**Phase 4: Explorer Updates (Week 4)**
- Update Explorer with new design
- Improve filters and search
- Add keyboard shortcuts

**Phase 5: Polish (Week 5)**
- Empty and error states
- Mobile optimization
- Accessibility improvements

---

**End of UX Redesign Proposal**

**Next Steps:**
1. Review and validate with stakeholders
2. Create visual mockups (Figma or similar)
3. Prioritize implementation phases
4. Begin incremental implementation
