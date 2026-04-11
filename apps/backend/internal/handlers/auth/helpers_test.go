package authHandler_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	dbgen "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
	"golang.org/x/crypto/bcrypt"
)

type mockAuthRepo struct {
	createUserFn         func(ctx context.Context, params dbgen.CreateUserParams) (dbgen.User, error)
	createRefreshTokenFn func(ctx context.Context, params dbgen.CreateRefreshTokenParams) (dbgen.RefreshToken, error)

	getUserByEmailFn     func(ctx context.Context, email string) (dbgen.User, error)
	deleteRefreshTokenFn func(ctx context.Context, tokenHash string) error

	getRefreshTokenFn func(ctx context.Context, tokenHash string) (dbgen.RefreshToken, error)
}

func (m *mockAuthRepo) CreateUser(ctx context.Context, params dbgen.CreateUserParams) (dbgen.User, error) {
	return m.createUserFn(ctx, params)
}

func (m *mockAuthRepo) CreateRefreshToken(ctx context.Context, params dbgen.CreateRefreshTokenParams) (dbgen.RefreshToken, error) {
	return m.createRefreshTokenFn(ctx, params)
}

func (m *mockAuthRepo) GetUserByEmail(ctx context.Context, email string) (dbgen.User, error) {
	return m.getUserByEmailFn(ctx, email)
}

func (m *mockAuthRepo) DeleteRefreshToken(ctx context.Context, tokenHash string) error {
	return m.deleteRefreshTokenFn(ctx, tokenHash)
}

func (m *mockAuthRepo) GetRefreshToken(ctx context.Context, tokenHash string) (dbgen.RefreshToken, error) {
	return m.getRefreshTokenFn(ctx, tokenHash)
}

func testConfig() *config.Config {
	return &config.Config{
		JWTRefreshSecret: "test-refresh-secret",
		JWTAccessSecret:  "test-access-secret",
	}
}

func generateRefreshToken(userID string) string {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(7 * 24 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte("test-refresh-secret"))

	return signed
}

func fakeUser() dbgen.User {
	idStr := "550e8400-e29b-41d4-a716-446655440000"
	hash, _ := bcrypt.GenerateFromPassword([]byte("secret123"), bcrypt.DefaultCost)

	var userID pgtype.UUID

	if err := userID.Scan(idStr); err != nil {
		slog.Error("Invalid user id format")
	}

	return dbgen.User{
		ID:           userID,
		Name:         "suprim",
		Email:        "suprim@example.com",
		PasswordHash: string(hash),
		Role:         "customer",
	}
}

func fakeRefreshToken() dbgen.RefreshToken {
	userIDStr := "550e8400-e29b-41d4-a716-446655440000"
	idStr := "770e7700-e29b-41d4-a716-446655440000"

	token := generateRefreshToken(userIDStr)
	tokenHash := sha256.Sum256([]byte(token))
	var id pgtype.UUID

	var userID pgtype.UUID

	if err := userID.Scan(userIDStr); err != nil {
		slog.Error("Invalid user id format")
	}

	if err := id.Scan(idStr); err != nil {
		slog.Error("invalid id format")
	}
	return dbgen.RefreshToken{
		ID:        id,
		TokenHash: fmt.Sprintf("%x", tokenHash),
		UserID:    userID,
		ExpiresAt: pgtype.Timestamptz{
			Time:  time.Now().Add(30 * 24 * time.Hour),
			Valid: true,
		},
	}
}

func setupRouter(register func(r *gin.Engine)) *gin.Engine {
	gin.SetMode(gin.TestMode)
	validator.Init()

	r := gin.New()
	register(r)

	return r
}

func makeRequest(t *testing.T, router *gin.Engine, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()

	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal body: %v", err)
	}

	req := httptest.NewRequest(method, path, bytes.NewBuffer(raw))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	return w

}

func makeRequestWithCookie(t *testing.T, method, path string, body any, cookieName, cookieValue string) *http.Request {
	t.Helper()

	var buf *bytes.Buffer
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
		buf = bytes.NewBuffer(raw)
	} else {
		buf = bytes.NewBuffer(nil)
	}

	req := httptest.NewRequest(method, path, buf)
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{
		Name:  cookieName,
		Value: cookieValue,
	})
	return req
}
