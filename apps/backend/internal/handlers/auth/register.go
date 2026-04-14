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
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
	"golang.org/x/crypto/bcrypt"
)

func RegisterUser(queries repository.AuthRepository, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		/*
			the context shouldn't be empty
			initially i had done:
			   var ctx context.Context it was nil , so i got error
			we have two options:
			 1. ctx := context.Background()
			 2. ctx := c.Request.Context()
		*/
		ctx := c.Request.Context()

		var registerRequest types.RegisterRequest

		if err := c.ShouldBindJSON(&registerRequest); err != nil {
			slog.Error("Couldn't bind the request body", "error", err)

			c.JSON(http.StatusBadRequest, types.APIResponse{Success: false, Message: "Invalid request body.", Errors: validator.Parse(err, registerRequest)})
			return
		}

		utils.TrimStruct(&registerRequest, "Password")

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(registerRequest.Password), bcrypt.DefaultCost)

		if err != nil {
			slog.Error("Failed to hash the password", "error", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Message: "Failed to hash the password."})
			return
		}

		user, err := queries.CreateUser(ctx, db.CreateUserParams{
			Name:         registerRequest.Name,
			Email:        registerRequest.Email,
			PasswordHash: string(hashedPassword),
			Role:         "customer",
		})

		if err != nil {
			slog.Error("Failed to create user", "error", err)
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				c.JSON(http.StatusConflict, types.APIResponse{Success: false, Message: "User already exists."})
				return

			}
			c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Message: "Failed to create user."})
			return
		}

		accessClaims := jwt.MapClaims{
			"user_id": user.ID,
			"email":   user.Email,
			"role":    user.Role,
			"exp":     time.Now().Add(15 * time.Minute).Unix(),
		}

		accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
		accessTokenString, err := accessToken.SignedString([]byte(cfg.JWTAccessSecret))

		if err != nil {
			slog.Error("failed to sign refresh token", "error", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Message: "Failed to sign access token."})
			return
		}

		// embed user identity + expiry into the token payload (claims = JWT body)
		refreshTokenClaims := jwt.MapClaims{
			"user_id": user.ID,
			// exp must be a Unix timestamp (seconds); JWT spec requires this format
			"exp": time.Now().Add(7 * time.Hour).Unix(),
		}

		// build the unsigned token object in memory using HMAC-SHA256
		refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshTokenClaims)

		// sign the token with our secret — produces the final "xxxxx.yyyyy.zzzzz" string
		// the signature prevents clients from tampering with the claims
		refreshTokenString, err := refreshToken.SignedString([]byte(cfg.JWTRefreshSecret))

		if err != nil {
			slog.Error("failed to sign refresh token", "error", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Message: "Failed to sign token."})
			return
		}
		// converting the expiry time to proper pgtype.Timestamptz
		expiresAt := pgtype.Timestamptz{
			Time:  time.Now().Add(30 * 24 * time.Hour),
			Valid: true,
		}

		// hashing the refresh token
		hash := sha256.Sum256([]byte(refreshTokenString))
		tokenHash := fmt.Sprintf("%x", hash)

		_, err = queries.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{UserID: user.ID, TokenHash: tokenHash, ExpiresAt: expiresAt})
		if err != nil {
			slog.Error("failed to store refresh token in db", "error", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Message: "Failed to create refresh token."})
			return
		}

		c.SetCookie("access_token", accessTokenString, 15*60, "/", "", true, true)
		c.SetCookie("refresh_token", refreshTokenString, 30*24*60*60, "/auth", "", true, true)
		c.JSON(http.StatusOK, types.APIResponse{Success: true, Message: "User created successfully."})
	}
}
