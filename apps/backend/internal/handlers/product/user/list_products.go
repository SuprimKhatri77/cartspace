package user

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

const PAGE_LIMIT int64 = 20

// this hanlder is to list products on the homepage with default variant's SP and OP
func ListProducts(queries repository.ProductRepository) gin.HandlerFunc {
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
				Message: "Invalid page number",
				Code:    constants.InvalidPageParam,
			})
			return
		}

		total, err := queries.GetProductsCount(ctx)

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to fetch products",
				Code:    constants.InternalServerError,
			})
			return
		}

		if total == 0 {
			c.JSON(http.StatusOK, types.APIResponse{
				Success: true,
				Message: "No products found",
				Data:    []db.ListActiveProductsRow{},
			})
			return
		}
		pageCount := (total + PAGE_LIMIT - 1) / PAGE_LIMIT

		if int64(page) > pageCount {
			page = int(pageCount)
		}

		offset := PAGE_LIMIT * int64(page-1)

		products, err := queries.ListActiveProducts(ctx, db.ListActiveProductsParams{
			Limit:  int32(PAGE_LIMIT),
			Offset: int32(offset),
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to fetch products",
				Code:    constants.InternalServerError,
			})
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Products fetched",
			Data:    products,
		})

	}
}
