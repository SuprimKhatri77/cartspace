package admin

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

const pageLimit int64 = 20

func GetPaginatedCategories(queries repository.CategoryRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
		if err != nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid page parameter",
				Code:    constants.InvalidPageParam,
			})
			return
		}

		if page <= 0 {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid page parameter",
				Code:    constants.InvalidPageParam,
			})

			return
		}

		total, err := queries.GetCategoriesCount(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})

			return
		}

		if total == 0 {
			c.JSON(http.StatusOK, types.APIResponse{
				Success: true,
				Message: "No categories found",
				Data:    []db.Category{},
				Meta:    types.NewPaginationMeta(total, page, pageLimit),
			})
			return
		}

		totalPages := (total + pageLimit - 1) / pageLimit

		if page > int(totalPages) {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid page parameter",
				Code:    constants.InvalidPageParam,
			})
			return
		}

		offset := (page - 1) * int(pageLimit)

		categories, err := queries.GetPaginatedCategories(ctx, db.GetPaginatedCategoriesParams{
			Limit:  int32(pageLimit),
			Offset: int32(offset),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Data:    categories,
			Meta:    types.NewPaginationMeta(total, page, pageLimit),
		})

	}
}
