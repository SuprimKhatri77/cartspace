package admin

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

func CreateProduct(queries repository.ProductRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		var createProductRequest types.CreateProduct
		if err := c.ShouldBindJSON(&createProductRequest); err != nil {
			slog.Error("Invalid request body", "error", err)
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid data",
				Errors:  validator.Parse(err, createProductRequest),
			})
			return
		}

		utils.TrimStruct(&createProductRequest)

		slug := utils.Slugify(createProductRequest.Name)

		slugExists, err := queries.ProductSlugExists(ctx, slug)

		if err != nil {
			slog.Error("failed to check existing prod slug in db", "error", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
			})
			return
		}

		if slugExists {
			slug, err = utils.SlugWithSuffix(slug)
			if err != nil {
				slog.Debug("failed to slugify the slug", "error", err)
				c.JSON(http.StatusInternalServerError, types.APIResponse{
					Success: false,
					Message: "Failed to generate slug",
				})
				return
			}
		}

		categoryID, err := utils.ConvertToUUID(createProductRequest.CategoryID)
		if err != nil {
			slog.Error("failed to parse the category ID", "error", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to parse the category ID",
			})
			return
		}

		description := pgtype.Text{String: createProductRequest.Description, Valid: true}

		product, err := queries.CreateProduct(ctx, db.CreateProductParams{
			Name:           createProductRequest.Name,
			Features:       createProductRequest.Features,
			Images:         createProductRequest.Images,
			ImagePublicIds: createProductRequest.ImagePublicIDs,
			IsActive:       *createProductRequest.IsActive,
			IsFeatured:     *createProductRequest.IsFeatured,
			Slug:           slug,
			CategoryID:     categoryID,
			Description:    description,
		})

		if err != nil {
			slog.Error("failed to insert product in db", "error", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to create product",
			})
			return
		}

		c.JSON(http.StatusCreated, types.APIResponse{
			Success: true,
			Message: "Product created",
			Data:    product,
		})
	}
}
