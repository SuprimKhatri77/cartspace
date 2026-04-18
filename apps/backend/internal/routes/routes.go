package routes

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	dbgen "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	authHandler "github.com/suprimkhatri77/cartspace/backend/internal/handlers/auth"
	adminCategory "github.com/suprimkhatri77/cartspace/backend/internal/handlers/category/admin"
	adminProduct "github.com/suprimkhatri77/cartspace/backend/internal/handlers/product/admin"
	userProduct "github.com/suprimkhatri77/cartspace/backend/internal/handlers/product/user"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/cloudinary"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

// Config holds dependencies for route setup.
type Config struct {
	OpenAPIPath string // path to openapi.json file
	Queries     *dbgen.Queries
	Config      *config.Config
	CldClient   *cloudinary.Client
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
			c.JSON(http.StatusInternalServerError, types.APIResponse{Success: false, Message: "openapi spec not found"})
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
	api := r.Group("/api/v1")

	// auth - public
	auth := api.Group("/auth")
	auth.POST("/register", authHandler.RegisterUser(cfg.Queries, cfg.Config))
	auth.POST("/login", authHandler.LoginUser(cfg.Queries, cfg.Config))
	auth.POST("/logout", authHandler.Logout(cfg.Queries, cfg.Config))
	auth.POST("/refresh", authHandler.RefreshAccessToken(cfg.Queries, cfg.Config))

	// admin routes
	/*
		actual shape for later:
		       admin := api.Group("/admin", middleware.RequireAuth(cfg.Config), middleware.RequireAdmin)
	*/
	admin := api.Group("/admin")

	// routes
	adminCategoryRoutes := admin.Group("/categories")
	adminCategoryRoutes.POST("", adminCategory.CreateCategory(cfg.Queries))
	adminCategoryRoutes.PUT("/:id", adminCategory.UpdateCategory(cfg.Queries))
	adminCategoryRoutes.DELETE("/:id", adminCategory.DeleteCategory(cfg.Queries))
	adminCategoryRoutes.GET("", adminCategory.GetPaginatedCategories(cfg.Queries))

	adminProductRoutes := admin.Group("/products")
	adminProductRoutes.POST("", adminProduct.CreateProduct(cfg.Queries))
	adminProductRoutes.PUT("/:productID", adminProduct.UpdateProduct(cfg.Queries))
	adminProductRoutes.DELETE("/:productID", adminProduct.DeleteProduct(cfg.Queries))
	adminProductRoutes.GET("", adminProduct.GetPaginatedProducts(cfg.Queries))

	userProductRoutes := api.Group("/products")
	userProductRoutes.GET("", userProduct.ListProducts(cfg.Queries))

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
