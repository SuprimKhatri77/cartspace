package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/rlog"
	"github.com/suprimkhatri77/cartspace/backend/internal/repository"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

func CreateProduct(queries repository.ProductRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		createProductRequest, ok := validator.BindJSON[types.CreateProduct](c)
		if !ok {
			return
		}

		if createProductRequest.IsActive == nil || createProductRequest.IsFeatured == nil {
			c.JSON(http.StatusBadRequest, types.APIResponse{
				Success: false,
				Message: "Invalid request data",
				Code:    constants.ValidationFailed,
			})
			return
		}

		utils.TrimStruct(createProductRequest)

		slug := utils.Slugify(createProductRequest.Name)

		slugExists, err := queries.ProductSlugExists(ctx, slug)

		if err != nil {
			rlog.Error(c, "failed to check existing prod slug in db", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to process request",
				Code:    constants.InternalServerError,
			})
			return
		}

		if slugExists {
			slug, err = utils.SlugWithSuffix(slug)
			if err != nil {
				rlog.Error(c, "failed to generate slug suffix", err)
				c.JSON(http.StatusInternalServerError, types.APIResponse{
					Success: false,
					Message: "Failed to generate slug",
					Code:    constants.InternalServerError,
				})
				return
			}
		}

		categoryID, err := utils.ConvertToUUID(createProductRequest.CategoryID)
		if err != nil {
			rlog.Error(c, "failed to parse the category ID", err)
			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to parse the category ID",
				Code:    constants.InternalServerError,
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
			rlog.Error(c, "failed to insert product in db", err)

			c.JSON(http.StatusInternalServerError, types.APIResponse{
				Success: false,
				Message: "Failed to create product",
				Code:    constants.InternalServerError,
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
