package user

import (
	"errors"
	"net/http"
	"slices"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/httpx"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"golang.org/x/sync/errgroup"
)

// MaxPriceFilter bounds price_min/price_max (in cents); it matches the
// largest variant price.
const MaxPriceFilter = 100_000_000

// SortOptions are the accepted values of the sort query parameter.
var SortOptions = []string{"newest", "price_asc", "price_desc"}

// ListProductByCategory lists the visible products of one category with
// optional price filters (default-variant price, in cents) and sorting.
func ListProductByCategory(queries repository.ProductRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		const pageLimit int64 = 40

		slug := c.Param("slug")

		page, ok := httpx.ParsePage(c)
		if !ok {
			return
		}

		sort := c.DefaultQuery("sort", "newest")
		if !slices.Contains(SortOptions, sort) {
			httpx.Fail(c, http.StatusBadRequest, constants.InvalidQueryParam,
				"sort must be one of: newest, price_asc, price_desc")
			return
		}

		priceMin, okMin := parsePrice(c.Query("price_min"))
		priceMax, okMax := parsePrice(c.Query("price_max"))
		if !okMin || !okMax || (priceMin > 0 && priceMax > 0 && priceMin > priceMax) {
			httpx.Fail(c, http.StatusBadRequest, constants.InvalidPriceFilter, "Invalid price filter")
			return
		}

		if _, err := queries.GetCategoryBySlug(ctx, slug); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				httpx.Fail(c, http.StatusNotFound, constants.CategoryNotFound, "Category not found")
				return
			}
			httpx.Internal(c, "failed to fetch category", err, "slug", slug)
			return
		}

		total, err := queries.CountProductsByCategory(ctx, db.CountProductsByCategoryParams{
			Slug:     slug,
			PriceMin: priceMin,
			PriceMax: priceMax,
		})
		if err != nil {
			httpx.Internal(c, "failed to count category products", err, "slug", slug)
			return
		}

		if !httpx.CheckPageInRange(c, page, total, pageLimit) {
			return
		}

		g, gctx := errgroup.WithContext(ctx)

		var (
			products      []db.ListProductsByCategoryRow
			filterOptions []db.GetCategoryFilterOptionsRow
			priceRange    db.GetMinMaxSellingPriceRow
		)

		// each goroutine owns its err; errgroup returns the first failure
		g.Go(func() error {
			var err error
			products, err = queries.ListProductsByCategory(gctx, db.ListProductsByCategoryParams{
				Slug:       slug,
				PriceMin:   priceMin,
				PriceMax:   priceMax,
				Sort:       sort,
				PageLimit:  int32(pageLimit),
				PageOffset: httpx.Offset(page, pageLimit),
			})
			return err
		})

		g.Go(func() error {
			var err error
			filterOptions, err = queries.GetCategoryFilterOptions(gctx, slug)
			return err
		})

		g.Go(func() error {
			var err error
			priceRange, err = queries.GetMinMaxSellingPrice(gctx, slug)
			return err
		})

		if err := g.Wait(); err != nil {
			httpx.Internal(c, "failed to list category products", err, "slug", slug)
			return
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Products fetched",
			Data: types.ListProductsByCategoryResponse{
				Products:      products,
				FilterOptions: filterOptions,
				PriceRange:    priceRange,
			},
			Meta: types.NewPaginationMeta(total, page, pageLimit),
		})
	}
}

// parsePrice reads an optional price filter in cents; "" means no bound (0).
func parsePrice(raw string) (int32, bool) {
	if raw == "" {
		return 0, true
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 0 || n > MaxPriceFilter {
		return 0, false
	}
	return int32(n), true
}
