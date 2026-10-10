package validator

import (
	"reflect"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

var (
	once sync.Once

	// only letters (upper+lower) and spaces allowed
	alphaSpaceRe = regexp.MustCompile(`^[a-zA-Z\s]+$`)
)

func Init() {
	once.Do(func() {
		v, ok := binding.Validator.Engine().(*validator.Validate)
		if !ok {
			return
		}

		_ = v.RegisterValidation("alphaspace", func(fl validator.FieldLevel) bool {
			return alphaSpaceRe.MatchString(fl.Field().String())
		})

		_ = v.RegisterValidation("date_format", func(fl validator.FieldLevel) bool {
			_, err := time.Parse("2006-01-02", fl.Field().String())
			return err == nil
		})

		_ = v.RegisterValidation("not_blank", func(fl validator.FieldLevel) bool {
			return strings.TrimSpace(fl.Field().String()) != ""
		})

		// samelen=Other: this slice has as many items as the sibling field Other
		// (e.g. one Cloudinary public ID per image URL).
		_ = v.RegisterValidation("samelen", func(fl validator.FieldLevel) bool {
			other := reflect.Indirect(fl.Parent()).FieldByName(fl.Param())
			if !other.IsValid() || other.Kind() != reflect.Slice || fl.Field().Kind() != reflect.Slice {
				return false
			}
			return fl.Field().Len() == other.Len()
		})
	})
}
