package categoryHandler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

func GetPaginatedCategories(queries repository.CategoryRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
		if err != nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid page parameter",
			})
			return
		}

		if page <= 0 {
			page = 1
		}

		total, err := queries.GetCategoriesCount(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
			})

			return
		}

		if total == 0 {
			c.JSON(http.StatusOK, types.APIResponse{
				Success: true,
				Message: "No categories found",
				Data:    []db.Category{},
			})
			return
		}

		totalPages := (total + 20 - 1) / 20

		if page > int(totalPages) {
			page = int(totalPages)
		}

		const pageSize = 20

		offset := (page - 1) * pageSize

		categories, err := queries.GetPaginatedCategories(ctx, db.GetPaginatedCategoriesParams{
			Limit:  20,
			Offset: int32(offset),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
			})
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Categories fetched",
			Data:    categories,
		})

	}
}
