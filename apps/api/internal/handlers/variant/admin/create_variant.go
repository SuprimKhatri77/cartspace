package admin

import (
	"errors"
	"net/http"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/httpx"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

func CreateProductVariant(queries repository.VariantRepository, pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		productID, ok := httpx.PathUUID(c, "productID", constants.InvalidProductID, "product ID")
		if !ok {
			return
		}

		req, ok := validator.BindJSON[types.CreateProductVariant](c)
		if !ok {
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
			httpx.Internal(c, "failed to begin transaction", err)
			return
		}
		defer func() { _ = tx.Rollback(ctx) }()

		qtx := queries.WithTx(tx)

		product, err := qtx.GetProductByID(ctx, productID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				httpx.Fail(c, http.StatusNotFound, constants.ProductNotFound, "Product not found")
				return
			}
			httpx.Internal(c, "failed to fetch product", err, "product_id", productID)
			return
		}

		var variantOptions []string
		for _, prop := range req.Properties {
			variantOptions = append(variantOptions, prop.Value)
		}

		sku := utils.GenerateSKU(product.Name, variantOptions)

		// The SKU's random part makes a collision practically impossible; a
		// unique violation aborts the transaction, so it is not retried here.
		variant, err := qtx.CreateProductVariant(ctx, db.CreateProductVariantParams{
			ProductID:            productID,
			Sku:                  pgtype.Text{String: sku, Valid: true},
			Stock:                int32(*req.Stock),
			Images:               req.Images,
			ImagePublicIds:       req.ImagePublicIDs,
			SellingPrice:         int32(req.SellingPrice),
			OfferPrice:           toOfferPrice(req.OfferPrice),
			OptionCombinationKey: combinationKey,
			IsDefault:            *req.IsDefault,
			IsActive:             *req.IsActive,
		})
		if err != nil {
			writeVariantError(c, err, "failed to create variant")
			return
		}

		existingOptions, err := qtx.FetchExistingProductOptions(ctx, db.FetchExistingProductOptionsParams{
			ProductID: productID,
			Column2:   names,
		})
		if err != nil {
			httpx.Internal(c, "failed to fetch product options", err)
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
				httpx.Internal(c, "failed to fetch product option values", err)
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
					httpx.Internal(c, "failed to create product option", err, "name", prop.Name)
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
					httpx.Internal(c, "failed to create option value", err, "value", prop.Value)
					return
				}
			}

			err = qtx.CreateVariantOptionValue(ctx, db.CreateVariantOptionValueParams{
				VariantID:     variant.ID,
				OptionValueID: value.ID,
			})

			if err != nil {
				httpx.Internal(c, "failed to create variant option value", err, "variantID", variant.ID, "optionValueID", value.ID)
				return
			}
		}

		if err := tx.Commit(ctx); err != nil {
			httpx.Internal(c, "transaction commit failed", err, "variantID", variant.ID)
			return
		}

		c.JSON(http.StatusCreated, types.APIResponse{
			Success: true,
			Message: "Variant created",
			Data:    variant,
		})
	}
}
