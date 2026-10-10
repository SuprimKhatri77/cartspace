package authHandler

import (
	"crypto/sha256"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
)

func RefreshAccessToken(queries repository.AuthRepository, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		refreshTokenString, err := c.Cookie("refresh_token")
		if err != nil {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Refresh token not found",
				Code:    constants.MissingRefreshToken,
			})
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
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Invalid refresh token",
				Code:    constants.InvalidRefreshToken,
			})
			return
		}

		// extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Invalid token",
				Code:    constants.InvalidToken,
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
				Message: "Invalid claims data",
				Code:    constants.InvalidTokenClaims,
			})
			return
		}

		// hash the incoming token and check it exists in DB
		hash := sha256.Sum256([]byte(refreshTokenString))
		tokenHash := fmt.Sprintf("%x", hash)

		dbToken, err := queries.GetRefreshToken(ctx, db.GetRefreshTokenParams{
			SessionID: sessionID,
			TokenHash: tokenHash,
		})

		if err != nil {

			slog.Error("error getting refresh token", "error", err)

			if errors.Is(err, pgx.ErrNoRows) {

				utils.SetAuthCookie(c, "refresh_token", "", -1, cfg)
				utils.SetAuthCookie(c, "access_token", "", -1, cfg)

				c.JSON(http.StatusUnauthorized, types.APIResponse{
					Success: false,
					Message: "Invalid refresh token",
					Code:    constants.InvalidRefreshToken,
				})
				return
			}

			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Invalid refresh token",
				Code:    constants.InvalidRefreshToken,
			})
			return
		}

		// check if expired in DB (double check alongside JWT exp)
		if dbToken.ExpiresAt.Time.Before(time.Now()) {

			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Refresh token expired",
				Code:    constants.RefreshTokenExpired,
			})
			return
		}

		result, err := queries.RevokeRefreshToken(ctx, db.RevokeRefreshTokenParams{
			SessionID: sessionID,
			TokenHash: tokenHash,
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
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

		user, err := queries.GetUserByID(ctx, dbToken.UserID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		// generate new access token
		accessClaims := jwt.MapClaims{
			"user_id": user.ID,
			"role":    user.Role,
			"exp":     time.Now().Add(15 * time.Minute).Unix(),
		}
		newAccessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
		newAccessTokenString, err := newAccessToken.SignedString([]byte(cfg.JWTAccessSecret))
		if err != nil {
			slog.Error("failed to generate access token", "error", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		// generate new refresh token
		refreshClaims := jwt.MapClaims{
			"user_id":    user.ID,
			"session_id": sessionID,
			"exp":        time.Now().Add(30 * 24 * time.Hour).Unix(),
		}
		newRefreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
		newRefreshTokenString, err := newRefreshToken.SignedString([]byte(cfg.JWTRefreshSecret))

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		// save new refresh token hash to DB
		newHash := sha256.Sum256([]byte(newRefreshTokenString))
		newTokenHash := fmt.Sprintf("%x", newHash)

		_, err = queries.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
			UserID:    dbToken.UserID,
			TokenHash: newTokenHash,
			ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(30 * 24 * time.Hour), Valid: true},
			SessionID: sessionID,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}
		// set new cookies
		utils.SetAuthCookie(c, "access_token", newAccessTokenString, 15*60, cfg)
		utils.SetAuthCookie(c, "refresh_token", newRefreshTokenString, 30*24*60*60, cfg)

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Tokens refreshed.",
		})
	}
}
