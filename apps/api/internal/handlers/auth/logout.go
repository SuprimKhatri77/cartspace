package authHandler

import (
	"crypto/sha256"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
)

func Logout(queries repository.AuthRepository, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		refreshToken, err := c.Cookie("refresh_token")
		if err != nil {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Refresh token not found.",
				Code:    constants.MissingRefreshToken,
			})
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
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Invalid refresh token.",
				Code:    constants.InvalidRefreshToken,
			})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to logout",
				Code:    constants.InternalServerError,
			})
			return
		}

		sessionIDFromClaims, ok := claims["session_id"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Invalid token claims",
				Code:    constants.InvalidTokenClaims,
			})
			return
		}

		sessionID, err := utils.ConvertToUUID(sessionIDFromClaims)
		if err != nil {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Invalid refresh token",
				Code:    constants.InvalidRefreshToken,
			})
			return
		}

		// hash and delete — no need to extract claims at all
		hash := sha256.Sum256([]byte(refreshToken))
		tokenHash := fmt.Sprintf("%x", hash)

		result, err := queries.RevokeRefreshToken(ctx, db.RevokeRefreshTokenParams{
			TokenHash: tokenHash,
			SessionID: sessionID,
		})
		if err != nil {
			slog.Error("failed to logout", "error", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to logout.",
				Code:    constants.InternalServerError,
			})
			return
		}

		if result.RowsAffected() == 0 {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Invalid refresh token",
				Code:    constants.InvalidRefreshToken,
			})
			return
		}

		// clear cookies
		utils.SetAuthCookie(c, "access_token", "", -1, cfg)
		utils.SetAuthCookie(c, "refresh_token", "", -1, cfg)

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Logged out successfully.",
		})
	}
}
