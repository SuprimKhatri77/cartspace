package utils

import (
	"github.com/gin-gonic/gin"
	"github.com/suprimkhatri77/cartspace/backend/internal/config"
)

func SetAuthCookie(c *gin.Context, name, value string, maxAge int, cfg *config.Config) {
	secure := cfg.GinMode == "release"
	domain := ""
	if secure {
		domain = cfg.CookieDomain
	}
	c.SetCookie(name, value, maxAge, "/", domain, secure, true)

}
