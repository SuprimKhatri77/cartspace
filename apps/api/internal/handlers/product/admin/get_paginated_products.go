package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/httpx"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

// GetPaginatedProducts lists every product (active or not) for the admin table.
func GetPaginatedProducts(queries repository.ProductRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		page, ok := httpx.ParsePage(c)
		if !ok {
			return
		}

		total, err := queries.GetProductsCount(ctx)
		if err != nil {
			httpx.Internal(c, "failed to count products", err)
			return
		}

		if !httpx.CheckPageInRange(c, page, total, pageLimit) {
			return
		}

		products := []db.AdminProductsListRow{}
		if total > 0 {
			products, err = queries.AdminProductsList(ctx, db.AdminProductsListParams{
				Limit:  int32(pageLimit),
				Offset: httpx.Offset(page, pageLimit),
			})
			if err != nil {
				httpx.Internal(c, "failed to list products", err)
				return
			}
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Products fetched",
			Data:    products,
			Meta:    types.NewPaginationMeta(total, page, pageLimit),
		})
	}
}
