# CORS Configuration

## Overview

The ChartImpact backend implements Cross-Origin Resource Sharing (CORS) middleware with support for wildcard patterns, enabling flexible configuration for multiple deployment environments including Cloudflare Pages preview deployments.

## Configuration

CORS is configured via environment variables:

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins. Supports wildcards (`*`). | `http://localhost:3000,http://localhost:3001` | `https://app.example.com,https://*.preview.pages.dev` |
| `CORS_ALLOWED_METHODS` | Comma-separated list of allowed HTTP methods | `GET,POST,PUT,DELETE,OPTIONS` | `GET,POST` |
| `CORS_ALLOWED_HEADERS` | Comma-separated list of allowed request headers | `Content-Type,Authorization` | `Content-Type,X-Custom-Header` |

### Wildcard Pattern Support

The CORS middleware supports wildcard patterns using asterisk (`*`) to match dynamic subdomains or prefixes:

#### Examples

**Subdomain wildcards:**
```bash
CORS_ALLOWED_ORIGINS="https://*.example.com"
```
Matches:
- ✅ `https://app.example.com`
- ✅ `https://staging.example.com`
- ✅ `https://preview-123.example.com`
- ❌ `https://example.com` (no subdomain)
- ❌ `https://malicious.different.com`

**Prefix wildcards:**
```bash
CORS_ALLOWED_ORIGINS="https://preview-*.pages.dev"
```
Matches:
- ✅ `https://preview-abc123.pages.dev`
- ✅ `https://preview-feature-xyz.pages.dev`
- ❌ `https://other-abc123.pages.dev`

**Multiple patterns:**
```bash
CORS_ALLOWED_ORIGINS="https://app.example.com,https://*.preview.pages.dev,http://localhost:3000"
```
Matches:
- ✅ `https://app.example.com` (exact match)
- ✅ `https://feature-123.preview.pages.dev` (wildcard match)
- ✅ `http://localhost:3000` (exact match)

## Cloudflare Pages Configuration

For Cloudflare Pages deployments with preview environments:

### Production + Preview Deployments

```bash
CORS_ALLOWED_ORIGINS="https://ci.dcotelo.dev,https://*.chartimpact.pages.dev,http://localhost:3000"
```

This configuration allows:
- Production domain: `https://ci.dcotelo.dev`
- All preview deployments: `https://*.chartimpact.pages.dev`
  - Hash-based previews: `https://da5dc162.chartimpact.pages.dev`
  - Branch-based previews: `https://feat-new-feature.chartimpact.pages.dev`
- Local development: `http://localhost:3000`

### fly.toml Configuration

In your `fly.toml` file:

```toml
[env]
  CORS_ALLOWED_ORIGINS = "https://ci.dcotelo.dev,https://*.chartimpact.pages.dev,http://localhost:3000"
  CORS_ALLOWED_METHODS = "GET,POST,PUT,DELETE,OPTIONS"
  CORS_ALLOWED_HEADERS = "Content-Type,Authorization"
```

## Implementation Details

### Pattern Matching Algorithm

1. **Exact Match**: If the allowed origin doesn't contain `*`, exact string comparison is performed
2. **Wildcard Match**: If the allowed origin contains `*`:
   - Special regex characters are escaped using `regexp.QuoteMeta()`
   - `*` is replaced with `.*` (regex for "any character, any times")
   - Full regex match is performed: `^pattern$`

### Security Considerations

**✅ Safe Patterns:**
```bash
https://*.trusted-domain.com
https://preview-*.pages.dev
```

**⚠️ Use with Caution:**
```bash
https://*  # Allows any HTTPS origin
*          # Allows any origin (very insecure)
```

**Best Practices:**
- Always include the domain after the wildcard
- Use wildcards only for trusted domains you control
- Test your patterns thoroughly
- Monitor CORS errors in production logs

### CORS Preflight Requests

The middleware automatically handles OPTIONS preflight requests:
- Returns `204 No Content` status
- Sets all required CORS headers
- Does not forward the request to downstream handlers

### Request Flow

1. Browser sends request with `Origin` header
2. Middleware checks if origin matches any allowed pattern
3. If matched:
   - Sets `Access-Control-Allow-Origin: <origin>`
   - Sets other CORS headers
   - Proceeds to handler
4. If not matched:
   - No CORS headers set
   - Browser blocks the request

## Testing

Comprehensive test suite available in `middleware_test.go`:

```bash
# Run CORS tests
go test ./internal/api/middleware -v

# Run specific test
go test ./internal/api/middleware -v -run TestCORS_WildcardPattern

# Run with coverage
go test ./internal/api/middleware -cover
```

### Test Coverage

- ✅ Exact origin matching
- ✅ Wildcard subdomain patterns
- ✅ Wildcard prefix patterns
- ✅ Multiple allowed origins
- ✅ Preflight OPTIONS requests
- ✅ Custom headers and methods
- ✅ Cloudflare Pages deployment patterns
- ✅ Disallowed origins

## Troubleshooting

### Common Issues

**Issue**: CORS error despite correct configuration
```
Access-Control-Allow-Origin header has a value that is not equal to the supplied origin
```

**Solutions:**
1. Verify environment variable is set: `fly secrets list`
2. Check for trailing slashes in URLs
3. Ensure HTTPS/HTTP scheme matches exactly
4. Redeploy after changing environment variables
5. Check browser console for actual origin being sent

**Issue**: Wildcard pattern not matching

**Solutions:**
1. Test pattern with the test suite
2. Verify no typos in pattern
3. Remember wildcards must match at least one character
4. Check if scheme (http/https) matches

**Issue**: Preflight request failing

**Solutions:**
1. Ensure server responds to OPTIONS requests
2. Verify all CORS headers are set
3. Check if origin is in allowed list
4. Look for server-side redirects (not allowed in preflight)

## Deployment Checklist

Before deploying:

- [ ] Set `CORS_ALLOWED_ORIGINS` in `fly.toml` or via secrets
- [ ] Include production domain(s)
- [ ] Add wildcard pattern for preview deployments
- [ ] Keep `localhost` for local development
- [ ] Test with actual preview deployment URLs
- [ ] Verify preflight requests work
- [ ] Check browser console for CORS errors
- [ ] Monitor production logs

## Examples

### Local Development
```bash
CORS_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
```

### Single Production Domain
```bash
CORS_ALLOWED_ORIGINS="https://app.example.com"
```

### Production + Staging
```bash
CORS_ALLOWED_ORIGINS="https://app.example.com,https://staging.example.com"
```

### Full Stack (Recommended)
```bash
CORS_ALLOWED_ORIGINS="https://app.example.com,https://*.preview.pages.dev,http://localhost:3000"
```

## References

- [MDN Web Docs: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Go regexp package](https://pkg.go.dev/regexp)
