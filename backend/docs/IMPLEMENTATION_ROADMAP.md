# Backend Capability Implementation Roadmap

## Overview

This document provides an incremental implementation roadmap for evolving ChartImpact's backend from its current state into a fully webhook-enabled, mission-aligned impact analysis system.

## Current State (Phase 0) ✅

**Status**: Complete

### What Exists
- ✅ Stateless, deterministic diff engine
- ✅ Semantic change classification
- ✅ HTTP API for manual comparisons
- ✅ Structured diff output (v1 spec)
- ✅ Comprehensive test coverage
- ✅ **Signal detection framework** (NEW)
- ✅ **Mission-aligned signal taxonomy** (NEW)
- ✅ **Backend architecture documentation** (NEW)
- ✅ **Webhook readiness assessment** (NEW)

### Capabilities
- Compare two chart versions on demand
- Generate structured field-level diffs
- Classify changes semantically
- Detect availability and security signals
- API responses include signals

### Limitations
- Manual invocation only (no events)
- No GitHub integration
- No result persistence
- No PR automation

---

## Phase 1: Signal Enhancement (Weeks 1-2)

**Goal**: Enrich signal detection with real-world patterns

### Tasks

1. **Add Advanced Availability Signals** (3 days)
   - [ ] Detect image tag patterns (latest, specific versions)
   - [ ] Identify rollback scenarios (version downgrades)
   - [ ] Detect resource quota changes
   - [ ] Add init container signal detection

2. **Add Advanced Security Signals** (3 days)
   - [ ] Detect ImagePullPolicy changes
   - [ ] Identify allowPrivilegeEscalation changes
   - [ ] Detect AppArmor and Seccomp profile changes
   - [ ] Add Pod Security Standard violations

3. **Cross-Resource Pattern Detection** (4 days)
   - [ ] Detect "all workloads losing probes" pattern
   - [ ] Identify "multiple services exposed" pattern
   - [ ] Detect coordinated RBAC changes
   - [ ] Aggregate impact summaries

4. **Signal Deduplication** (2 days)
   - [ ] Merge related signals (e.g., multiple probe changes in same pod)
   - [ ] Prioritize higher-importance signals
   - [ ] Ensure signal uniqueness

### Deliverables
- Enhanced signal detection with 25+ signal types
- Cross-resource pattern detection
- Improved signal summaries for automation
- Updated documentation
- Comprehensive test coverage

### Success Criteria
- All existing tests pass
- New signal types have golden test cases
- Deterministic output verified
- No performance regression

---

## Phase 2: GitHub Webhook Foundation (Weeks 3-4)

**Goal**: Accept and process GitHub webhook events

### Tasks

1. **Webhook Endpoint** (3 days)
   - [ ] Create `POST /api/webhooks/github` endpoint
   - [ ] Implement HMAC-SHA256 signature verification
   - [ ] Parse GitHub event payloads (PR, push, release)
   - [ ] Add webhook-specific logging

   ```go
   type WebhookHandler struct {
       secret string
       processor EventProcessor
   }
   
   func (h *WebhookHandler) HandleGitHub(w http.ResponseWriter, r *http.Request) {
       // Verify signature
       // Parse payload
       // Enqueue for processing
       // Return 202 Accepted
   }
   ```

2. **Event Payload Parser** (2 days)
   - [ ] Parse PullRequestEvent
   - [ ] Parse PushEvent
   - [ ] Parse ReleaseEvent
   - [ ] Extract relevant metadata (repo, versions, PR number)

3. **Event-to-Comparison Mapper** (2 days)
   - [ ] Map PR events to comparison requests
   - [ ] Detect chart paths automatically (search for Chart.yaml)
   - [ ] Handle multiple charts per repository
   - [ ] Extract base and head SHAs

4. **Event Deduplication** (1 day)
   - [ ] In-memory cache with TTL (24h)
   - [ ] Event ID-based deduplication
   - [ ] Metrics on duplicate events

5. **Configuration** (1 day)
   - [ ] Environment variable: `GITHUB_WEBHOOK_SECRET`
   - [ ] Environment variable: `WEBHOOK_ENABLED` (feature flag)
   - [ ] Documentation on webhook setup

### Deliverables
- Functional webhook endpoint
- Event parsing and validation
- Event-to-comparison mapping
- Configuration guide
- Integration tests

### Success Criteria
- Webhook signature verification works
- Events correctly parsed
- Comparison requests generated
- No crashes on malformed payloads
- 202 responses for valid requests

---

## Phase 3: GitHub API Integration (Weeks 5-6)

**Goal**: Post analysis results back to GitHub

### Tasks

1. **GitHub Client** (3 days)
   - [ ] Implement GitHub API client using `go-github` library
   - [ ] Add authentication with Personal Access Token
   - [ ] Implement rate limiting (5000 req/hour)
   - [ ] Add retry logic with exponential backoff

   ```go
   type GitHubClient struct {
       client *github.Client
       rateLimiter *rate.Limiter
   }
   
   func (c *GitHubClient) PostComment(owner, repo string, prNumber int, body string) error
   func (c *GitHubClient) UpdateCommitStatus(owner, repo, sha, state, description string) error
   func (c *GitHubClient) UpdateComment(commentID int64, body string) error
   ```

2. **Comment Formatting** (2 days)
   - [ ] Format signal summaries for PR comments
   - [ ] Concise format (<1000 words)
   - [ ] Markdown with collapsible sections
   - [ ] Link to full analysis in web UI (future)
   - [ ] Include ChartImpact marker for identification

   ```markdown
   <!-- chartimpact:analysis:v1 -->
   ## ChartImpact Analysis
   
   ### 🔴 High Priority (2)
   - **Availability**: Readiness probe removed from `api-server/api`
   - **Security**: Service `database` now publicly exposed (LoadBalancer)
   
   ### 🟡 Medium Priority (1)
   - **Availability**: Memory limit decreased from 2Gi to 512Mi
   
   <details><summary>Full Analysis (3 total signals)</summary>
   ...
   </details>
   ```

3. **Commit Status Updates** (2 days)
   - [ ] Set commit status to "pending" on event receipt
   - [ ] Update to "success" or "failure" based on thresholds
   - [ ] Include signal count in status description

4. **Idempotent Comment Handling** (2 days)
   - [ ] Search for existing ChartImpact comments
   - [ ] Update existing comment instead of creating duplicate
   - [ ] Handle comment not found gracefully

5. **Error Handling** (1 day)
   - [ ] Handle GitHub API errors
   - [ ] Handle rate limiting
   - [ ] Log GitHub API responses

### Deliverables
- GitHub API client with full functionality
- PR commenting capability
- Commit status updates
- Idempotent operations
- Error handling and retry logic

### Success Criteria
- Comments posted successfully
- Comments updated (not duplicated)
- Commit statuses reflect analysis
- Rate limits respected
- Graceful error handling

---

## Phase 4: Async Processing (Weeks 7-8)

**Goal**: Handle webhook load with async processing

### Tasks

1. **Processing Queue** (3 days)
   - [ ] Implement in-memory job queue
   - [ ] Add worker pool (configurable size)
   - [ ] Job prioritization (by importance)
   - [ ] Job status tracking

   ```go
   type ProcessingQueue struct {
       jobs     chan Job
       workers  int
       results  sync.Map
       metrics  *Metrics
   }
   
   type Job struct {
       ID        string
       Event     GitHubEvent
       Priority  int
       CreatedAt time.Time
   }
   ```

2. **Worker Implementation** (2 days)
   - [ ] Worker goroutines
   - [ ] Job processing logic
   - [ ] Error handling and retry
   - [ ] Completion notification

3. **Status Tracking** (2 days)
   - [ ] In-memory job status map
   - [ ] Status API endpoint: `GET /api/webhooks/status/:jobId`
   - [ ] Job cleanup after completion

4. **Webhook Response** (1 day)
   - [ ] Return 202 Accepted with job ID
   - [ ] Include status endpoint URL
   - [ ] Document async behavior

5. **Metrics and Monitoring** (2 days)
   - [ ] Queue depth metric
   - [ ] Processing time histogram
   - [ ] Success/failure counters
   - [ ] Worker utilization
   - [ ] Prometheus endpoint: `/metrics`

### Deliverables
- Non-blocking webhook processing
- Worker pool with configurable concurrency
- Job status tracking
- Metrics and observability
- Performance testing results

### Success Criteria
- Webhooks return immediately (< 100ms)
- Jobs processed within 30 seconds (p95)
- Queue never blocks
- Metrics available
- No memory leaks

---

## Phase 5: Signal-Based Thresholds (Weeks 9-10)

**Goal**: Enable configurable signal-based policies

### Tasks

1. **Threshold Configuration** (3 days)
   - [ ] Define threshold schema (YAML/JSON)
   - [ ] Load configuration from file/environment
   - [ ] Per-category thresholds (availability, security)
   - [ ] Per-importance thresholds (high, medium, low)

   ```yaml
   thresholds:
     availability:
       high: fail      # Block PR if high-importance availability signals
       medium: warn    # Warn but don't block
       low: ignore
     security:
       high: fail
       medium: warn
       low: ignore
     other:
       high: warn
       medium: ignore
       low: ignore
   ```

2. **Threshold Evaluation** (2 days)
   - [ ] Evaluate signal result against thresholds
   - [ ] Determine overall status (pass, warn, fail)
   - [ ] Generate status description

3. **Status Integration** (2 days)
   - [ ] Set commit status based on threshold evaluation
   - [ ] Include threshold evaluation in PR comment
   - [ ] Document threshold behavior

4. **Per-Repository Configuration** (2 days)
   - [ ] Support `.chartimpact.yml` in repository
   - [ ] Override default thresholds per-repo
   - [ ] Validate configuration schema

5. **Testing** (1 day)
   - [ ] Test various threshold configurations
   - [ ] Test per-repo overrides
   - [ ] Test edge cases (no config, invalid config)

### Deliverables
- Configurable thresholds system
- Per-repository override support
- Threshold-based commit statuses
- Configuration documentation
- Example configurations

### Success Criteria
- Thresholds correctly evaluated
- Commit statuses reflect threshold decisions
- Per-repo config works
- Invalid configs handled gracefully
- Well-documented

---

## Phase 6: Production Hardening (Weeks 11-12)

**Goal**: Production-ready webhook integration

### Tasks

1. **Result Caching (Optional)** (2 days)
   - [ ] Cache comparison results by input hash
   - [ ] TTL-based cache expiration
   - [ ] Cache hit metrics
   - [ ] Consider external cache (Redis) for multi-instance deployments

2. **Enhanced Error Recovery** (2 days)
   - [ ] Dead letter queue for failed jobs
   - [ ] Manual retry mechanism
   - [ ] Alert on critical failures
   - [ ] Circuit breaker for GitHub API

3. **Security Hardening** (2 days)
   - [ ] Audit logging for all webhook events
   - [ ] Rate limiting per repository
   - [ ] Request size limits
   - [ ] Input sanitization audit

4. **Performance Optimization** (2 days)
   - [ ] Profile comparison performance
   - [ ] Optimize signal detection
   - [ ] Concurrent processing where safe
   - [ ] Memory usage optimization

5. **Documentation** (2 days)
   - [ ] Deployment guide for webhook integration
   - [ ] GitHub App setup instructions
   - [ ] Troubleshooting guide
   - [ ] Architecture diagrams
   - [ ] Configuration reference

6. **Operational Readiness** (2 days)
   - [ ] Runbook for common issues
   - [ ] Monitoring dashboard
   - [ ] Alert definitions
   - [ ] Backup and recovery procedures

### Deliverables
- Production-ready webhook support
- Complete documentation
- Monitoring and alerting
- Operational runbook
- Deployment guide

### Success Criteria
- Load testing passes (100 req/min)
- No security vulnerabilities
- Complete monitoring coverage
- Documentation reviewed
- Runbook tested

---

## Post-Implementation: Advanced Features (Future)

### Phase 7: Advanced Analysis (Future)

- Historical comparison (trend analysis)
- Multi-version comparison (A/B/C)
- Custom signal rules (user-defined patterns)
- Breaking change risk scoring
- Dependency analysis (chart dependencies)

### Phase 8: Multi-Platform Support (Future)

- GitLab webhook support
- Bitbucket webhook support
- Generic webhook endpoint (platform-agnostic)
- Slack/Teams notifications

### Phase 9: Enterprise Features (Future)

- Result persistence (database)
- Long-term analytics
- Compliance reporting
- Team management
- Audit trails

---

## Migration and Rollback Strategy

### Feature Flags

All webhook features controlled by environment variables:

```bash
# Enable webhook endpoint (default: false)
WEBHOOK_ENABLED=true

# Enable signal detection (default: true)
SIGNALS_ENABLED=true

# Enable GitHub commenting (default: false when WEBHOOK_ENABLED=true)
GITHUB_COMMENTING_ENABLED=false

# Enable commit status updates (default: false when WEBHOOK_ENABLED=true)
GITHUB_STATUS_ENABLED=false

# Enable async processing (default: false)
ASYNC_PROCESSING_ENABLED=false
```

### Rollout Plan

1. **Week 1-2**: Deploy with `WEBHOOK_ENABLED=false` (signal detection only)
2. **Week 3-4**: Enable webhook endpoint for test repository
3. **Week 5-6**: Enable GitHub commenting for test repository
4. **Week 7-8**: Enable async processing for test repository
5. **Week 9-10**: Enable thresholds for test repository
6. **Week 11**: Monitor test repository for 1 week
7. **Week 12**: General availability (enable for all interested repositories)

### Rollback Procedure

If issues arise:

1. Set `WEBHOOK_ENABLED=false` to disable webhook endpoint
2. Existing `/api/compare` endpoint continues working normally
3. No data loss (stateless system)
4. Roll back to previous deployment if necessary

---

## Testing Strategy

### Unit Tests

- All new packages (webhooks, github client, queue)
- Coverage target: 80%
- Determinism tests for signals
- Edge case coverage

### Integration Tests

- End-to-end webhook flow
- GitHub API mocking
- Event parsing scenarios
- Async processing

### Load Tests

- 100 webhooks per minute
- Concurrent PR events
- Large chart comparisons
- Queue saturation tests

### Security Tests

- Signature verification
- Rate limiting
- Input validation
- Token security

---

## Dependencies

### Go Libraries

```go
require (
    github.com/google/go-github/v57 latest
    golang.org/x/oauth2 latest
    golang.org/x/time latest // rate limiting
    github.com/prometheus/client_golang latest // metrics
)
```

### External Services

- GitHub API (for webhooks and commenting)
- GitHub Webhooks (configured per repository)

---

## Resource Requirements

### Development

- 2 developers
- 12 weeks
- Code reviews for all changes
- Daily standups

### Infrastructure

- Current: Single backend instance sufficient
- Future (scale): 3+ backend instances with load balancer
- Optional: Redis for distributed caching
- Monitoring: Prometheus + Grafana

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| GitHub API rate limits | High | Implement rate limiting, caching, backoff |
| Webhook processing delays | Medium | Async processing, worker pool |
| Signal detection accuracy | Medium | Comprehensive testing, user feedback |
| Memory leaks | High | Profiling, load testing, monitoring |

### Operational Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Failed deployments | High | Feature flags, gradual rollout, rollback plan |
| Webhook floods | Medium | Rate limiting, queue size limits |
| GitHub downtime | Low | Graceful degradation, retry logic |
| Security vulnerabilities | High | Security audits, input validation |

---

## Success Metrics

### Technical Metrics

- Webhook processing time: < 30 seconds (p95)
- API response time: < 100ms for webhook acceptance
- Signal detection accuracy: > 95%
- Test coverage: > 80%
- Zero critical security vulnerabilities

### Product Metrics

- Adoption: 10+ repositories using webhooks (first 3 months)
- Satisfaction: Positive feedback from users
- Accuracy: < 5% false positive signals
- Availability: 99.9% uptime

### Business Metrics

- Increased ChartImpact usage
- Positive community feedback
- GitHub Stars growth
- Blog posts / conference talks

---

## Conclusion

This roadmap provides a clear, incremental path from ChartImpact's current state to a fully webhook-enabled, mission-aligned impact analysis system.

**Key Principles**:
- ✅ Incremental delivery (ship early, ship often)
- ✅ Backward compatibility (no breaking changes)
- ✅ Feature flags (gradual rollout)
- ✅ Testing at every phase
- ✅ Documentation alongside code

**Timeline**: 12 weeks for core webhook integration, with advanced features planned for future phases.

**Outcome**: ChartImpact becomes a proactive, event-driven system that helps teams understand Helm chart changes automatically, reducing deployment risk and increasing confidence.
