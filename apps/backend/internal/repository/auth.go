package repository

import (
	"context"

	dbgen "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
)

// AuthRepository defines only the DB methods auth handlers need.
// Real impl uses *dbgen.Queries; tests use a mock.
type AuthRepository interface {
	CreateUser(ctx context.Context, params dbgen.CreateUserParams) (dbgen.User, error)
	CreateRefreshToken(ctx context.Context, params dbgen.CreateRefreshTokenParams) (dbgen.RefreshToken, error)
	GetUserByEmail(ctx context.Context, email string) (dbgen.User, error)
	DeleteRefreshToken(ctx context.Context, tokenHash string) error
	GetRefreshToken(ctx context.Context, tokenHash string) (dbgen.RefreshToken, error)
}
