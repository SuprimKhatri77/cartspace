package authHandler_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	authHandler "github.com/suprimkhatri77/cartspace/backend/internal/handlers/auth"
)

func TestRefreshToken_Success(t *testing.T) {
	repo := &mockAuthRepo{
		getRefreshTokenFn: func(_ context.Context, _ string) (db.RefreshToken, error) {
			return fakeRefreshToken(), nil
		},
		createRefreshTokenFn: func(_ context.Context, _ db.CreateRefreshTokenParams) (db.RefreshToken, error) {
			return db.RefreshToken{
				TokenHash: generateRefreshToken("550e8400-e29b-41d4-a716-44665544"),
			}, nil
		},

		deleteRefreshTokenFn: func(_ context.Context, _ string) error {
			return nil
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/auth/refresh", authHandler.RefreshAccessToken(repo, testConfig()))
	})

	req := makeRequestWithCookie(t, "POST", "/auth/refresh", nil, "refresh_token", generateRefreshToken("550e8400-e29b-41d4-a716-44665544"))

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestRefreshToken_InvalidToken(t *testing.T) {
	repo := &mockAuthRepo{}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/auth/refresh", authHandler.RefreshAccessToken(repo, testConfig()))
	})

	req := makeRequestWithCookie(t, "POST", "/auth/refresh", nil, "refresh_token", "invalid_refresh_token")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRefreshToken_NotFound(t *testing.T) {
	repo := &mockAuthRepo{
		getRefreshTokenFn: func(_ context.Context, _ string) (db.RefreshToken, error) {
			return db.RefreshToken{}, fmt.Errorf("Refresh token not found")
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/auth/refresh", authHandler.RefreshAccessToken(repo, testConfig()))
	})

	req := makeRequestWithCookie(t, "POST", "/auth/refresh", nil, "refresh_token", generateRefreshToken("550e8400-e29b-41d4-a716-44665544"))

	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}
