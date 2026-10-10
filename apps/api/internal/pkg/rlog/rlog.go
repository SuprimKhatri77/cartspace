// Package rlog logs with request-scoped attributes (path, method, ip,
// request id and the authenticated user) taken from the gin context.
package rlog

import (
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
)

func attrs(c *gin.Context, extra ...any) []any {
	a := []any{
		"path", c.FullPath(),
		"method", c.Request.Method,
		"ip", c.ClientIP(),
	}
	if id := c.GetString(constants.RequestIDKey); id != "" {
		a = append(a, "request_id", id)
	}
	if userID := c.GetString(constants.UserIDKey); userID != "" {
		a = append(a, "actor_id", userID)
	}
	return append(a, extra...)
}

func Error(c *gin.Context, msg string, err error, extra ...any) {
	a := attrs(c, extra...)
	a = append(a, "error", err)
	slog.Error(msg, a...)
}

func Warn(c *gin.Context, msg string, extra ...any) {
	slog.Warn(msg, attrs(c, extra...)...)
}

func Info(c *gin.Context, msg string, extra ...any) {
	slog.Info(msg, attrs(c, extra...)...)
}
