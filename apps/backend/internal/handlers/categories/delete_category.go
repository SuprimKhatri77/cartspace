package categoryHandler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
)

func DeleteCategory(queries repository.CategoryRepository, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		categoryID, err := utils.ConvertToUUID(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid category ID",
			})
			return
		}

		result, err := queries.DeleteCategory(ctx, categoryID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to delete category",
			})
			return
		}

		if result.RowsAffected() == 0 {
			c.JSON(http.StatusNotFound, types.APIResponse{
				Success: false,
				Message: "Category not found",
			})
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Category deleted",
		})
	}
}
