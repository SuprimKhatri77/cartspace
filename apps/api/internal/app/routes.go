package app

import (
	"github.com/gin-gonic/gin"

	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	"github.com/suprimkhatri77/cartspace/backend/internal/database"
	dbgen "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/middleware"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/cloudinary"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/routes"
	routesconfig "github.com/suprimkhatri77/cartspace/backend/internal/routes/config"
)

func buildRouter(
	cfg *config.Config,
	queries *dbgen.Queries,
	cld *cloudinary.Client,
	db *database.DB,
) *gin.Engine {
	r := gin.New()
	r.Use(middleware.Recovery())
	r.Use(gin.Logger())
	r.Use(middleware.CORS(cfg))

	routes.Setup(r, routesconfig.Config{
		Config:      cfg,
		Queries:     queries,
		CldClient:   cld,
		PgxPool:     db.Pool,
		VariantRepo: repository.NewVariantRepository(queries),
		CartRepo:    repository.NewCartRepository(queries),
	})
	return r
}
