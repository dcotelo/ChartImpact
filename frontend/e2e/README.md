# End-to-End Tests for Explorer v2

This directory contains Playwright E2E tests that validate the full integration flow of Explorer v2.

## Purpose

These tests ensure that Explorer v2:
1. **Never blocks** when comparison data is available from the backend
2. **Uses real backend data** (not demo or mock data in production)
3. **Falls back gracefully** to plain diff conversion when structured diff unavailable
4. **Shares data** with Classic view (single source of truth)
5. **Cannot regress silently** in future changes

## Test Files

- `explorer-v2.spec.ts` - Comprehensive E2E tests for Explorer v2 functionality

## Running Tests

### Prerequisites

```bash
cd frontend
npm install
npx playwright install chromium
```

### Run all E2E tests

```bash
npm run test:e2e
```

### Run with UI mode (interactive)

```bash
npm run test:e2e:ui
```

### Run in headed mode (see browser)

```bash
npm run test:e2e:headed
```

### Run specific test file

```bash
npx playwright test e2e/explorer-v2.spec.ts
```

### Debug a specific test

```bash
npx playwright test e2e/explorer-v2.spec.ts --debug
```

## Test Coverage

### With Structured Diff from Backend
- ✅ Explorer v2 renders without blocking
- ✅ No "DEMO MODE" badge (using real data)
- ✅ Resources and changes displayed
- ✅ View switching works (Classic ↔ Explorer v2)

### With Plain Diff Only (Backward Compatibility)
- ✅ Falls back to plain diff converter
- ✅ Shows "ADAPTED FROM PLAIN DIFF" badge
- ✅ Still renders (not blocked)

### Error Cases
- ✅ Blocks only when truly no data exists
- ✅ Handles backend errors gracefully

### Regression Prevention
- ✅ CRITICAL: Never blocks when structuredDiff exists
- ✅ CRITICAL: Never blocks when plain diff exists
- ✅ CRITICAL: Classic and Explorer v2 use same data

### Demo Mode
- ✅ Demo mode badge only on `/demo` route
- ✅ No demo badge when using real backend data

## CI/CD Integration

These tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- As part of the `regression-check` job

See `.github/workflows/frontend-tests.yml` for CI configuration.

## Mocking Strategy

Tests mock the backend API response using Playwright's `page.route()`:

```typescript
await page.route('**/api/compare', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      structuredDiff: { /* ... */ },
      structuredDiffAvailable: true
    })
  });
});
```

This ensures tests are:
- **Fast** - No real backend needed
- **Reliable** - No external dependencies
- **Comprehensive** - Can test edge cases and error conditions

## Adding New Tests

When adding new Explorer v2 features, add corresponding E2E tests:

1. Add test to `explorer-v2.spec.ts`
2. Use descriptive test names: `should [expected behavior] when [condition]`
3. Mock appropriate backend responses
4. Assert both positive (works) and negative (doesn't break) cases
5. Run locally before committing: `npm run test:e2e`

## Debugging Failed Tests

### View test trace

```bash
npx playwright show-trace playwright-results/.../trace.zip
```

### Run with headed browser

```bash
npm run test:e2e:headed
```

### Run in debug mode

```bash
npx playwright test --debug
```

### View last HTML report

```bash
npx playwright show-report
```

## Best Practices

1. **Test user journeys**, not implementation details
2. **Mock backend** for speed and reliability
3. **Assert critical behavior** (e.g., never blocking when data exists)
4. **Use descriptive names** so failures are self-documenting
5. **Keep tests focused** - one concept per test
6. **Run locally** before pushing

## Related Documentation

- `EXPLORER_V2_UNBLOCKING.md` - Implementation summary
- `DIFFRESULTV2.md` - Structured diff format specification
- `playwright.config.ts` - Playwright configuration
- `.github/workflows/frontend-tests.yml` - CI configuration
