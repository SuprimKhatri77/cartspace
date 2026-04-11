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
	case "aplhaspace":
		return "INVALID_FORMAT"
	default:
		return "VALIDATION_ERROR"
	}
}

func buildMessage(fe validator.FieldError, jsonField string) string {

	switch fe.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", jsonField)
	case "min":
		return fmt.Sprintf("%s must be at least %s characters", jsonField, fe.Param())
	case "max":
		return fmt.Sprintf("%s cannot exceed %s characters", jsonField, fe.Param())
	case "email":
		return "invalid email format"
	case "alphaspace":
		return fmt.Sprintf("%s must contain only letters and spaces", jsonField)
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
		return strings.ToLower(fe.Field()) // fallback
	}

	tag := field.Tag.Get("json")
	if tag == "" {
		return strings.ToLower(fe.Field())
	}

	// remove ",omitempty" etc.
	name := strings.Split(tag, ",")[0]

	if name == "" {
		return strings.ToLower(fe.Field())
	}

	return name
}
