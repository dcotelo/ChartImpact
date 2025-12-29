package storage

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/dcotelo/chartimpact/backend/internal/models"
)

// ComputeContentHash generates a deterministic hash from comparison request parameters
// This is used for deduplication - identical requests return the same hash
func ComputeContentHash(req *models.CompareRequest) string {
	h := sha256.New()

	// Add required fields
	h.Write([]byte(req.Repository))
	h.Write([]byte{0}) // separator
	h.Write([]byte(req.ChartPath))
	h.Write([]byte{0})
	h.Write([]byte(req.Version1))
	h.Write([]byte{0})
	h.Write([]byte(req.Version2))
	h.Write([]byte{0})

	// Add optional values file
	if req.ValuesFile != nil && *req.ValuesFile != "" {
		h.Write([]byte("valuesFile:"))
		h.Write([]byte(*req.ValuesFile))
		h.Write([]byte{0})
	}

	// Add optional values content (hash it first to avoid huge strings)
	if req.ValuesContent != nil && *req.ValuesContent != "" {
		valueHash := sha256.Sum256([]byte(*req.ValuesContent))
		h.Write([]byte("valuesContent:"))
		h.Write(valueHash[:])
		h.Write([]byte{0})
	}

	// Add other configuration options that affect output
	if req.IgnoreLabels {
		h.Write([]byte("ignoreLabels:true"))
		h.Write([]byte{0})
	}

	if req.SecretHandling != "" {
		h.Write([]byte(fmt.Sprintf("secretHandling:%s", req.SecretHandling)))
		h.Write([]byte{0})
	}

	if req.ContextLines != nil {
		h.Write([]byte(fmt.Sprintf("contextLines:%d", *req.ContextLines)))
		h.Write([]byte{0})
	}

	return hex.EncodeToString(h.Sum(nil))
}

// ComputeValuesSHA256 computes SHA-256 hash of values content
func ComputeValuesSHA256(valuesContent string) string {
	if valuesContent == "" {
		return ""
	}
	hash := sha256.Sum256([]byte(valuesContent))
	return hex.EncodeToString(hash[:])
}
