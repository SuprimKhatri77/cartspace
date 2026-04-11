package authHandler_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	authHandler "github.com/suprimkhatri77/cartspace/backend/internal/handlers/auth"
)

func TestLogout_Success(t *testing.T) {
	repo := &mockAuthRepo{
		deleteRefreshTokenFn: func(_ context.Context, _ string) error {
			return nil
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
		deleteRefreshTokenFn: func(_ context.Context, _ string) error {
			return fmt.Errorf("db error")
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
