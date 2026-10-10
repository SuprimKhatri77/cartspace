package routes

import (
	"github.com/gin-gonic/gin"

	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	"github.com/suprimkhatri77/cartspace/backend/internal/handlers/admin"
	"github.com/suprimkhatri77/cartspace/backend/internal/middleware"
	"github.com/suprimkhatri77/cartspace/backend/internal/routes/config"
)

func setupAdminRoutes(router *gin.RouterGroup, cfg config.Config) {
	group := router.Group("/admin", middleware.RequireAuth(cfg.Config), middleware.RequireRole(constants.RoleAdmin))
	group.GET("/stats", admin.GetStats(cfg.Queries))
	group.POST("/uploads/signature", admin.SignUpload(cfg.CldClient))
}
