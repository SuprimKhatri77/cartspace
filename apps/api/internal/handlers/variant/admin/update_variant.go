package admin

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
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
			slog.Error("missing product ID")
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Missing product ID",
				Code:    constants.MissingProductID,
			})
			return
		}

		if variantIDFromParams == "" {
			slog.Error("missing variant ID")
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Missing variant ID",
				Code:    constants.MissingVariantID,
			})
			return
		}

		productID, err := utils.ConvertToUUID(productIDFromParams)
		if err != nil {
			slog.Error("invalid product ID", "productID", productIDFromParams, "error", err)
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid product ID",
				Code:    constants.ValidationFailed,
			})
			return
		}

		variantID, err := utils.ConvertToUUID(variantIDFromParams)
		if err != nil {
			slog.Error("invalid variant ID", "variantID", variantIDFromParams, "error", err)
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid variant ID",
				Code:    constants.ValidationFailed,
			})
			return
		}

		var req types.UpdateProductVariant

		if err := c.ShouldBindJSON(&req); err != nil {
			slog.Error("invalid request body", "error", err)

			var unmarshalErr *json.UnmarshalTypeError
			if errors.As(err, &unmarshalErr) {
				c.JSON(http.StatusBadRequest, types.APIResponse{
					Success: false,
					Message: "Invalid request data",
					Code:    constants.ValidationFailed,
					Errors: []types.AppError{
						{
							Code:    "INVALID_TYPE",
							Field:   unmarshalErr.Field,
							Message: fmt.Sprintf("%s must be a %s", unmarshalErr.Field, unmarshalErr.Type),
						},
					},
				})
				return
			}

			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid request data",
				Code:    constants.ValidationFailed,
				Errors:  validator.Parse(err, req),
			})
			return
		}

		if req.OfferPrice != 0 &&
			req.OfferPrice >= req.SellingPrice {

			slog.Error("invalid offer price",
				"offerPrice", req.OfferPrice,
				"sellingPrice", req.SellingPrice,
			)

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
			slog.Error("image mismatch",
				"imagesCount", len(req.Images),
				"imagePublicIDsCount", len(req.ImagePublicIDs),
			)

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

		utils.TrimStruct(&req)

		variant, err := queries.GetVariantByID(ctx, variantID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				slog.Error("variant not found", "variantID", variantID)
				c.JSON(http.StatusNotFound, types.APIResponse{
					Success: false,
					Message: "Variant not found",
					Code:    constants.VariantNotFound,
				})
				return
			}

			slog.Error("failed to fetch variant", "variantID", variantID, "error", err)
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
				slog.Error("product not found", "productID", productID)
				c.JSON(http.StatusNotFound, types.APIResponse{
					Success: false,
					Message: "Product not found",
					Code:    constants.ProductNotFound,
				})
				return
			}

			slog.Error("failed to fetch product", "productID", productID, "error", err)
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
			slog.Error("failed to update variant", "variantID", variantIDFromParams, "error", err)
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
