package routes

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	dbgen "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	authHandler "github.com/suprimkhatri77/cartspace/backend/internal/handlers/auth"
	categoryHandler "github.com/suprimkhatri77/cartspace/backend/internal/handlers/category"
	productHandler "github.com/suprimkhatri77/cartspace/backend/internal/handlers/product/admin"
	userProduct "github.com/suprimkhatri77/cartspace/backend/internal/handlers/product/user"
	"github.com/suprimkhatri77/cartspace/backend/internal/middleware"
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
	admin := api.Group("/admin", middleware.RequireAdmin(cfg.Config))

	adminCategory := admin.Group("/categories")
	adminCategory.POST("", categoryHandler.CreateCategory(cfg.Queries))
	adminCategory.PUT("/:id", categoryHandler.UpdateCategory(cfg.Queries))
	adminCategory.DELETE("/:id", categoryHandler.DeleteCategory(cfg.Queries))
	adminCategory.GET("", categoryHandler.GetPaginatedCategories(cfg.Queries))

	adminProduct := admin.Group("/products")
	adminProduct.POST("", productHandler.CreateProduct(cfg.Queries))
	adminProduct.PUT("/:productID", productHandler.UpdateProduct(cfg.Queries))
	adminProduct.DELETE("/:productID", productHandler.DeleteProduct(cfg.Queries))
	// adminProduct.GET("", productHandler.AdminListProducts(cfg.Queries))

	// user facing - public
	products := api.Group("/products")
	products.GET("", userProduct.ListProducts(cfg.Queries))
	products.GET("/:productID", productHandler.GetProductByID(cfg.Queries))

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
