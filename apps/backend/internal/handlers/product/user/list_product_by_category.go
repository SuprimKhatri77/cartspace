package user

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"golang.org/x/sync/errgroup"
)

func ListProductByCategory(queries repository.ProductRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		const PAGE_LIMIT = 40

		slug := c.Param("slug")
		if slug == "" {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Missing category slug",
				Code:    constants.MissingCategorySlug,
			})
			return
		}

		pageStr := c.DefaultQuery("page", "1")
		sort := c.DefaultQuery("sort", "newest")
		priceMinStr := c.DefaultQuery("price_min", "0")
		priceMaxStr := c.DefaultQuery("price_max", "0")

		page, err := strconv.Atoi(pageStr)
		if err != nil || page <= 0 {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid page parameter",
				Code:    constants.InvalidPageParam,
			})
			return
		}

		priceMin, err := strconv.Atoi(priceMinStr)
		if err != nil || priceMin < 0 {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid page parameter",
				Code:    constants.InvalidPageParam,
			})
			return
		}

		priceMax, err := strconv.Atoi(priceMaxStr)
		if err != nil || priceMax < 0 {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid page parameter",
				Code:    constants.InvalidPageParam,
			})
			return
		}

		total, err := queries.GetProductsCount(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to fetch products",
				Code:    constants.InternalServerError,
			})
			return
		}

		if total == 0 {
			c.JSON(http.StatusOK, types.APIResponse{
				Success: true,
				Data:    []db.Product{},
			})
			return
		}

		totalPages := (total + PAGE_LIMIT - 1) / PAGE_LIMIT
		if page > int(totalPages) {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid page parameter",
				Code:    constants.InvalidPageParam,
			})
			return
		}

		offset := PAGE_LIMIT * (page - 1)

		slog.Debug("query params",
			"slug", slug,
			"priceMin", priceMin,
			"priceMax", priceMax,
			"offset", offset,
			"limit", PAGE_LIMIT,
		)

		g, ctx := errgroup.WithContext(ctx)

		var filterOptions []db.GetCategoryFilterOptionsRow
		var products []db.ListProductsByCategoryRow
		var priceRange db.GetMinMaxSellingPriceRow

		g.Go(func() error {
			switch sort {
			case "price_asc":
				rows, err2 := queries.ListProductsByCategoryPriceAsc(ctx, db.ListProductsByCategoryPriceAscParams{
					Slug:    slug,
					Limit:   PAGE_LIMIT,
					Offset:  int32(offset),
					Column2: int32(priceMin * 100),
					Column3: int32(priceMax * 100),
				})
				err = err2

				for _, r := range rows {
					products = append(products, db.ListProductsByCategoryRow{
						ID:           r.ID,
						Name:         r.Name,
						Slug:         r.Slug,
						SellingPrice: r.SellingPrice,
						OfferPrice:   r.OfferPrice,
						Images:       r.Images,
						IsActive:     r.IsActive,
						IsFeatured:   r.IsFeatured,
					})
				}
			case "price_desc":
				rows, err2 := queries.ListProductsByCategoryPriceDesc(ctx, db.ListProductsByCategoryPriceDescParams{
					Slug:    slug,
					Limit:   PAGE_LIMIT,
					Offset:  int32(offset),
					Column2: int32(priceMin * 100),
					Column3: int32(priceMax * 100),
				})
				err = err2
				for _, r := range rows {
					products = append(products, db.ListProductsByCategoryRow{
						ID:           r.ID,
						Name:         r.Name,
						Slug:         r.Slug,
						SellingPrice: r.SellingPrice,
						OfferPrice:   r.OfferPrice,
						Images:       r.Images,
						IsActive:     r.IsActive,
						IsFeatured:   r.IsFeatured,
					})
				}
			default:
				slog.Debug("i am being triggered")
				products, err = queries.ListProductsByCategory(ctx, db.ListProductsByCategoryParams{
					Slug:    slug,
					Limit:   PAGE_LIMIT,
					Offset:  int32(offset),
					Column2: int32(priceMin * 100),
					Column3: int32(priceMax * 100),
				})
			}
			return err
		})

		g.Go(func() error {
			filterOptions, err = queries.GetCategoryFilterOptions(ctx, slug)
			return err
		})

		g.Go(func() error {
			priceRange, err = queries.GetMinMaxSellingPrice(ctx, slug)
			return err
		})

		if err := g.Wait(); err != nil {
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		if products == nil {
			products = []db.ListProductsByCategoryRow{}
		}

		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Data: types.ListProductsByCategoryResponse{
				Products:      products,
				FilterOptions: filterOptions,
				PriceRange:    priceRange,
			},
		})

	}
}
