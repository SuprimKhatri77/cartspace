package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

func RequireAdmin(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")

		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Unauthorized",
			})
			c.Abort()

			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		if tokenString == "" || tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Invalid authorization header",
			})
			c.Abort()
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {

				return nil, fmt.Errorf("unexpected signing method")
			}

			return []byte(cfg.JWTAccessSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Invalid or expired token",
			})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Invalid token claims",
			})
			c.Abort()
			return
		}

		_, ok = claims["user_id"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Invalid token claims",
			})
			c.Abort()
			return
		}

		role, ok := claims["role"].(string)

		if !ok {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Invalid token claims",
			})
			c.Abort()
			return
		}

		if role != "admin" {
			c.JSON(http.StatusForbidden, types.APIResponse{
				Success: false,
				Message: "Forbidden",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
