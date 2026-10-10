package utils

import (
	"reflect"
	"strings"
)

func TrimStruct(obj any, skip ...string) {
	v := reflect.ValueOf(obj)

	// must be a pointer to mutate the original
	if v.Kind() != reflect.Ptr {
		return
	}

	v = v.Elem()

	// build a set of fields to skip for quick lookup
	skipSet := make(map[string]bool)
	for _, s := range skip {
		skipSet[s] = true
	}

	for i := 0; i < v.NumField(); i++ {
		field := v.Type().Field(i)
		value := v.Field(i)

		// only process string fields that are settable and not in skip list
		if value.Kind() == reflect.String && value.CanSet() && !skipSet[field.Name] {
			value.SetString(strings.TrimSpace(value.String()))
		}
	}
}
