package utils

import (
	"regexp"
	"strings"

	"github.com/jaevor/go-nanoid"
)

var nonAlphanumeric = regexp.MustCompile(`[^a-z0-9]+`)

func Slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = nonAlphanumeric.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}

func SlugWithSuffix(base string) (string, error) {
	gen, err := nanoid.CustomASCII("abcdefghijklmnopqrstuvwxyz0123456789", 7)
	if err != nil {
		return "", err
	}
	return base + "-" + gen(), nil
}
