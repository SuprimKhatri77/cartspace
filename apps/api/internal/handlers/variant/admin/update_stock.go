package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/httpx"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

// UpdateVariantStock is not routed yet; it is redesigned in phase 6
// (it adds a delta instead of setting the stock, and is not product-scoped).
func UpdateVariantStock(queries repository.VariantRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		variantID, ok := httpx.PathUUID(c, "variantID", constants.InvalidVariantID, "variant ID")
		if !ok {
			return
		}

		req, ok := validator.BindJSON[types.UpdateStock](c)
		if !ok {
			return
		}

		updatedStock, err := queries.UpdateVariantStock(ctx, db.UpdateVariantStockParams{
			ID:    variantID,
			Delta: int32(req.Stock),
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to update stock",
				Code:    constants.InternalServerError,
			})
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Stock updated",
			Data:    updatedStock,
		})
	}
}
