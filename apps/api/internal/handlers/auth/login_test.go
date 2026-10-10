package authHandler_test

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	authHandler "github.com/suprimkhatri77/cartspace/backend/internal/handlers/auth"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

/*
	Potential errors in login
		1. Binding JSON
		2. User not found
		3. Wrong password
		4. Access and refresh token setting in the cookie

	Finally the successful execution code
*/

func TestLoginUser_Success(t *testing.T) {
	repo := &mockAuthRepo{
		getUserByEmailFn: func(_ context.Context, _ string) (db.User, error) {
			return fakeUser(), nil
		},
		createRefreshTokenFn: func(_ context.Context, _ db.CreateRefreshTokenParams) (db.RefreshToken, error) {
			return db.RefreshToken{}, nil
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/auth/login", authHandler.LoginUser(repo, testConfig()))
	})

	w := makeRequest(t, router, "POST", "/auth/login", map[string]string{
		"email":    "suprim@example.com",
		"password": "secret123",
	})

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d - body: %s", w.Code, w.Body.String())
	}

	var resp types.APIResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarsahl response: %v", err)
	}

	if !resp.Success {
		t.Errorf("expected succcess=true, got false")
	}

	cookies := w.Result().Cookies()
	var hasAccess, hasRefresh bool
	for _, c := range cookies {
		if c.Name == "access_token" {
			hasAccess = true
		}

		if c.Name == "refresh_token" {
			hasRefresh = true
		}
	}

	if !hasAccess {
		t.Errorf("access_token cookie not set")
	}
	if !hasRefresh {
		t.Errorf("refresh_token cookie not set")
	}
}

func TestLoginUser_WrongPassword(t *testing.T) {
	repo := &mockAuthRepo{
		getUserByEmailFn: func(_ context.Context, _ string) (db.User, error) {
			return fakeUser(), nil
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/auth/login", authHandler.LoginUser(repo, testConfig()))
	})

	w := makeRequest(t, router, "POST", "/auth/login", map[string]string{
		"email":    "suprim@example.com",
		"password": "wrongpassword",
	})

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}

}

func TestLoginUser_UserNotFound(t *testing.T) {
	repo := &mockAuthRepo{
		getUserByEmailFn: func(_ context.Context, _ string) (db.User, error) {
			return db.User{}, pgx.ErrNoRows
		},
	}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/auth/login", authHandler.LoginUser(repo, testConfig()))
	})

	w := makeRequest(t, router, "POST", "/auth/login", map[string]string{
		"email":    "suprim@gmail.com",
		"password": "secret123",
	})

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestLoginUser_InvalidBody(t *testing.T) {
	repo := &mockAuthRepo{}

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/auth/login", authHandler.LoginUser(repo, testConfig()))
	})

	w := makeRequest(t, router, "POST", "/auth/login", map[string]string{
		"email": "invalid-email",
	})

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}

}
