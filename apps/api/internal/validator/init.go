package validator

import (
	"regexp"
	"sync"

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
	})
}
