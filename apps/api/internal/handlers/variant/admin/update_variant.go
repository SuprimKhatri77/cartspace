package admin

import (
	"errors"
	"math"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/rlog"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

func UpdateProductVariant(queries repository.VariantRepository, pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		productIDFromParams := c.Param("productID")
		variantIDFromParams := c.Param("variantID")

		if productIDFromParams == "" {
			rlog.Warn(c, "missing product ID")
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Missing product ID",
				Code:    constants.MissingProductID,
			})
			return
		}

		if variantIDFromParams == "" {
			rlog.Warn(c, "missing variant ID")
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Missing variant ID",
				Code:    constants.MissingVariantID,
			})
			return
		}

		productID, err := utils.ConvertToUUID(productIDFromParams)
		if err != nil {
			rlog.Warn(c, "invalid product ID", "error", err, "productID", productIDFromParams)
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid product ID",
				Code:    constants.ValidationFailed,
			})
			return
		}

		variantID, err := utils.ConvertToUUID(variantIDFromParams)
		if err != nil {
			rlog.Warn(c, "invalid variant ID", "error", err, "variantID", variantIDFromParams)
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid variant ID",
				Code:    constants.ValidationFailed,
			})
			return
		}

		req, ok := validator.BindJSON[types.UpdateProductVariant](c)
		if !ok {
			return
		}

		if req.OfferPrice != 0 &&
			req.OfferPrice >= req.SellingPrice {

			rlog.Warn(c, "invalid offer price", "offerPrice", req.OfferPrice, "sellingPrice", req.SellingPrice)

			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Offer price must be less than selling price",
				Code:    constants.ValidationFailed,
				Errors: []types.AppError{
					{
						Code:    "INVALID_OFFER_PRICE",
						Field:   "offerPrice",
						Message: "Offer price must be less than selling price",
					},
				},
			})
			return
		}

		if len(req.ImagePublicIDs) != len(req.Images) {
			rlog.Warn(c, "image mismatch", "imagesCount", len(req.Images), "imagePublicIDsCount", len(req.ImagePublicIDs))

			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Images and image IDs must match",
				Code:    constants.ValidationFailed,
				Errors: []types.AppError{
					{
						Code:    constants.ValidationFailed,
						Field:   "images",
						Message: "Images and image IDs must match",
					},
				},
			})
			return
		}

		variant, err := queries.GetVariantByID(ctx, variantID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				rlog.Warn(c, "variant not found", "variantID", variantID)
				c.JSON(http.StatusNotFound, types.APIResponse{
					Success: false,
					Message: "Variant not found",
					Code:    constants.VariantNotFound,
				})
				return
			}

			rlog.Error(c, "failed to fetch variant", err, "variantID", variantID)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		_, err = queries.GetProductByID(ctx, productID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				rlog.Warn(c, "product not found", "productID", productID)
				c.JSON(http.StatusNotFound, types.APIResponse{
					Success: false,
					Message: "Product not found",
					Code:    constants.ProductNotFound,
				})
				return
			}

			rlog.Error(c, "failed to fetch product", err, "productID", productID)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		var offerPrice pgtype.Int4
		if req.OfferPrice != 0 {
			offerPrice = pgtype.Int4{
				Int32: int32(math.Round(req.OfferPrice * 100)),
				Valid: true,
			}
		}

		updatedVariant, err := queries.UpdateVariant(ctx, db.UpdateVariantParams{
			ID:             variant.ID,
			Images:         req.Images,
			ImagePublicIds: req.ImagePublicIDs,
			Stock:          int32(req.Stock),
			SellingPrice:   int32(math.Round((req.SellingPrice * 100))),
			OfferPrice:     offerPrice,
			IsDefault:      *req.IsDefault,
			IsActive:       *req.IsActive,
		})

		if err != nil {
			rlog.Error(c, "failed to update variant", err, "variantID", variantIDFromParams)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to update variant",
				Code:    constants.InternalServerError,
			})
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Variant updated",
			Data:    updatedVariant,
		})
	}
}
