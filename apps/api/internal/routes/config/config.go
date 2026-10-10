package config

import (
	"github.com/jackc/pgx/v5/pgxpool"

	appconfig "github.com/suprimkhatri77/cartspace/backend/internal/config"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/cloudinary"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
)

// Config holds the dependencies route handlers are built from.
type Config struct {
	Config      *appconfig.Config
	Queries     *db.Queries
	CldClient   *cloudinary.Client
	PgxPool     *pgxpool.Pool
	VariantRepo repository.VariantRepository
	CartRepo    repository.CartRepository
}
