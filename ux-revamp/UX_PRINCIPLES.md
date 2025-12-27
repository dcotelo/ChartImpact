# ChartImpact UX Principles

**Mission:** Help teams understand potentially disruptive Helm chart changes before deployment, with a focus on clarity, confidence, and visibility into availability and security risk signals.

These principles guide all UX decisions across the product, ensuring the interface reflects and supports ChartImpact's mission.

---

## Core Principles

### 1. Impact First, Details on Demand

**Principle:** Users should immediately see what matters most—risk signals and potential impact—without needing to search or filter.

**In Practice:**
- Risk signals are surfaced at the top level, not buried in details
- High-risk changes are highlighted by default
- Users can drill down for technical details when needed
- Summary views precede detailed views

**Examples:**
- ✅ Show "3 high-risk changes affecting availability" before showing all 50 changes
- ✅ Default to filtering by importance = high
- ❌ Show all changes equally; make users filter to find important ones
- ❌ Bury risk signals in nested views

**Rationale:** Users primarily want to know "Is this upgrade risky?" not "What exactly changed?" The latter is important for investigation, but secondary to the risk assessment.

---

### 2. Confidence Over Completeness

**Principle:** Give users enough information to make confident decisions, but don't overwhelm them with exhaustive data.

**In Practice:**
- Show 80% signal, hide 20% noise by default
- Explain WHY something is flagged as risky
- Provide clear guidance without being prescriptive
- Progressive disclosure: simple first, comprehensive on demand

**Examples:**
- ✅ "This changes a Deployment's replica count" (clear impact)
- ✅ "Security: RBAC permissions expanded" (contextualized)
- ❌ Show every YAML line changed without explanation
- ❌ "This is dangerous, don't deploy" (too prescriptive)

**Rationale:** Engineers need confidence in their deployment decisions. Confidence comes from understanding impact, not from seeing every technical detail. ChartImpact provides information, not judgments.

---

### 3. Risk Signals Explain Themselves

**Principle:** Never flag something as important without explaining why it matters.

**In Practice:**
- Every risk signal includes context
- Availability and security implications are spelled out
- No unexplained warnings or cryptic indicators
- Links to documentation for deeper understanding

**Examples:**
- ✅ "Availability Risk: StatefulSet update strategy changed from RollingUpdate to OnDelete. This may cause downtime during upgrades."
- ✅ "Security: NetworkPolicy removed. This pod can now communicate with any network endpoint."
- ❌ Red flag with no explanation
- ❌ "Warning: spec.template.spec.containers[0].image changed"

**Rationale:** Red flags without context create anxiety, not clarity. Users should never wonder "Why is this highlighted?" or "Should I be worried?"

---

### 4. No Configuration Required to Get Value

**Principle:** Users should get useful insights on their first visit without setup, configuration, or learning curve.

**In Practice:**
- Pre-loaded examples that demonstrate value immediately
- Smart defaults for all inputs
- Minimal required fields to start
- One-click workflows when possible

**Examples:**
- ✅ Land on page → see example comparison with risk signals → understand value
- ✅ Two inputs to compare: repo + version (auto-detect everything else)
- ❌ Must configure risk thresholds before using
- ❌ Must learn filter syntax to find important changes

**Rationale:** Time-to-value must be measured in seconds, not minutes. If users don't see value immediately, they'll leave. Configuration can come later for power users.

---

### 5. Progressive Disclosure Everywhere

**Principle:** Start simple, reveal complexity only when the user needs it.

**In Practice:**
- Show summary before details
- Collapse advanced options by default
- Reveal technical fields only when relevant
- Use "Show more" patterns liberally

**Examples:**
- ✅ Form shows only required fields; "Advanced options" expands to reveal values file inputs
- ✅ Resource list shows names and risk levels; click to see full YAML diff
- ❌ Show all form fields at once, including rarely-used options
- ❌ Display full YAML diff inline for every resource

**Rationale:** Cognitive load is the enemy of understanding. Most users need basic information most of the time. Advanced users can dig deeper when needed.

---

### 6. Clarity Over Cleverness

**Principle:** Use plain language; avoid jargon unless necessary for precision.

**In Practice:**
- Write for humans, not machines
- Explain technical terms in context
- Choose familiar words over technical terms when meaning is the same
- Provide examples liberally

**Examples:**
- ✅ "Chart repository" with example: github.com/user/repo.git
- ✅ "Version" instead of "Git ref" (in most contexts)
- ❌ "Specify the Helm chart's FQRN"
- ❌ Use "diff" when "change" would work

**Rationale:** Not all users are Helm experts. ChartImpact should be accessible to platform engineers, application developers, and DevOps practitioners at all experience levels.

---

### 7. Calm and Confidence-Building

**Principle:** The UI should feel professional, trustworthy, and calm—not flashy, anxious, or overwhelming.

**In Practice:**
- Use color purposefully (risk levels, not decoration)
- Avoid alarmist language ("DANGER" → "High risk")
- Provide context and explanations liberally
- Whitespace and hierarchy reduce anxiety
- Smooth, predictable interactions

**Examples:**
- ✅ Risk levels: High (red), Medium (yellow), Low (gray/green)
- ✅ "This change affects availability" (factual)
- ❌ Flashing red alerts for every change
- ❌ "WARNING: CRITICAL SECURITY VULNERABILITY" (unless true and actionable)

**Rationale:** Deployment decisions are stressful. ChartImpact should reduce stress by providing clarity, not add to it with alarmist design or overwhelming information.

---

### 8. Built for Sharing and Collaboration

**Principle:** Comparisons should be easy to share with teammates so decisions can be made collaboratively.

**In Practice:**
- Every comparison has a shareable URL
- URLs are human-readable and stable
- Shared links work without authentication
- Context is preserved in shared views

**Examples:**
- ✅ `/compare?repo=...&v1=...&v2=...` → shareable, bookmarkable
- ✅ "Copy link" button generates shareable URL
- ❌ Results can only be viewed in active session
- ❌ URLs like `/results/8f7a9b2c` with no context

**Rationale:** Deployment decisions are rarely made alone. "Hey, check out this upgrade—what do you think?" should be a one-click share, not a verbal explanation.

---

### 9. Respect User Time

**Principle:** Every second of waiting should feel justified; every interaction should feel instant.

**In Practice:**
- Fast initial load (<2s)
- Instant UI feedback to all interactions
- Realistic progress indicators (no fake progress)
- Background operations don't block the UI
- Cache results when appropriate

**Examples:**
- ✅ Click example → form populates instantly
- ✅ Show skeleton UI while loading results
- ❌ Fake progress bar that doesn't reflect actual progress
- ❌ Block entire UI while fetching versions

**Rationale:** Engineers' time is valuable. ChartImpact should feel fast, responsive, and respectful of that time. Perceived performance = actual performance + clear feedback.

---

### 10. Consistency Builds Trust

**Principle:** Patterns, terminology, and visual design should be consistent throughout the product.

**In Practice:**
- Use the same terms for the same concepts everywhere
- Apply spacing and typography scales consistently
- Repeat interaction patterns (e.g., click to expand, filter behavior)
- Maintain visual hierarchy across views

**Examples:**
- ✅ "Impact" used everywhere (not "impact" sometimes, "difference" others)
- ✅ 8px spacing scale applied to all components
- ❌ "Diff Explorer" on one page, "Change Viewer" on another
- ❌ Buttons styled differently in form vs. results

**Rationale:** Inconsistency creates cognitive load and erodes trust. "Why is this different?" should never be a question. Consistency signals professionalism and thoughtfulness.

---

## Application Guidelines

### When Making UX Decisions

Ask these questions:

1. **Does this help users understand risk quickly?** (Impact First)
2. **Does this give users confidence without overwhelming them?** (Confidence Over Completeness)
3. **Is it clear why this matters?** (Risk Signals Explain Themselves)
4. **Can a first-time user use this without instructions?** (No Configuration Required)
5. **Is complexity hidden until needed?** (Progressive Disclosure)
6. **Is the language clear and jargon-free?** (Clarity Over Cleverness)
7. **Does this feel calm and trustworthy?** (Calm and Confidence-Building)
8. **Can users share this with their team?** (Built for Sharing)
9. **Does this respect user time?** (Respect User Time)
10. **Is this consistent with the rest of the product?** (Consistency Builds Trust)

If the answer to any question is "no" or "unclear," revisit the design.

---

## Principle Trade-offs

Sometimes principles conflict. Here's how to prioritize:

### Impact First vs. Completeness
- **Winner:** Impact First
- **Rationale:** Users can always drill down; they can't easily extract signal from noise

### Clarity vs. Precision
- **Winner:** Clarity
- **Exception:** Technical details can be precise (in expanded views)
- **Rationale:** Accessibility matters more than showing off technical knowledge

### Speed vs. Accuracy
- **Winner:** Accuracy
- **But:** Use optimistic UI to maintain perceived speed
- **Rationale:** Incorrect results destroy trust; slow results are merely inconvenient

### Consistency vs. Optimization
- **Winner:** Consistency
- **Exception:** Mobile may require different patterns
- **Rationale:** Predictability beats marginal optimization

### Simplicity vs. Power
- **Winner:** Simplicity (with progressive disclosure for power)
- **Rationale:** 80% of users need 20% of features; serve the majority, don't hide power

---

## Anti-Patterns to Avoid

These violate our principles:

1. **"Diff first" thinking**: Showing technical diffs before explaining impact
2. **Configuration burden**: Requiring setup before providing value
3. **Unexplained warnings**: Red flags without context
4. **Jargon walls**: Technical language without explanations
5. **Kitchen sink UI**: Showing all features and options at once
6. **Fake progress**: Simulating progress that doesn't reflect reality
7. **Inconsistent terminology**: Using different words for same concept
8. **Non-shareable state**: Results that can't be bookmarked or shared
9. **Alarmist tone**: Creating anxiety instead of providing clarity
10. **Desktop-only thinking**: Designing only for large screens

---

## Success Metrics Aligned with Principles

How we measure adherence to principles:

| Principle | Metric | Target |
|-----------|--------|--------|
| Impact First | Time to identify highest-risk change | <30 seconds |
| Confidence Over Completeness | User confidence rating (1-5) | ≥4.0 |
| Risk Signals Explain Themselves | % users who understand why something is flagged | ≥90% |
| No Configuration Required | % users who see value on first visit | ≥80% |
| Progressive Disclosure | % users who use advanced features | 10-20% |
| Clarity Over Cleverness | Comprehension score (task success) | ≥85% |
| Calm and Confidence-Building | "Anxiety level" rating (1-5) | ≤2.0 |
| Built for Sharing | % comparisons shared | ≥30% |
| Respect User Time | Time to first meaningful result | <60 seconds |
| Consistency Builds Trust | Consistency audit score | ≥4.5/5 |

---

## Validation Checklist

Before shipping any UX change, confirm:

- [ ] Supports at least one core principle explicitly
- [ ] Doesn't violate any principles
- [ ] Uses canonical terminology (see UX_AUDIT.md)
- [ ] Follows visual design system (see UX_REDESIGN.md)
- [ ] Includes clear language (no unexplained jargon)
- [ ] Works on mobile (or intentionally desktop-only)
- [ ] Is keyboard accessible
- [ ] Provides visual feedback to user actions
- [ ] Can be shared (if results/state)
- [ ] Has been tested with real users (if significant)

---

## Evolution of Principles

These principles are living guidelines. As ChartImpact grows, they may evolve:

**Stable (unlikely to change):**
- Impact First
- Confidence Over Completeness
- Risk Signals Explain Themselves
- No Configuration Required

**May evolve:**
- Built for Sharing (may add authentication/privacy)
- Progressive Disclosure (may adjust defaults based on user feedback)

**To be added:**
- Principles for CI/CD integration (when that feature launches)
- Principles for team/organizational features (if added)

---

## Examples in Practice

### Example 1: Designing the Impact Summary

**Question:** Should the Impact Summary show all changes or only important ones?

**Principle applied:** Impact First, Confidence Over Completeness

**Decision:**
- Show high and medium risk changes by default
- Show total count: "15 changes (3 high risk, 7 medium risk, 5 low risk)"
- Provide "Show all changes" option for completeness
- Explain each risk signal inline

**Result:** Users see what matters immediately, can drill down if needed

---

### Example 2: Redesigning the Comparison Form

**Question:** Should we show all form fields up front or hide some?

**Principle applied:** No Configuration Required, Progressive Disclosure

**Decision:**
- Show only required fields: Repository, Version 1, Version 2
- Auto-detect chart path when possible
- Hide values file inputs behind "Advanced options"
- Provide "Quick Start" examples as primary path

**Result:** Reduced friction; faster time-to-value

---

### Example 3: Error Message for Invalid Repository

**Current:** "Error: Failed to clone repository"

**Question:** Does this follow principles?

**Analysis:**
- ❌ Not confidence-building (feels like a failure)
- ❌ Doesn't explain why or how to fix
- ❌ Not calm (word "Error" is harsh)

**Principle applied:** Calm and Confidence-Building, Clarity Over Cleverness

**Improved:**
"We couldn't access this repository. Please check:
- The URL is correct and publicly accessible
- The repository exists
- Your network connection is working

Need help? [See examples] or [Contact support]"

**Result:** More helpful, less anxious, provides path forward

---

## References

- UX_AUDIT.md - Detailed analysis of current UI
- UX_REDESIGN.md - Redesign proposals applying these principles
- TERMINOLOGY.md - Canonical terms aligned with principles
- IMPLEMENTATION_ROADMAP.md - How to implement principles incrementally

---

**Last Updated:** December 2025  
**Owner:** ChartImpact UX Team  
**Status:** Draft for Review
