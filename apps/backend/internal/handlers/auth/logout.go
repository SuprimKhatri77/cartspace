package authHandler

import (
	"crypto/sha256"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

func Logout(queries repository.AuthRepository, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		refreshToken, err := c.Cookie("refresh_token")
		if err != nil {
			c.JSON(http.StatusUnauthorized, types.APIResponse{Success: false, Message: "Refresh token not found."})
			return
		}

		// validate signature
		token, err := jwt.Parse(refreshToken, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(cfg.JWTRefreshSecret), nil
		})
		if err != nil || !token.Valid {
			slog.Error("invalid refresh token", "error", err)
			c.JSON(http.StatusUnauthorized, types.APIResponse{Success: false, Message: "Invalid refresh token."})
			return
		}

		// hash and delete — no need to extract claims at all
		hash := sha256.Sum256([]byte(refreshToken))
		tokenHash := fmt.Sprintf("%x", hash)

		err = queries.DeleteRefreshToken(ctx, tokenHash)
		if err != nil {
			slog.Error("failed to logout", "error", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Message: "Failed to logout."})
			return
		}

		// clear cookies
		c.SetCookie("access_token", "", 0, "/", "", true, true)
		c.SetCookie("refresh_token", "", 0, "/auth", "", true, true)

		c.JSON(http.StatusOK, types.APIResponse{Success: true, Message: "Logged out successfully."})
	}
}
