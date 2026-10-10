package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/httpx"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
)

// DeleteProduct deletes a product; its variants, options and cart items go
// with it (ON DELETE CASCADE).
func DeleteProduct(queries repository.ProductRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		productID, ok := httpx.PathUUID(c, "productID", constants.InvalidProductID, "product ID")
		if !ok {
			return
		}

		result, err := queries.DeleteProduct(c.Request.Context(), productID)
		if err != nil {
			httpx.Internal(c, "failed to delete product", err, "product_id", productID)
			return
		}

		if result.RowsAffected() == 0 {
			httpx.Fail(c, http.StatusNotFound, constants.ProductNotFound, "Product not found")
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Product deleted",
		})
	}
}
