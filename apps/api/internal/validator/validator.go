package validator

import (
	"errors"
	"fmt"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

func Parse(err error, obj any) []types.AppError {
	var ve validator.ValidationErrors

	if !errors.As(err, &ve) {
		return []types.AppError{
			{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request body",
			},
		}
	}

	var errs []types.AppError

	for _, fe := range ve {
		jsonField := getJSONFieldName(obj, fe)
		errs = append(errs, types.AppError{
			Code:    mapTagToCode(fe.Tag()),
			Field:   normalizeField(obj, fe),
			Message: buildMessage(fe, jsonField),
		})
	}

	return errs
}

func normalizeField(obj any, fe validator.FieldError) string {
	return getJSONFieldName(obj, fe)
}

func mapTagToCode(tag string) string {
	switch tag {
	case "required":
		return "REQUIRED_FIELD"
	case "min":
		return "TOO_SHORT"
	case "max":
		return "TOO_LONG"
	case "email":
		return "INVALID_EMAIL"
	case "uuid":
		return "INVALID_UUID"
	case "url":
		return "INVALID_URL"
	case "alphaspace":
		return "INVALID_FORMAT"
	case "alphanum":
		return "INVALID_FORMAT"
	case "gt", "gte", "lt", "lte":
		return "OUT_OF_RANGE"
	case "oneof":
		return "INVALID_VALUE"
	case "boolean":
		return "INVALID_TYPE"
	case "numeric":
		return "INVALID_TYPE"
	case "dive":
		return "INVALID_ITEM"
	default:
		return "VALIDATION_ERROR"
	}
}

func buildMessage(fe validator.FieldError, jsonField string) string {
	switch fe.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", jsonField)
	case "min":
		switch fe.Kind() {
		case reflect.Slice, reflect.Array, reflect.Map:
			return fmt.Sprintf("%s must have at least %s item(s)", jsonField, fe.Param())
		case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
			reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64,
			reflect.Float32, reflect.Float64:
			return fmt.Sprintf("%s must be at least %s", jsonField, fe.Param())
		default:
			return fmt.Sprintf("%s must be at least %s characters", jsonField, fe.Param())
		}

	case "max":
		switch fe.Kind() {
		case reflect.Slice, reflect.Array, reflect.Map:
			return fmt.Sprintf("%s cannot have more than %s item(s)", jsonField, fe.Param())
		case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
			reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64,
			reflect.Float32, reflect.Float64:
			return fmt.Sprintf("%s cannot exceed %s", jsonField, fe.Param())
		default:
			return fmt.Sprintf("%s cannot exceed %s characters", jsonField, fe.Param())
		}
	case "email":
		return "invalid email format"
	case "uuid":
		return "invalid ID format"
	case "url":
		return fmt.Sprintf("%s contains an invalid URL", jsonField)
	case "alphaspace":
		return fmt.Sprintf("%s must contain only letters and spaces", jsonField)
	case "gt":
		return fmt.Sprintf("%s must be greater than %s", jsonField, fe.Param())
	case "gte":
		return fmt.Sprintf("%s must be greater than or equal to %s", jsonField, fe.Param())
	case "lt":
		return fmt.Sprintf("%s must be less than %s", jsonField, fe.Param())
	case "lte":
		return fmt.Sprintf("%s must be less than or equal to %s", jsonField, fe.Param())
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", jsonField, fe.Param())
	case "boolean":
		return fmt.Sprintf("%s must be a boolean", jsonField)
	case "numeric":
		return fmt.Sprintf("%s must be a number", jsonField)
	case "alphanum":
		return fmt.Sprintf("%s must contain only letters and numbers", jsonField)
	case "dive":
		return fmt.Sprintf("%s contains an invalid item", jsonField)
	default:
		return fmt.Sprintf("%s is invalid", jsonField)
	}
}

func getJSONFieldName(obj any, fe validator.FieldError) string {
	t := reflect.TypeOf(obj)

	// handle pointer
	if t.Kind() == reflect.Ptr {
		t = t.Elem()
	}

	field, ok := t.FieldByName(fe.StructField())
	if !ok {
		name := strings.ToLower(fe.Field())
		if idx := strings.Index(name, "["); idx != -1 {
			name = name[:idx]
		}
		return name
	}

	tag := field.Tag.Get("json")
	if tag == "" {
		name := strings.ToLower(fe.Field())
		if idx := strings.Index(name, "["); idx != -1 {
			name = name[:idx]
		}
		return name
	}

	// remove ",omitempty" etc.
	name := strings.Split(tag, ",")[0]
	if name == "" {
		name = strings.ToLower(fe.Field())
	}

	if idx := strings.Index(name, "["); idx != -1 {
		name = name[:idx]
	}

	return name
}
