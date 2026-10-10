package routes

import (
	"github.com/gin-gonic/gin"

	"github.com/suprimkhatri77/cartspace/backend/internal/handlers/cart"
	"github.com/suprimkhatri77/cartspace/backend/internal/middleware"
	"github.com/suprimkhatri77/cartspace/backend/internal/routes/config"
)

func setupCartRoutes(router *gin.RouterGroup, cfg config.Config) {
	carts := router.Group("/carts", middleware.RequireAuth(cfg.Config))
	carts.GET("", cart.GetUserCart(cfg.CartRepo))
	carts.POST("", cart.CreateCart(cfg.CartRepo, cfg.PgxPool))
	carts.DELETE("/:cartID", cart.ClearCartItems(cfg.CartRepo))
	carts.PATCH("/:cartID/:variantID", cart.UpdateQuantity(cfg.CartRepo))
}
