package routes

import (
	"github.com/gin-gonic/gin"

	authHandler "github.com/suprimkhatri77/cartspace/backend/internal/handlers/auth"
	"github.com/suprimkhatri77/cartspace/backend/internal/routes/config"
)

func setupAuthRoutes(router *gin.RouterGroup, cfg config.Config) {
	auth := router.Group("/auth")
	auth.POST("/register", authHandler.RegisterUser(cfg.Queries, cfg.Config))
	auth.POST("/login", authHandler.LoginUser(cfg.Queries, cfg.Config))
	auth.POST("/logout", authHandler.Logout(cfg.Queries, cfg.Config))
	auth.POST("/refresh", authHandler.RefreshAccessToken(cfg.Queries, cfg.Config))
}
