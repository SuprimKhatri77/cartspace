package utils

import (
	"reflect"
	"strings"
)

// TrimStruct trims surrounding whitespace from the top-level string fields of
// the struct obj points to. Fields tagged `trim:"-"` (e.g. passwords) and
// fields named in skip are left untouched.
func TrimStruct(obj any, skip ...string) {
	v := reflect.ValueOf(obj)
	if v.Kind() != reflect.Ptr || v.Elem().Kind() != reflect.Struct {
		return
	}
	v = v.Elem()

	skipSet := make(map[string]bool, len(skip))
	for _, s := range skip {
		skipSet[s] = true
	}

	for i := 0; i < v.NumField(); i++ {
		field := v.Type().Field(i)
		value := v.Field(i)

		if value.Kind() != reflect.String || !value.CanSet() || skipSet[field.Name] || field.Tag.Get("trim") == "-" {
			continue
		}
		value.SetString(strings.TrimSpace(value.String()))
	}
}
