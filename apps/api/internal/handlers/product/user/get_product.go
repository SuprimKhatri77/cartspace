package user

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/rlog"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"golang.org/x/sync/errgroup"
)

func GetProduct(queries repository.ProductRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		productSlug := c.Param("productSlug")

		if productSlug == "" {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Missing product slug",
				Code:    constants.MissingProductSlug,
			})
			return
		}

		g, ctx := errgroup.WithContext(ctx)

		var productDetail db.GetProductWithDefaultVariantBySlugRow
		var variants []db.GetVariantsByProductSlugRow
		var related []db.GetRelatedProductsRow

		// each goroutine owns its err; errgroup returns the first failure
		g.Go(func() error {
			var err error
			productDetail, err = queries.GetProductWithDefaultVariantBySlug(ctx, productSlug)
			return err
		})

		g.Go(func() error {
			var err error
			variants, err = queries.GetVariantsByProductSlug(ctx, productSlug)
			return err
		})

		g.Go(func() error {
			var err error
			related, err = queries.GetRelatedProducts(ctx, productSlug)
			return err
		})

		if err := g.Wait(); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				rlog.Warn(c, "product not found", "slug", productSlug)
				c.JSON(http.StatusNotFound, types.APIResponse{
					Success: false,
					Message: "Product not found",
					Code:    constants.ProductNotFound,
				})
				return
			}
			rlog.Error(c, "failed to fetch product", err, "slug", productSlug)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Data: types.GetProductDetailResponse{
				ProductDetail:   productDetail,
				Variants:        variants,
				RelatedProducts: related,
			},
		})
	}
}
