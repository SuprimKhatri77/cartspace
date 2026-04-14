package routes

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	dbgen "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	authHandler "github.com/suprimkhatri77/cartspace/backend/internal/handlers/auth"
	categoryHandler "github.com/suprimkhatri77/cartspace/backend/internal/handlers/categories"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

// Config holds dependencies for route setup.
type Config struct {
	OpenAPIPath string // path to openapi.json file
	Queries     *dbgen.Queries
	Config      *config.Config
}

// Setup attaches all routes to the given engine.
func Setup(r *gin.Engine, cfg Config) {

	// OpenAPI spec (from generated file)
	r.GET("/openapi.json", func(c *gin.Context) {
		if cfg.OpenAPIPath == "" {
			c.Status(http.StatusNotFound)
			return
		}
		data, err := os.ReadFile(cfg.OpenAPIPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "openapi spec not found"})
			return
		}
		c.Data(http.StatusOK, "application/json", data)
	})

	// Scalar API docs UI
	r.GET("/docs", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/docs/")
	})
	r.GET("/docs/", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, scalarHTML)
	})

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Welcome to the Cartspace API",
		})
	})

	// auth routes
	authRoutes := r.Group("/api/auth")
	authRoutes.POST("/register", authHandler.RegisterUser(cfg.Queries, cfg.Config))
	authRoutes.POST("/login", authHandler.LoginUser(cfg.Queries, cfg.Config))
	authRoutes.POST("/logout", authHandler.Logout(cfg.Queries, cfg.Config))
	authRoutes.POST("/refresh", authHandler.RefreshAccessToken(cfg.Queries, cfg.Config))

	// category routes
	categoryRoutes := r.Group("/api/category")
	categoryRoutes.POST("", categoryHandler.CreateCategory(cfg.Queries, cfg.Config))
	categoryRoutes.PUT("/:id", categoryHandler.UpdateCategory(cfg.Queries, cfg.Config))
	categoryRoutes.DELETE("/:id", categoryHandler.DeleteCategory(cfg.Queries, cfg.Config))
	categoryRoutes.GET("", categoryHandler.GetPaginatedCategories(cfg.Queries, cfg.Config))

}

// scalarHTML is the Scalar API docs page that loads /openapi.json.
const scalarHTML = `<!DOCTYPE html>
<html>
<head>
  <title>API Docs</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="https://cdn.jsdelivr.net/npm/@scalar/api-reference/favicon.ico" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@scalar/api-reference/style.css" />
</head>
<body>
  <script id="api-reference" data-url="/openapi.json"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>
`
