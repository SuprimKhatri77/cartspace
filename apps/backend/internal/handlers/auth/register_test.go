package authHandler_test

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	authHandler "github.com/suprimkhatri77/cartspace/backend/internal/handlers/auth"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

func TestRegisterUser_Success(t *testing.T) {
	repo := &mockAuthRepo{
		createUserFn: func(_ context.Context, _ db.CreateUserParams) (db.User, error) {
			return fakeUser(), nil
		},
		createRefreshTokenFn: func(_ context.Context, _ db.CreateRefreshTokenParams) (db.RefreshToken, error) {
			return db.RefreshToken{
				ExpiresAt: pgtype.Timestamptz{Valid: true},
			}, nil
		},
	}
	router := setupRouter(func(r *gin.Engine) {
		r.POST("/auth/register", authHandler.RegisterUser(repo, testConfig()))
	})

	w := makeRequest(t, router, "POST", "/auth/registers", map[string]string{
		"name":     "Suprim",
		"email":    "suprim@example.com",
		"password": "secret123",
	})

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}

	var resp types.APIResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if !resp.Success {
		t.Errorf("expected success=true, got false")
	}

	// cookies must be set
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
		t.Error("access_token cookie not set")
	}
	if !hasRefresh {
		t.Error("refresh_token cookie not set")
	}
}

func TestRegisterUser_DuplicateEmail(t *testing.T) {
	repo := &mockAuthRepo{
		createUserFn: func(_ context.Context, _ db.CreateUserParams) (db.User, error) {

			return db.User{}, &pgconn.PgError{Code: "23505"}
		},
	}
	router := setupRouter(func(r *gin.Engine) {
		r.POST("/auth/register", authHandler.RegisterUser(repo, testConfig()))
	})

	w := makeRequest(t, router, "POST", "/auth/register", map[string]string{
		"name":     "Suprim",
		"email":    "suprim@example.com",
		"password": "secret123",
	})

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}

	var resp types.APIResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Message != "User already exists." {
		t.Errorf("unexpected message: %s", resp.Message)
	}
}

func TestRegisterUser_InvalidBody(t *testing.T) {
	repo := &mockAuthRepo{} // DB never called — handler should bail early

	router := setupRouter(func(r *gin.Engine) {
		r.POST("/auth/register", authHandler.RegisterUser(repo, testConfig()))
	})

	w := makeRequest(t, router, "POST", "/auth/register", map[string]string{
		"email": "not-an-email", // missing name + password, bad email
	})

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}
