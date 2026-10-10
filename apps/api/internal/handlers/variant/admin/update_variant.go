package admin

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/httpx"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

// UpdateProductVariant replaces a variant's stock, images, prices and flags.
// Its SKU and option combination are fixed at creation.
func UpdateProductVariant(queries repository.VariantRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		productID, variantID, ok := variantIDs(c)
		if !ok {
			return
		}

		req, ok := validator.BindJSON[types.UpdateProductVariant](c)
		if !ok {
			return
		}

		updated, err := queries.UpdateVariant(c.Request.Context(), db.UpdateVariantParams{
			ID:             variantID,
			ProductID:      productID,
			Stock:          int32(*req.Stock),
			Images:         req.Images,
			ImagePublicIds: req.ImagePublicIDs,
			SellingPrice:   int32(req.SellingPrice),
			OfferPrice:     toOfferPrice(req.OfferPrice),
			IsDefault:      *req.IsDefault,
			IsActive:       *req.IsActive,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				httpx.Fail(c, http.StatusNotFound, constants.VariantNotFound, "Variant not found")
				return
			}
			writeVariantError(c, err, "failed to update variant")
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Variant updated",
			Data:    updated,
		})
	}
}
