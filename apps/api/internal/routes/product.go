package routes

import (
	"github.com/gin-gonic/gin"

	adminProduct "github.com/suprimkhatri77/cartspace/backend/internal/handlers/product/admin"
	userProduct "github.com/suprimkhatri77/cartspace/backend/internal/handlers/product/user"
	"github.com/suprimkhatri77/cartspace/backend/internal/middleware"
	"github.com/suprimkhatri77/cartspace/backend/internal/routes/config"
)

func setupProductRoutes(router *gin.RouterGroup, cfg config.Config) {
	admin := router.Group("/admin/products", middleware.RequireAuth(cfg.Config), middleware.RequireAdmin)
	admin.POST("", adminProduct.CreateProduct(cfg.Queries))
	admin.PUT("/:productID", adminProduct.UpdateProduct(cfg.Queries))
	admin.DELETE("/:productID", adminProduct.DeleteProduct(cfg.Queries))
	admin.GET("", adminProduct.GetPaginatedProducts(cfg.Queries))
	admin.GET("/:productID", adminProduct.GetProductByID(cfg.Queries))

	public := router.Group("/products")
	public.GET("", userProduct.ListProducts(cfg.Queries))
	public.GET("/:productSlug", userProduct.GetProduct(cfg.Queries))
}
