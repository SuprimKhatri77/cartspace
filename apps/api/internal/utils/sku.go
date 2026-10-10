package utils

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
)

func GenerateSKU(productName string, variantOptions []string) string {
	trimmedName := strings.TrimSpace(productName)
	prefix := strings.ToUpper(strings.ReplaceAll(trimmedName[:min(3, len(trimmedName))], " ", ""))
	if prefix == "" {
		prefix = "SKU"
	}

	var optionParts []string
	for _, opt := range variantOptions {
		if len(opt) > 0 {
			optionParts = append(optionParts, strings.ToUpper(opt[:min(3, len(opt))]))
		}
	}

	suffix := strings.Join(optionParts, "-")

	random := strings.ToUpper(uuid.New().String()[:13])

	if suffix != "" {
		return fmt.Sprintf("%s-%s-%s", prefix, suffix, random)
	}
	return fmt.Sprintf("%s-%s", prefix, random)
}
