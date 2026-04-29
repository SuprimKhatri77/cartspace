package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
)

// AuthRepository defines only the DB methods auth handlers need.
// Real impl uses *db.Queries; tests use a mock.
type AuthRepository interface {
	CreateUser(ctx context.Context, params db.CreateUserParams) (db.User, error)
	CreateRefreshToken(ctx context.Context, params db.CreateRefreshTokenParams) (db.RefreshToken, error)
	GetUserByEmail(ctx context.Context, email string) (db.User, error)
	GetRefreshToken(ctx context.Context, params db.GetRefreshTokenParams) (db.RefreshToken, error)
	GetUserByID(ctx context.Context, id pgtype.UUID) (db.User, error)
	RevokeRefreshToken(ctx context.Context, param db.RevokeRefreshTokenParams) (pgconn.CommandTag, error)
}
