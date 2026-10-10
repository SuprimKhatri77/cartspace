package user

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/rlog"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"golang.org/x/sync/errgroup"
)

func ListProductByCategory(queries repository.ProductRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		const pageLimit = 40

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

		if _, err := queries.GetCategoryBySlug(ctx, slug); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				c.JSON(http.StatusNotFound, types.APIResponse{
					Success: false,
					Message: "Category not found",
					Code:    constants.CategoryNotFound,
				})
				return
			}
			rlog.Error(c, "failed to fetch category", err, "slug", slug)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		total, err := queries.CountProductsByCategory(ctx, db.CountProductsByCategoryParams{
			Slug:    slug,
			Column2: int32(priceMin * 100),
			Column3: int32(priceMax * 100),
		})
		if err != nil {
			rlog.Error(c, "failed to count products", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to fetch products",
				Code:    constants.InternalServerError,
			})
			return
		}

		// an empty result still returns page 1 with filter options and price range
		totalPages := (total + pageLimit - 1) / pageLimit
		if total > 0 && page > int(totalPages) {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid page parameter",
				Code:    constants.InvalidPageParam,
			})
			return
		}

		offset := pageLimit * (page - 1)

		g, ctx := errgroup.WithContext(ctx)

		var filterOptions []db.GetCategoryFilterOptionsRow
		var products []db.ListProductsByCategoryRow
		var priceRange db.GetMinMaxSellingPriceRow

		g.Go(func() error {
			switch sort {
			case "price_asc":
				rows, err := queries.ListProductsByCategoryPriceAsc(ctx, db.ListProductsByCategoryPriceAscParams{
					Slug:    slug,
					Limit:   pageLimit,
					Offset:  int32(offset),
					Column2: int32(priceMin * 100),
					Column3: int32(priceMax * 100),
				})
				if err != nil {
					return err
				}
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
				rows, err := queries.ListProductsByCategoryPriceDesc(ctx, db.ListProductsByCategoryPriceDescParams{
					Slug:    slug,
					Limit:   pageLimit,
					Offset:  int32(offset),
					Column2: int32(priceMin * 100),
					Column3: int32(priceMax * 100),
				})
				if err != nil {
					return err
				}
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
				var err error
				products, err = queries.ListProductsByCategory(ctx, db.ListProductsByCategoryParams{
					Slug:    slug,
					Limit:   pageLimit,
					Offset:  int32(offset),
					Column2: int32(priceMin * 100),
					Column3: int32(priceMax * 100),
				})
				if err != nil {
					return err
				}
			}
			return nil
		})

		g.Go(func() error {
			var err error
			filterOptions, err = queries.GetCategoryFilterOptions(ctx, slug)
			return err
		})

		g.Go(func() error {
			var err error
			priceRange, err = queries.GetMinMaxSellingPrice(ctx, slug)
			return err
		})

		if err := g.Wait(); err != nil {
			rlog.Error(c, "failed to list category products", err, "slug", slug)
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
			Meta: types.NewPaginationMeta(total, page, pageLimit),
		})

	}
}
