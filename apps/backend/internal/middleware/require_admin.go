package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

func RequireAdmin(c *gin.Context) {

	roleFromContext := c.MustGet("role")

	if roleFromContext != "admin" {
		c.JSON(http.StatusForbidden, types.APIResponse{
			Success: false,
			Message: "Forbidden",
			Code:    constants.Forbidden,
		})
		return
	}

	c.Next()
}
