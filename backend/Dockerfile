# Multi-stage Dockerfile for ChartImpact Go Backend
# This builds a lightweight production-ready container with Helm and Git
# The internal diff engine is used by default (no external dependencies required)

# Stage 1: Build the Go application
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git make

# Set working directory
WORKDIR /build

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Stage 2: Build the runtime image
FROM alpine:3.19

# Install runtime dependencies: Helm, Git, and CA certificates
# The internal diff engine is used by default (no external diff tools required)
RUN apk add --no-cache \
    ca-certificates \
    git \
    curl \
    tar \
    bash

# Install Helm 3.14.0
RUN curl -fsSL https://get.helm.sh/helm-v3.14.0-linux-amd64.tar.gz | tar -xz && \
    mv linux-amd64/helm /usr/local/bin/helm && \
    rm -rf linux-amd64 && \
    helm version

# Configure Git to prevent credential prompts
RUN git config --global credential.helper "" && \
    git config --global core.askPass ""

# Create non-root user for security
RUN addgroup -g 1001 chartimpact && \
    adduser -D -u 1001 -G chartimpact chartimpact

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/server .

# Copy .env.example (optional, can be overridden with volume mount)
COPY --from=builder /build/.env.example .

# Create temp directory and set permissions
RUN mkdir -p /tmp/chartimpact && \
    chown -R chartimpact:chartimpact /app /tmp/chartimpact

# Switch to non-root user
USER chartimpact

# Expose port
EXPOSE 8080

# Set environment variables
ENV PORT=8080 \
    HOST=0.0.0.0 \
    TEMP_DIR=/tmp/chartimpact \
    GIT_TERMINAL=dumb \
    GIT_ASKPASS=echo \
    INTERNAL_DIFF_ENABLED=true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Run the application
CMD ["./server"]
