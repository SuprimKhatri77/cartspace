package authHandler

import (
	"crypto/sha256"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
	"golang.org/x/crypto/bcrypt"
)

func LoginUser(queries repository.AuthRepository, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var requestBody types.LoginRequest

		if err := c.ShouldBindJSON(&requestBody); err != nil {
			log.Println("error from binding json: ", err)
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid request data",
				Errors:  validator.Parse(err, requestBody),
				Code:    constants.ValidationFailed,
			})
			return
		}

		user, err := queries.GetUserByEmail(ctx, requestBody.Email)

		if err != nil {
			log.Println("error from getting user by email: ", err)

			if errors.Is(err, pgx.ErrNoRows) {
				c.JSON(http.StatusUnauthorized, types.APIResponse{
					Success: false,
					Message: "Invalid credentials",
					Code:    constants.InvalidCredentials,
				})
				return
			}
			// intentionally vague don't want to reveal whether the email exists or not
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Invalid credentials",
				Code:    constants.InvalidCredentials,
			})
			return
		}

		// bcrypt re-hashes the plain password using the salt embedded in user.PasswordHash,
		// then compares we never store or compare plain text passwords directly
		err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(requestBody.Password))
		if err != nil {
			log.Println("error from comparing password: ", err)
			// same vague message as above don't hint which field was wrong
			c.JSON(http.StatusUnauthorized, types.APIResponse{
				Success: false,
				Message: "Invalid credentials",
				Code:    constants.InvalidCredentials,
			})
			return
		}

		accessClaims := jwt.MapClaims{
			"user_id": user.ID,
			"role":    user.Role,
			"exp":     time.Now().Add(15 * time.Minute).Unix(),
		}

		accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
		accessTokenString, err := accessToken.SignedString([]byte(cfg.JWTAccessSecret))
		if err != nil {
			log.Println("error from signing access token: ", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		sessionID := uuid.New()

		// embed user identity + expiry into the token payload (claims = JWT body)
		refreshTokenClaims := jwt.MapClaims{
			"user_id":    user.ID,
			"session_id": sessionID,
			// exp must be a Unix timestamp (seconds); JWT spec requires this format
			"exp": time.Now().Add(30 * 24 * time.Hour).Unix(),
		}

		// build the unsigned token object in memory using HMAC-SHA256
		refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshTokenClaims)

		// sign the token with our secret — produces the final "xxxxx.yyyyy.zzzzz" string
		refreshTokenString, err := refreshToken.SignedString([]byte(cfg.JWTRefreshSecret))

		if err != nil {
			log.Println("error from signing token: ", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		hash := sha256.Sum256([]byte(refreshTokenString))
		tokenHash := fmt.Sprintf("%x", hash)

		expiresAt := pgtype.Timestamptz{
			Time:  time.Now().Add(30 * 24 * time.Hour),
			Valid: true,
		}

		_, err = queries.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
			UserID:    user.ID,
			TokenHash: tokenHash,
			ExpiresAt: expiresAt,
			SessionID: pgtype.UUID{Bytes: sessionID, Valid: true},
		})

		if err != nil {
			log.Println("error while storing the refresh token: ", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Something went wrong.",
				Code:    constants.InternalServerError,
			})
			return
		}

		utils.SetAuthCookie(c, "access_token", accessTokenString, 15*60, cfg)
		utils.SetAuthCookie(c, "refresh_token", refreshTokenString, 30*24*60*60, cfg)

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "User logged in successfully.",
		})
	}
}
