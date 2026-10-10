package admin

import (
	"errors"
	"math"
	"net/http"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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

func CreateProductVariant(queries repository.VariantRepository, pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		productIDFromParams := c.Param("productID")

		if productIDFromParams == "" {
			rlog.Warn(c, "missing product ID")
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Missing product ID",
				Code:    constants.MissingProductID,
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

		req, ok := validator.BindJSON[types.CreateProductVariant](c)
		if !ok {
			return
		}

		if req.OfferPrice >= req.SellingPrice {
			rlog.Warn(c, "invalid offer price", "offerPrice", req.OfferPrice, "sellingPrice", req.SellingPrice)

			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Offer price must be less than selling price",
				Code:    constants.ValidationFailed,
			})
			return
		}

		if len(req.ImagePublicIDs) != len(req.Images) {
			rlog.Warn(c, "image mismatch", "imagesCount", len(req.Images), "imagePublicIDsCount", len(req.ImagePublicIDs))

			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Images and image IDs must match",
				Code:    constants.ValidationFailed,
			})
			return
		}

		props := make([]string, len(req.Properties))
		names := make([]string, len(req.Properties))
		values := make([]string, len(req.Properties))

		for i, prop := range req.Properties {
			props[i] = prop.Name + "=" + prop.Value
			names[i] = prop.Name
			values[i] = prop.Value

		}
		sort.Strings(props)
		combinationKey := strings.Join(props, "|")

		tx, err := pool.Begin(ctx)
		if err != nil {
			rlog.Error(c, "failed to begin transaction", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}
		defer func() { _ = tx.Rollback(ctx) }()

		qtx := queries.WithTx(tx)

		product, err := qtx.GetProductByID(ctx, productID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				rlog.Warn(c, "product not found", "productID", productID)
				c.JSON(http.StatusBadRequest, types.APIResponse{
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

		var variantOptions []string
		for _, prop := range req.Properties {
			variantOptions = append(variantOptions, prop.Value)
		}

		sku := utils.GenerateSKU(product.Name, variantOptions)

		var offerPrice pgtype.Int4
		if req.OfferPrice != 0 {
			offerPrice = pgtype.Int4{
				Int32: int32(math.Round(req.OfferPrice * 100)),
				Valid: true,
			}
		}

		variant, err := qtx.CreateProductVariant(ctx, db.CreateProductVariantParams{
			ProductID:            productID,
			Sku:                  pgtype.Text{String: sku, Valid: true},
			Stock:                int32(req.Stock),
			Images:               req.Images,
			ImagePublicIds:       req.ImagePublicIDs,
			SellingPrice:         int32(math.Round(req.SellingPrice * 100)),
			OfferPrice:           offerPrice,
			OptionCombinationKey: combinationKey,
			IsDefault:            *req.IsDefault,
			IsActive:             *req.IsActive,
		})

		if err != nil {
			var pgError *pgconn.PgError

			if errors.As(err, &pgError) && pgError.Code == "23505" {

				if pgError.ConstraintName == "uq_variant_combination" {

					c.JSON(http.StatusConflict, types.APIResponse{
						Success: false,
						Message: "Variant with this combination already exists",
						Code:    constants.VariantAlreadyExists,
					})
					return

				}

				if pgError.ConstraintName == "product_variants_sku_key" {

					rlog.Warn(c, "SKU conflict, regenerating", "sku", sku)

					sku = utils.GenerateSKU(product.Name, variantOptions)

					variant, err = qtx.CreateProductVariant(ctx, db.CreateProductVariantParams{
						ProductID:            productID,
						Sku:                  pgtype.Text{String: sku, Valid: true},
						Stock:                int32(req.Stock),
						Images:               req.Images,
						ImagePublicIds:       req.ImagePublicIDs,
						SellingPrice:         int32(math.Round(req.SellingPrice * 100)),
						OfferPrice:           offerPrice,
						OptionCombinationKey: combinationKey,
						IsDefault:            *req.IsDefault,
						IsActive:             *req.IsActive,
					})

					if err != nil {
						var retryPgError *pgconn.PgError
						if errors.As(err, &retryPgError) && retryPgError.Code == "23505" &&
							retryPgError.ConstraintName == "uq_variant_combination" {
							rlog.Warn(c, "variant combination already exists")
							c.JSON(http.StatusConflict, types.APIResponse{
								Success: false,
								Message: "Variant with this combination already exists",
								Code:    constants.VariantAlreadyExists,
							})
							return
						}

						rlog.Error(c, "failed to create variant after SKU retry", err)
						c.JSON(http.StatusInternalServerError, types.APIResponse{
							Success: false,
							Message: "Failed to create variant",
							Code:    constants.InternalServerError,
						})
						return
					}
				}

			} else {
				rlog.Error(c, "failed to create variant", err)
				c.JSON(http.StatusInternalServerError, types.APIResponse{
					Success: false,
					Message: "Failed to create variant",
					Code:    constants.InternalServerError,
				})
				return
			}
		}

		existingOptions, err := qtx.FetchExistingProductOptions(ctx, db.FetchExistingProductOptionsParams{
			ProductID: productID,
			Column2:   names,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		optionIDs := make([]pgtype.UUID, len(existingOptions))

		for i, v := range existingOptions {
			optionIDs[i] = v.ID
		}
		var existingValues []db.ProductOptionValue

		if len(optionIDs) > 0 {

			existingValues, err = qtx.FetchExistingProductOptionValues(ctx, db.FetchExistingProductOptionValuesParams{
				Column1: optionIDs,
				Column2: values,
			})
			if err != nil {
				c.JSON(http.StatusInternalServerError, types.APIResponse{
					Success: false,
					Message: "Failed to process request",
					Code:    constants.InternalServerError,
				})
				return
			}
		}

		optionsByName := map[string]db.ProductOption{}
		for _, o := range existingOptions {
			optionsByName[o.Name] = o
		}

		optionValuesByKey := map[string]db.ProductOptionValue{}
		for _, o := range existingValues {
			key := uuid.UUID(o.OptionID.Bytes).String() + ":" + o.Value
			optionValuesByKey[key] = o
		}

		for _, prop := range req.Properties {
			option, exists := optionsByName[prop.Name]
			if !exists {
				option, err = qtx.CreateProductOption(ctx, db.CreateProductOptionParams{
					ProductID: product.ID,
					Name:      prop.Name,
				})

				if err != nil {
					rlog.Error(c, "failed to create product option", err, "name", prop.Name)
					c.JSON(http.StatusInternalServerError, types.APIResponse{
						Success: false,
						Message: "Failed to create variant",
						Code:    constants.InternalServerError,
					})
					return
				}
			}

			key := uuid.UUID(option.ID.Bytes).String() + ":" + prop.Value
			value, exists := optionValuesByKey[key]
			if !exists {
				value, err = qtx.CreateProductOptionValue(ctx, db.CreateProductOptionValueParams{
					OptionID: option.ID,
					Value:    prop.Value,
				})

				if err != nil {
					rlog.Error(c, "failed to create option value", err, "value", prop.Value)
					c.JSON(http.StatusInternalServerError, types.APIResponse{
						Success: false,
						Message: "Failed to create variant",
						Code:    constants.InternalServerError,
					})
					return
				}
			}

			err = qtx.CreateVariantOptionValue(ctx, db.CreateVariantOptionValueParams{
				VariantID:     variant.ID,
				OptionValueID: value.ID,
			})

			if err != nil {
				rlog.Error(c, "failed to create variant option value", err, "variantID", variant.ID, "optionValueID", value.ID)

				c.JSON(http.StatusInternalServerError, types.APIResponse{
					Success: false,
					Message: "Failed to create variant",
					Code:    constants.InternalServerError,
				})
				return
			}
		}

		if err := tx.Commit(ctx); err != nil {
			rlog.Error(c, "transaction commit failed", err, "variantID", variant.ID)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to create variant",
				Code:    constants.InternalServerError,
			})
			return
		}

		c.JSON(http.StatusCreated, types.APIResponse{
			Success: true,
			Message: "Variant created",
			Data:    variant,
		})
	}
}
