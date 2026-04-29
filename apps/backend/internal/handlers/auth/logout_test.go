package authHandler_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	authHandler "github.com/suprimkhatri77/cartspace/backend/internal/handlers/auth"
)

func TestLogout_Success(t *testing.T) {
	repo := &mockAuthRepo{
		revokeRefreshTokenFn: func(_ context.Context, _ db.RevokeRefreshTokenParams) (pgconn.CommandTag, error) {
			return pgconn.NewCommandTag("token revoked"), nil
		},
	}
	router := setupRouter(func(r *gin.Engine) {
		r.POST("/auth/logout", authHandler.Logout(repo, testConfig()))

	})

	req := makeRequestWithCookie(t, "POST", "/auth/logout", nil, "refresh_token", generateRefreshToken("550e8400-e29b-41d4-a716-446655440000"))

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}

}

func TestLogout_InvalidRefreshToken(t *testing.T) {
	repo := &mockAuthRepo{}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/auth/logout", authHandler.Logout(repo, testConfig()))
	})

	req := makeRequestWithCookie(t, "POST", "/auth/logout", nil, "refresh_token", "invalid_refresh_token")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}

}

func TestLogout_DeleteTokenFails(t *testing.T) {
	repo := &mockAuthRepo{
		revokeRefreshTokenFn: func(_ context.Context, _ db.RevokeRefreshTokenParams) (pgconn.CommandTag, error) {
			return pgconn.CommandTag{}, fmt.Errorf("db error")
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/auth/logout", authHandler.Logout(repo, testConfig()))
	})

	req := makeRequestWithCookie(t, "POST", "/auth/logout", nil, "refresh_token", generateRefreshToken("550e8400-e29b-41d4-a716-446655440000"))

	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}

}
