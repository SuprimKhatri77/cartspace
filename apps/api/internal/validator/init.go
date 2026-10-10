package validator

import (
	"regexp"
	"sync"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

var once sync.Once

func Init() {
	once.Do(func() {
		v, ok := binding.Validator.Engine().(*validator.Validate)
		if !ok {
			return
		}

		v.RegisterValidation("alphaspace", func(fl validator.FieldLevel) bool {
			// only letters (upper+lower) and spaces allowed
			return regexp.MustCompile(`^[a-zA-Z\s]+$`).MatchString(fl.Field().String())
		})
	})
}
