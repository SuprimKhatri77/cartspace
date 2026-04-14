package authHandler

import (
	"crypto/sha256"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

func RefreshAccessToken(queries repository.AuthRepository, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		refreshTokenString, err := c.Cookie("refresh_token")
		if err != nil {
			c.JSON(http.StatusUnauthorized, types.APIResponse{Success: false, Message: "Refresh token not found."})
			return
		}

		// validate the JWT signature first (catches tampered/expired tokens)
		token, err := jwt.Parse(refreshTokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(cfg.JWTRefreshSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, types.APIResponse{Success: false, Message: "Invalid refresh token."})
			return
		}

		// extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, types.APIResponse{Success: false, Message: "Invalid token claims."})
			return
		}

		// hash the incoming token and check it exists in DB
		hash := sha256.Sum256([]byte(refreshTokenString))
		tokenHash := fmt.Sprintf("%x", hash)

		dbToken, err := queries.GetRefreshToken(ctx, tokenHash)
		if err != nil {
			slog.Error("error getting refresh token", "error", err)
			// token not in DB = already used (rotation violation) or never existed
			c.JSON(http.StatusUnauthorized, types.APIResponse{Success: false, Message: "Invalid refresh token."})
			return
		}

		// check if expired in DB (double check alongside JWT exp)
		if dbToken.ExpiresAt.Time.Before(time.Now()) {

			c.JSON(http.StatusUnauthorized, types.APIResponse{Success: false, Message: "Refresh token expired."})
			return
		}

		// delete the old refresh token (rotation — one time use)
		err = queries.DeleteRefreshToken(ctx, tokenHash)
		if err != nil {
			slog.Error("error deleting refresh token", "error", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Message: "Failed to rotate token."})
			return
		}

		userID := claims["user_id"]

		// generate new access token
		accessClaims := jwt.MapClaims{
			"user_id": userID,
			"exp":     time.Now().Add(15 * time.Minute).Unix(),
		}
		newAccessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
		newAccessTokenString, err := newAccessToken.SignedString([]byte(cfg.JWTAccessSecret))
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Message: "Failed to generate access token."})
			return
		}

		// generate new refresh token
		refreshClaims := jwt.MapClaims{
			"user_id": userID,
			"exp":     time.Now().Add(30 * 24 * time.Hour).Unix(),
		}
		newRefreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
		newRefreshTokenString, err := newRefreshToken.SignedString([]byte(cfg.JWTRefreshSecret))

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Message: "Failed to generate refresh token."})
			return
		}

		// save new refresh token hash to DB
		newHash := sha256.Sum256([]byte(newRefreshTokenString))
		newTokenHash := fmt.Sprintf("%x", newHash)

		_, err = queries.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
			UserID:    dbToken.UserID,
			TokenHash: newTokenHash,
			ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(30 * 24 * time.Hour), Valid: true},
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Message: "Failed to save refresh token."})
			return
		}

		// set new cookies
		c.SetCookie("access_token", newAccessTokenString, 15*60, "/", "", true, true)
		c.SetCookie("refresh_token", newRefreshTokenString, 30*24*60*60, "/auth", "", true, true)

		c.JSON(http.StatusOK, types.APIResponse{Success: true, Message: "Tokens refreshed."})
	}
}
